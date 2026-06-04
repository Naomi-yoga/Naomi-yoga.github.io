/**
 * Bento resume renderer — loads content.{lang}.json and builds the grid.
 * Edit content in /content/*.json only (no HTML changes needed for copy updates).
 */

const TAG_VARIANTS = {
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  zinc: 'border-zinc-700 bg-zinc-800/80 text-zinc-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

const LINK_HOVER = {
  cyan: 'hover:text-cyan-400',
  violet: 'hover:text-violet-400',
};

const CARD_BASE =
  'bento-card bento-enter rounded-3xl border border-zinc-800 bg-zinc-900';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTags(tags) {
  if (!tags?.length) return '';
  return tags
    .map((t) => {
      const cls = TAG_VARIANTS[t.variant] || TAG_VARIANTS.zinc;
      return `<span class="rounded-full border px-3 py-1 text-xs ${cls}">${escapeHtml(t.label)}</span>`;
    })
    .join('');
}

function renderProfile(profile) {
  const avatarInner = profile.avatarUrl
    ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="${escapeHtml(profile.avatarAlt || profile.name)}" class="h-28 w-28 rounded-2xl object-cover ring-2 ring-zinc-700" />`
    : `<div class="mb-0 flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/40 to-cyan-600/40 ring-2 ring-zinc-700">
        <i data-lucide="user" class="h-14 w-14 text-violet-300"></i>
       </div>`;

  const wrapAvatar = profile.avatarUrl
    ? `<div class="mb-4">${avatarInner}</div>`
    : `<div class="mb-4">${avatarInner}</div>`;

  return `
    <article class="${CARD_BASE} p-6 md:row-span-2 flex flex-col items-center justify-center text-center" style="animation-delay: 0.05s" data-card-id="profile">
      ${wrapAvatar}
      <h1 class="text-2xl font-bold tracking-tight">${escapeHtml(profile.name)}</h1>
      <p class="mt-2 text-sm text-zinc-400">${profile.titleHtml || ''}</p>
    </article>`;
}

function renderTextCard(card) {
  const grid = card.gridClass ? ` ${card.gridClass}` : '';
  return `
    <article class="${CARD_BASE} p-8 flex flex-col justify-center${grid}" style="animation-delay: ${card.delay || '0s'}" data-card-id="${escapeHtml(card.id)}">
      <h2 class="mb-3 text-lg font-semibold text-zinc-100">${escapeHtml(card.title)}</h2>
      <p class="text-sm leading-relaxed text-zinc-400 md:text-base">${card.bodyHtml || ''}</p>
    </article>`;
}

function renderSkillsCard(card) {
  const grid = card.gridClass ? ` ${card.gridClass}` : '';
  const layout = card.hint ? 'justify-center' : 'justify-end';
  const titleBlock = card.title
    ? `<h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">${escapeHtml(card.title)}</h2>`
    : '';
  const hintBlock = card.hint
    ? `<p class="text-xs text-zinc-500">${escapeHtml(card.hint)}</p>`
    : '';

  return `
    <article class="${CARD_BASE} p-6 flex flex-col ${layout} min-h-[140px]${grid}" style="animation-delay: ${card.delay || '0s'}" data-card-id="${escapeHtml(card.id)}">
      ${titleBlock}
      ${hintBlock}
      <div class="${card.hint ? 'mt-2 ' : ''}flex flex-wrap gap-2">${renderTags(card.tags)}</div>
    </article>`;
}

function isLinkVisible(link) {
  if (!link?.href) return false;
  if (link.show === false) return false;
  if (link.optional === true && !link.href.trim()) return false;
  return true;
}

function renderContactCard(card, contact) {
  const grid = card.gridClass ? ` ${card.gridClass}` : '';
  const cfg = contact || {};
  const links = [...(cfg.links || [])];
  if (cfg.email?.address && cfg.email.showOnSite === true) {
    links.push({
      type: 'mail',
      label: cfg.email.label || 'Email',
      href: `mailto:${cfg.email.address}`,
      hover: 'violet',
    });
  }
  const visibleLinks = links.filter(isLinkVisible);
  const linksHtml = visibleLinks
    .map((l) => {
      const hover = LINK_HOVER[l.hover] || LINK_HOVER.cyan;
      const external =
        l.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(l.href)}"${external} class="flex items-center gap-2 text-zinc-400 transition-colors ${hover}" aria-label="${escapeHtml(l.label)}">
        <i data-lucide="${escapeHtml(l.type)}" class="h-5 w-5"></i>
        <span class="text-sm">${escapeHtml(l.label)}</span>
      </a>`;
    })
    .join('');

  const noteHtml = cfg.note
    ? `<p class="mt-4 text-xs leading-relaxed text-zinc-500">${escapeHtml(cfg.note)}</p>`
    : '';

  return `
    <article class="${CARD_BASE} p-8 flex flex-col justify-between${grid}" style="animation-delay: ${card.delay || '0s'}" data-card-id="${escapeHtml(card.id)}">
      <div>
        <h2 class="text-lg font-semibold">${escapeHtml(card.title)}</h2>
        <div class="mt-4 flex flex-wrap gap-4">${linksHtml}</div>
        ${noteHtml}
      </div>
    </article>`;
}

function renderCard(card, data) {
  switch (card.template) {
    case 'text':
      return renderTextCard(card);
    case 'skills':
      return renderSkillsCard(card);
    case 'contact':
      return renderContactCard(card, data.contact);
    default:
      return '';
  }
}

function applyMeta(data) {
  if (data.meta?.title) document.title = data.meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && data.meta?.description) desc.setAttribute('content', data.meta.description);
}

function applyChrome(data) {
  const sub = document.getElementById('header-subtitle');
  if (sub && data.header?.subtitle) sub.textContent = data.header.subtitle;
  const foot = document.getElementById('footer-text');
  if (foot && data.footer) foot.textContent = data.footer;
}

/**
 * @param {'zh'|'en'} lang
 */
export async function renderResume(lang) {
  const root = document.getElementById('bento-grid');
  if (!root) return;

  let data;
  try {
    const res = await fetch(`content/content.${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    root.innerHTML = `<p class="col-span-full text-center text-sm text-red-400">Failed to load content/content.${lang}.json — use a local HTTP server (see GITHUB_PAGES.md).</p>`;
    console.error(err);
    return;
  }

  applyMeta(data);
  applyChrome(data);

  const parts = [renderProfile(data.profile)];
  for (const card of data.cards || []) {
    parts.push(renderCard(card, data));
  }
  root.innerHTML = parts.join('');

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

export function getStoredLang() {
  try {
    const saved = localStorage.getItem('resume-lang');
    if (saved === 'en' || saved === 'zh') return saved;
  } catch (_) {}
  return 'zh';
}

export function storeLang(lang) {
  try {
    localStorage.setItem('resume-lang', lang);
  } catch (_) {}
}