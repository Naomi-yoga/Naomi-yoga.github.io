import { loadBothContent, loadBothFromSite, publishBoth } from './admin/github.js';
import { CARD_TEMPLATES, TAG_VARIANTS, LINK_TYPES, newId } from './admin/schema.js';

const SESSION_KEY = 'resume-admin-session';
const DRAFT_KEY = 'resume-admin-draft';

let state = {
  zh: null,
  en: null,
  shaZh: null,
  shaEn: null,
  tab: 'profile',
  loadSource: null,
  lastLoadError: null,
};

const TABS = [
  { id: 'profile', label: '个人资料' },
  { id: 'work', label: '工作经历' },
  { id: 'projects', label: '项目' },
  { id: 'education', label: '教育' },
  { id: 'skills', label: '技能标签' },
  { id: 'cards', label: 'Bento 卡片' },
  { id: 'contact', label: '联系' },
  { id: 'meta', label: '站点 / 页脚' },
];

function $(id) {
  return document.getElementById(id);
}

function field(label, html) {
  return `<div class="mb-4"><label class="mb-1 block text-xs text-zinc-500">${label}</label>${html}</div>`;
}

function input(cls, attrs = '') {
  return `<input class="admin-input w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm ${cls}" ${attrs} />`;
}

function textarea(cls, attrs = '') {
  return `<textarea class="admin-input min-h-[80px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm ${cls}" ${attrs}></textarea>`;
}

function setStatus(msg, ok = false) {
  const el = $('save-status');
  if (el) {
    el.textContent = msg;
    el.className = ok ? 'text-xs text-emerald-400' : 'text-xs text-zinc-500';
  }
}

function saveDraftLocal() {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ zh: state.zh, en: state.en, at: Date.now() })
    );
    setStatus('已自动保存到浏览器草稿（未发布）');
  } catch (_) {}
}

function getConfig() {
  return window.ADMIN_CONFIG || {};
}

function hasConfigFile() {
  return !window.ADMIN_CONFIG_MISSING && typeof window.ADMIN_CONFIG === 'object';
}

function hasGithubToken() {
  const t = getConfig().githubToken;
  return typeof t === 'string' && t.trim().length > 0;
}

function hasAdminPassword() {
  const p = getConfig().adminPassword;
  return typeof p === 'string' && p.length > 0 && p !== 'change-me-to-a-strong-password';
}

/** 仅用于 GitHub 拉取/发布 */
function checkGithubReady() {
  if (!hasConfigFile()) {
    throw new Error(
      '未找到 admin-config.js。请复制 admin-config.example.js 为 admin-config.js（勿提交到 Git）。'
    );
  }
  if (!hasGithubToken()) {
    throw new Error('请在 admin-config.js 中填写 githubToken（PAT，需 repo 或 public_repo 权限）。');
  }
}

function isLoggedIn() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function login(password) {
  if (!hasConfigFile()) return { ok: false, reason: 'missing-config' };
  if (!hasAdminPassword()) {
    return { ok: false, reason: 'default-password' };
  }
  const expected = String(getConfig().adminPassword);
  if (password !== expected) return { ok: false, reason: 'wrong' };
  sessionStorage.setItem(SESSION_KEY, '1');
  return { ok: true };
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  $('admin-app').classList.add('hidden');
  $('login-screen').classList.remove('hidden');
}

function applyLoadedData(data) {
  state.zh = data.zh;
  state.en = data.en;
  state.shaZh = data.shaZh ?? null;
  state.shaEn = data.shaEn ?? null;
  state.loadSource = data.source || 'github';
  if (state.loadSource === 'github') state.lastLoadError = null;
  saveDraftLocal();
  renderNav();
  renderPanel();
  renderLoadBanner();
}

function renderLoadFailurePanel(githubErr, siteErr) {
  const panel = $('admin-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="rounded-2xl border border-red-500/40 bg-red-900/20 p-6 text-sm">
      <h2 class="text-lg font-semibold text-red-200">无法加载内容</h2>
      <p class="mt-3 text-xs font-medium text-zinc-400">GitHub API</p>
      <p class="mt-1 break-words text-red-100/90">${escapeHtml(githubErr?.message || '未知')}</p>
      <p class="mt-3 text-xs font-medium text-zinc-400">本站 JSON</p>
      <p class="mt-1 break-words text-red-100/90">${escapeHtml(siteErr?.message || '未知')}</p>
      <ul class="mt-4 list-inside list-disc text-xs text-zinc-500 space-y-1">
        <li>确认 <code class="text-zinc-400">admin-config.js</code> 中 owner=<strong>Naomi-yoga</strong>、repo=<strong>Naomi-yoga.github.io</strong></li>
        <li>PAT（classic）勾选 <strong>repo</strong>；Fine-grained 需该仓库 Contents 读+写</li>
        <li>本地已 <code class="text-zinc-400">git push</code> 过 <code class="text-zinc-400">content/*.json</code></li>
        <li>用 <code class="text-zinc-400">python -m http.server 8080</code> 打开本站，不要 file://</li>
      </ul>
      <div class="mt-6 flex flex-wrap gap-2">
        <button type="button" id="btn-retry-github" class="rounded-lg bg-violet-600 px-4 py-2 text-xs">重试 GitHub</button>
        <button type="button" id="btn-retry-site" class="rounded-lg border border-zinc-600 px-4 py-2 text-xs">从本站加载</button>
      </div>
    </div>`;
  $('btn-retry-github')?.addEventListener('click', () => afterLogin());
  $('btn-retry-site')?.addEventListener('click', async () => {
    try {
      await loadFromSite();
    } catch (e) {
      alert(e.message);
    }
  });
}

function renderLoadBanner() {
  const panel = $('admin-panel');
  if (!panel) return;
  const old = $('load-error-banner');
  old?.remove();

  if (state.loadSource === 'site') {
    const banner = document.createElement('div');
    banner.id = 'load-error-banner';
    banner.className =
      'mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100';
    banner.innerHTML = `
      <p class="font-medium">当前为「本站 JSON」模式</p>
      <p class="mt-1 text-xs text-amber-200/80">未从 GitHub 拉取（无 sha）。可正常编辑；要发布到线上请先点「从 GitHub 重新加载」成功后再「发布」。</p>`;
    panel.prepend(banner);
    return;
  }

  if (state.lastLoadError) {
    const banner = document.createElement('div');
    banner.id = 'load-error-banner';
    banner.className =
      'mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100';
    banner.innerHTML = `
      <p class="font-medium">GitHub 加载失败</p>
      <p class="mt-1 text-xs text-red-200/90 break-words">${escapeHtml(state.lastLoadError)}</p>
      <p class="mt-2 text-xs text-zinc-400">常见原因：Token 无效/过期、仓库名错误、未 push content、403 权限、网络无法访问 api.github.com。可点「从本站加载」继续编辑。</p>`;
    panel.prepend(banner);
  }
}

async function loadFromGitHub() {
  checkGithubReady();
  setStatus('正在从 GitHub 加载…');
  state.lastLoadError = null;
  const data = await loadBothContent();
  applyLoadedData(data);
  setStatus('已从 GitHub 加载', true);
}

async function loadFromSite() {
  setStatus('正在从本站加载 JSON…');
  state.lastLoadError = null;
  const data = await loadBothFromSite();
  applyLoadedData(data);
  setStatus('已从本站加载（发布前需先 GitHub 加载成功）', false);
}

function renderNav() {
  const nav = $('admin-nav');
  nav.innerHTML = TABS.map((t) => {
    const active = state.tab === t.id;
    return `<button type="button" data-tab="${t.id}" class="shrink-0 rounded-lg px-3 py-1.5 ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}">${t.label}</button>`;
  }).join('');
  nav.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      renderNav();
      renderPanel();
    });
  });
}

function renderPanel() {
  const panel = $('admin-panel');
  const fn = {
    profile: renderProfilePanel,
    work: () => renderListPanel('workExperience', '工作经历', workRow),
    projects: () => renderListPanel('projects', '项目', projectRow),
    education: () => renderListPanel('education', '教育', eduRow),
    skills: renderSkillsPanel,
    cards: renderCardsPanel,
    contact: renderContactPanel,
    meta: renderMetaPanel,
  }[state.tab];
  panel.innerHTML = fn ? fn() : '';
  bindPanelEvents();
}

function renderProfilePanel() {
  const zh = state.zh.profile;
  const en = state.en.profile;
  return `
    <section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 class="mb-4 text-sm font-semibold text-zinc-300">个人资料（中 / 英）</h2>
      ${field('中文姓名', input('', `data-bind="zh.profile.name" value="${esc(zh.name)}"`))}
      ${field('English name', input('', `data-bind="en.profile.name" value="${esc(en.name)}"`))}
      ${field('中文头衔 HTML', `<textarea class="admin-input min-h-[80px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" data-bind="zh.profile.titleHtml">${zh.titleHtml || ''}</textarea>`)}
      ${field('English title HTML', `<textarea class="admin-input min-h-[80px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" data-bind="en.profile.titleHtml">${en.titleHtml || ''}</textarea>`)}
      ${field('头像 URL（两语言共用）', input('', `data-bind="zh.profile.avatarUrl" value="${esc(zh.avatarUrl || '')}"`))}
      <p class="text-xs text-zinc-600">头像同时写入 en.profile.avatarUrl</p>
    </section>`;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/"/g, '&quot;');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function workRow(w, i, lang) {
  const prefix = `${lang}.workExperience.${i}`;
  return `
    <div class="mb-6 rounded-xl border border-zinc-800 p-4" data-list="workExperience" data-lang="${lang}" data-index="${i}">
      <div class="mb-2 flex justify-between">
        <span class="text-xs text-zinc-500">${lang.toUpperCase()} #${i + 1}</span>
        <button type="button" class="btn-del-row text-xs text-red-400">删除</button>
      </div>
      ${field('公司', input('', `data-bind="${prefix}.company" value="${esc(w.company)}"`))}
      ${field('职位', input('', `data-bind="${prefix}.role" value="${esc(w.role)}"`))}
      ${field('时间', input('', `data-bind="${prefix}.period" value="${esc(w.period)}"`))}
      ${field('描述 HTML', `<textarea class="admin-input min-h-[100px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" data-bind="${prefix}.bodyHtml">${w.bodyHtml || ''}</textarea>`)}
    </div>`;
}

function projectRow(p, i, lang) {
  const prefix = `${lang}.projects.${i}`;
  return `
    <div class="mb-6 rounded-xl border border-zinc-800 p-4" data-list="projects" data-lang="${lang}" data-index="${i}">
      <div class="mb-2 flex justify-between">
        <span class="text-xs text-zinc-500">${lang.toUpperCase()} #${i + 1}</span>
        <button type="button" class="btn-del-row text-xs text-red-400">删除</button>
      </div>
      ${field('名称', input('', `data-bind="${prefix}.name" value="${esc(p.name)}"`))}
      ${field('技术栈', input('', `data-bind="${prefix}.tech" value="${esc(p.tech || '')}"`))}
      ${field('链接', input('', `data-bind="${prefix}.href" value="${esc(p.href || '')}"`))}
      ${field('简介', `<textarea class="admin-input min-h-[60px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" data-bind="${prefix}.description">${p.description || ''}</textarea>`)}
    </div>`;
}

function eduRow(e, i, lang) {
  const prefix = `${lang}.education.${i}`;
  return `
    <div class="mb-6 rounded-xl border border-zinc-800 p-4" data-list="education" data-lang="${lang}" data-index="${i}">
      <div class="mb-2 flex justify-between">
        <span class="text-xs text-zinc-500">${lang.toUpperCase()} #${i + 1}</span>
        <button type="button" class="btn-del-row text-xs text-red-400">删除</button>
      </div>
      ${field('学校', input('', `data-bind="${prefix}.school" value="${esc(e.school)}"`))}
      ${field('学位/专业', input('', `data-bind="${prefix}.degree" value="${esc(e.degree)}"`))}
      ${field('时间', input('', `data-bind="${prefix}.period" value="${esc(e.period)}"`))}
    </div>`;
}

function renderListPanel(key, title, rowFn) {
  const zhList = state.zh[key] || [];
  const enList = state.en[key] || [];
  const max = Math.max(zhList.length, enList.length);
  let rows = '';
  for (let i = 0; i < max; i++) {
    rows += rowFn(zhList[i] || { id: newId(key.slice(0, 4)) }, i, 'zh');
    rows += rowFn(enList[i] || { id: zhList[i]?.id || newId(key.slice(0, 4)) }, i, 'en');
    rows += '<hr class="my-6 border-zinc-800" />';
  }
  return `
    <section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold">${title}</h2>
        <button type="button" class="btn-add-list rounded-lg bg-zinc-800 px-3 py-1 text-xs" data-list-key="${key}">+ 新增一条（中英各一）</button>
      </div>
      <p class="mb-4 text-xs text-zinc-500">每条经历请分别填写中文与英文块；id 在新增时自动生成，删除会移除对应索引。</p>
      ${rows || '<p class="text-sm text-zinc-600">暂无数据，点击新增。</p>'}
    </section>`;
}

function renderSkillsPanel() {
  const zhCards = (state.zh.cards || []).map((c, i) => ({ c, i })).filter((x) => x.c.template === 'skills');
  if (!zhCards.length) {
    return `<section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><p class="text-sm text-zinc-500">当前没有 skills 类型卡片，请在「Bento 卡片」中添加模板为「技能标签」的卡片。</p></section>`;
  }
  let html = '<section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><h2 class="mb-4 text-sm font-semibold">技能标签（按卡片）</h2>';
  for (const { c, i } of zhCards) {
    const enCard = state.en.cards[i] || { tags: [] };
    const zhTags = c.tags || [];
    const enTags = enCard.tags || [];
    const tagRows = (zhTags.length ? zhTags : [{ label: '', variant: 'zinc' }])
      .map((t, ti) => {
        const enT = enTags[ti] || t;
        const vars = TAG_VARIANTS.map(
          (v) => `<option value="${v}" ${(t.variant || 'zinc') === v ? 'selected' : ''}>${v}</option>`
        ).join('');
        return `
        <div class="mb-2 flex flex-wrap gap-2 items-end" data-skill-card="${i}" data-tag-index="${ti}">
          <div class="flex-1 min-w-[120px]">
            <span class="text-xs text-zinc-600">中文</span>
            <input class="admin-input w-full" data-bind="zh.cards.${i}.tags.${ti}.label" value="${esc(t.label)}" />
          </div>
          <div class="flex-1 min-w-[120px]">
            <span class="text-xs text-zinc-600">EN</span>
            <input class="admin-input w-full" data-bind="en.cards.${i}.tags.${ti}.label" value="${esc(enT.label)}" />
          </div>
          <select class="admin-input w-28" data-bind="zh.cards.${i}.tags.${ti}.variant">${vars}</select>
          <button type="button" class="btn-del-tag text-xs text-red-400" data-card-i="${i}" data-tag-i="${ti}">删</button>
        </div>`;
      })
      .join('');
    html += `
      <div class="mb-6 rounded-xl border border-zinc-800 p-4">
        <p class="text-xs text-zinc-500 mb-2">卡片 #${i + 1} · ${esc(c.title || c.id)}</p>
        ${field('hint (zh)', input('', `data-bind="zh.cards.${i}.hint" value="${esc(c.hint || '')}"`))}
        ${tagRows}
        <button type="button" class="btn-add-tag mt-2 text-xs text-cyan-400" data-card-i="${i}">+ 标签</button>
      </div>`;
  }
  html += '</section>';
  return html;
}

function renderCardsPanel() {
  const cards = state.zh.cards || [];
  const rows = cards
    .map((c, i) => {
      const enCard = state.en.cards[i] || {};
      const tplOpts = CARD_TEMPLATES.map(
        (t) => `<option value="${t.value}" ${c.template === t.value ? 'selected' : ''}>${t.label}</option>`
      ).join('');
      return `
      <div class="mb-4 rounded-xl border border-zinc-800 p-4" data-card-index="${i}">
        <div class="flex flex-wrap gap-2 justify-between mb-2">
          <span class="text-xs text-zinc-500">#${i + 1} id: ${esc(c.id)}</span>
          <button type="button" class="btn-del-card text-xs text-red-400" data-index="${i}">删除卡片</button>
        </div>
        ${field('模板', `<select class="admin-input" data-bind="zh.cards.${i}.template">${tplOpts}</select>`)}
        ${field('中文标题', input('', `data-bind="zh.cards.${i}.title" value="${esc(c.title || '')}"`))}
        ${field('English title', input('', `data-bind="en.cards.${i}.title" value="${esc(enCard.title || '')}"`))}
        ${field('gridClass', input('', `data-bind="zh.cards.${i}.gridClass" value="${esc(c.gridClass || '')}"`))}
        ${field('delay', input('', `data-bind="zh.cards.${i}.delay" value="${esc(c.delay || '0.1s')}"`))}
        ${c.template === 'text' ? field('中文 bodyHtml', `<textarea class="admin-input min-h-[80px] w-full" data-bind="zh.cards.${i}.bodyHtml">${c.bodyHtml || ''}</textarea>`) : ''}
        ${c.template === 'text' ? field('EN bodyHtml', `<textarea class="admin-input min-h-[80px] w-full" data-bind="en.cards.${i}.bodyHtml">${enCard.bodyHtml || ''}</textarea>`) : ''}
        ${c.template === 'skills' ? `<p class="text-xs text-zinc-500 mb-2">技能标签请在「技能标签」Tab 编辑。</p>` : ''}
        ${['projects', 'education'].includes(c.template) ? field('enabled', `<label class="text-sm"><input type="checkbox" data-bind="zh.cards.${i}.enabled" ${c.enabled !== false ? 'checked' : ''} /> 显示此模块</label>`) : ''}
      </div>`;
    })
    .join('');

  return `
    <section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div class="mb-4 flex justify-between">
        <h2 class="text-sm font-semibold">Bento 卡片顺序与配置</h2>
        <button type="button" id="btn-add-card" class="rounded-lg bg-zinc-800 px-3 py-1 text-xs">+ 添加卡片</button>
      </div>
      <p class="mb-4 text-xs text-zinc-500">work / projects / education 类型卡片仅配置标题与布局，列表内容在对应 Tab 编辑。</p>
      ${rows}
    </section>`;
}

function renderContactPanel() {
  const zh = state.zh.contact;
  const en = state.en.contact;
  const links = (zh.links || [])
    .map((l, i) => {
      const types = LINK_TYPES.map((t) => `<option value="${t}" ${l.type === t ? 'selected' : ''}>${t}</option>`).join('');
      return `
      <div class="mb-3 rounded-lg border border-zinc-800 p-3" data-link-index="${i}">
        <select data-bind="zh.contact.links.${i}.type" class="admin-input mb-2">${types}</select>
        ${input('', `data-bind="zh.contact.links.${i}.label" value="${esc(l.label)}"`)}
        ${input('', `data-bind="zh.contact.links.${i}.href" value="${esc(l.href)}" placeholder="https://..."`)}
        <button type="button" class="btn-del-link mt-2 text-xs text-red-400" data-index="${i}">删除链接</button>
      </div>`;
    })
    .join('');

  return `
    <section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 class="mb-4 text-sm font-semibold">联系</h2>
      ${field('中文说明 note', `<textarea class="admin-input min-h-[60px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" data-bind="zh.contact.note">${zh.note || ''}</textarea>`)}
      ${field('English note', `<textarea class="admin-input min-h-[60px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" data-bind="en.contact.note">${en.note || ''}</textarea>`)}
      <h3 class="mb-2 text-xs text-zinc-500">链接（中英共用 href，label 请两边 contact.links 索引一致）</h3>
      ${links}
      <button type="button" id="btn-add-link" class="text-xs text-cyan-400">+ 添加链接</button>
    </section>`;
}

function renderMetaPanel() {
  return `
    <section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 class="mb-4 text-sm font-semibold">站点元信息</h2>
      ${field('中文 title', input('', `data-bind="zh.meta.title" value="${esc(state.zh.meta?.title || '')}"`))}
      ${field('EN title', input('', `data-bind="en.meta.title" value="${esc(state.en.meta?.title || '')}"`))}
      ${field('中文 description', input('', `data-bind="zh.meta.description" value="${esc(state.zh.meta?.description || '')}"`))}
      ${field('EN description', input('', `data-bind="en.meta.description" value="${esc(state.en.meta?.description || '')}"`))}
      ${field('页眉 subtitle (zh)', input('', `data-bind="zh.header.subtitle" value="${esc(state.zh.header?.subtitle || '')}"`))}
      ${field('header subtitle (en)', input('', `data-bind="en.header.subtitle" value="${esc(state.en.header?.subtitle || '')}"`))}
      ${field('页脚 footer (zh)', input('', `data-bind="zh.footer" value="${esc(state.zh.footer || '')}"`))}
      ${field('footer (en)', input('', `data-bind="en.footer" value="${esc(state.en.footer || '')}"`))}
    </section>`;
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null) cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[p];
  }
  const last = parts[parts.length - 1];
  if (value === 'true') cur[last] = true;
  else if (value === 'false') cur[last] = false;
  else cur[last] = value;
}

function getByPath(root, path) {
  return path.split('.').reduce((o, k) => o?.[k], root);
}

function syncBindFromDOM() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = el.getAttribute('data-bind');
    const [lang, ...rest] = path.split('.');
    const root = lang === 'zh' ? state.zh : state.en;
    let val = el.type === 'checkbox' ? el.checked : el.value;
    if (path.endsWith('.enabled')) val = el.checked;
    setByPath(root, rest.join('.'), val);
  });
  if (state.zh.profile?.avatarUrl != null) {
    state.en.profile.avatarUrl = state.zh.profile.avatarUrl;
    state.en.profile.avatarAlt = state.en.profile.avatarAlt || state.en.profile.name;
  }
  (state.zh.cards || []).forEach((c, i) => {
    const en = state.en.cards[i];
    if (!en) return;
    en.template = c.template;
    en.id = c.id;
    en.gridClass = c.gridClass;
    en.delay = c.delay;
    if (c.enabled !== undefined) en.enabled = c.enabled;
    (c.tags || []).forEach((t, ti) => {
      if (en.tags?.[ti]) en.tags[ti].variant = t.variant;
    });
  });
  (state.zh.contact?.links || []).forEach((l, i) => {
    if (state.en.contact.links[i]) {
      state.en.contact.links[i].type = l.type;
      state.en.contact.links[i].href = l.href;
      state.en.contact.links[i].hover = l.hover;
    }
  });
  saveDraftLocal();
}

function bindPanelEvents() {
  $('admin-panel')?.querySelectorAll('[data-bind]').forEach((el) => {
    el.addEventListener('change', syncBindFromDOM);
    el.addEventListener('input', syncBindFromDOM);
  });

  document.querySelectorAll('.btn-del-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const box = btn.closest('[data-list]');
      const key = box.dataset.list;
      const lang = box.dataset.lang;
      const idx = Number(box.dataset.index);
      const root = state[lang];
      root[key].splice(idx, 1);
      const other = lang === 'zh' ? 'en' : 'zh';
      if (state[other][key][idx]) state[other][key].splice(idx, 1);
      renderPanel();
      saveDraftLocal();
    });
  });

  document.querySelector('.btn-add-list')?.addEventListener('click', (e) => {
    const key = e.target.dataset.listKey;
    const id = newId(key === 'workExperience' ? 'work' : key.slice(0, 4));
    const templates = {
      workExperience: { id, company: '', role: '', period: '', bodyHtml: '' },
      projects: { id, name: '', tech: '', href: '', description: '' },
      education: { id, school: '', degree: '', period: '' },
    };
    state.zh[key].push({ ...templates[key], id });
    state.en[key].push({ ...templates[key], id });
    renderPanel();
    saveDraftLocal();
  });

  document.querySelectorAll('.btn-del-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.index);
      state.zh.cards.splice(i, 1);
      state.en.cards.splice(i, 1);
      renderPanel();
      saveDraftLocal();
    });
  });

  $('btn-add-card')?.addEventListener('click', () => {
    const id = newId('card');
    state.zh.cards.push({
      id,
      template: 'text',
      gridClass: '',
      delay: '0.55s',
      title: '新卡片',
      bodyHtml: '',
    });
    state.en.cards.push({
      id,
      template: 'text',
      gridClass: '',
      delay: '0.55s',
      title: 'New card',
      bodyHtml: '',
    });
    renderPanel();
    saveDraftLocal();
  });

  $('btn-add-link')?.addEventListener('click', () => {
    const item = { type: 'github', label: 'GitHub', href: '', hover: 'cyan' };
    state.zh.contact.links.push({ ...item });
    state.en.contact.links.push({ ...item, label: 'GitHub' });
    renderPanel();
    saveDraftLocal();
  });

  document.querySelectorAll('.btn-del-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.index);
      state.zh.contact.links.splice(i, 1);
      state.en.contact.links.splice(i, 1);
      renderPanel();
      saveDraftLocal();
    });
  });

  document.querySelectorAll('.btn-add-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ci = Number(btn.dataset.cardI);
      if (!state.zh.cards[ci].tags) state.zh.cards[ci].tags = [];
      if (!state.en.cards[ci].tags) state.en.cards[ci].tags = [];
      state.zh.cards[ci].tags.push({ label: '', variant: 'zinc' });
      state.en.cards[ci].tags.push({ label: '', variant: 'zinc' });
      renderPanel();
      saveDraftLocal();
    });
  });

  document.querySelectorAll('.btn-del-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ci = Number(btn.dataset.cardI);
      const ti = Number(btn.dataset.tagI);
      state.zh.cards[ci].tags?.splice(ti, 1);
      state.en.cards[ci].tags?.splice(ti, 1);
      renderPanel();
      saveDraftLocal();
    });
  });
}

async function publish() {
  syncBindFromDOM();
  if (!confirm('确认将当前中英文 content JSON 发布到 GitHub？访客几分钟后可见。')) return;
  setStatus('正在发布…');
  try {
    await publishBoth(state.zh, state.en, { shaZh: state.shaZh, shaEn: state.shaEn });
    await loadFromGitHub();
    setStatus('已发布到 GitHub Pages', true);
    alert('发布成功。若站点未更新，请等待 1–2 分钟并强制刷新。');
  } catch (e) {
    console.error(e);
    setStatus('发布失败');
    alert('发布失败：' + e.message);
  }
}

function showAdmin() {
  $('login-screen').classList.add('hidden');
  $('admin-app').classList.remove('hidden');
}

function showLoginHint() {
  const err = $('login-error');
  if (!err) return;
  if (!hasConfigFile()) {
    err.textContent =
      '未加载 admin-config.js：请在本项目目录执行 copy admin-config.example.js admin-config.js 并设置 adminPassword。';
    err.classList.remove('hidden');
    return;
  }
  if (!hasAdminPassword()) {
    err.textContent =
      '请编辑 admin-config.js：将 adminPassword 从 change-me-to-a-strong-password 改为你自己的密码。';
    err.classList.remove('hidden');
  }
}

async function afterLogin() {
  $('login-error')?.classList.add('hidden');
  showAdmin();
  renderNav();

  let githubErr = null;
  try {
    checkGithubReady();
    await loadFromGitHub();
    return;
  } catch (err) {
    githubErr = err;
    state.lastLoadError = err.message;
    console.error('GitHub load:', err);
  }

  try {
    await loadFromSite();
    setStatus('GitHub 失败，已改用本站 JSON', false);
    return;
  } catch (siteErr) {
    console.error('Site load:', siteErr);
    setStatus('加载失败');
    renderLoadFailurePanel(githubErr, siteErr);
  }
}

async function init() {
  showLoginHint();

  const form = $('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = ($('login-password')?.value ?? '').trim();
    const result = login(pw);
    if (!result.ok) {
      const err = $('login-error');
      if (result.reason === 'missing-config') {
        err.textContent =
          '未找到 admin-config.js，请复制 admin-config.example.js 并填写 adminPassword。';
      } else if (result.reason === 'default-password') {
        err.textContent =
          '请先在 admin-config.js 里设置 adminPassword（不要使用示例里的 change-me…）。';
      } else {
        err.textContent = '密码错误，请与 admin-config.js 中 adminPassword 完全一致。';
      }
      err.classList.remove('hidden');
      return;
    }
    await afterLogin();
  });

  if (isLoggedIn()) {
    await afterLogin();
  }

  $('btn-logout')?.addEventListener('click', logout);
  $('btn-load-site')?.addEventListener('click', async () => {
    try {
      await loadFromSite();
    } catch (e) {
      alert(e.message);
    }
  });
  $('btn-reload')?.addEventListener('click', async () => {
    try {
      await loadFromGitHub();
    } catch (e) {
      state.lastLoadError = e.message;
      setStatus('GitHub 加载失败');
      renderNav();
      if (state.zh && state.en) {
        renderPanel();
        renderLoadBanner();
      } else {
        renderLoadFailurePanel(e, new Error('请先尝试从本站加载'));
      }
      alert('GitHub 加载失败：\n' + e.message);
    }
  });
  $('btn-preview')?.addEventListener('click', () => window.open('index.html', '_blank'));
  $('btn-publish')?.addEventListener('click', publish);
}

init();