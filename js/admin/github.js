const API = 'https://api.github.com';

function cfg() {
  const c = window.ADMIN_CONFIG;
  if (!c?.githubToken || !c?.owner || !c?.repo) {
    throw new Error('请配置 admin-config.js（githubToken、owner、repo）');
  }
  return c;
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

function contentsUrl(owner, repo, path, branch) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
}

async function parseGithubError(res, fallback) {
  let detail = fallback;
  try {
    const j = JSON.parse(await res.text());
    if (j.message) detail = j.message;
    if (j.documentation_url) detail += ` (${j.documentation_url})`;
  } catch (_) {
  }
  return detail;
}

/**
 * @param {string} path e.g. content/content.zh.json
 */
export async function getFile(path) {
  const { githubToken, owner, repo, branch = 'main' } = cfg();
  const url = contentsUrl(owner, repo, path, branch);
  let res;
  try {
    res = await fetch(url, { headers: headers(githubToken) });
  } catch (e) {
    throw new Error(
      `无法连接 GitHub API（${e.message}）。若在国内网络，可尝试 VPN；或先用「从本站加载」编辑本地/已部署的 JSON。`
    );
  }
  if (res.status === 404) return null;
  if (res.status === 401) {
    throw new Error(
      'GitHub 返回 401：Token 无效或已过期。请重新生成 PAT（classic：勾选 repo；fine-grained：该仓库 Contents 读+写）。'
    );
  }
  if (res.status === 403) {
    const detail = await parseGithubError(res, '无权限');
    throw new Error(
      `GitHub 返回 403：${detail}。请确认 Token 对仓库 ${owner}/${repo} 有 Contents 读写权限，且未超出 API 限额。`
    );
  }
  if (!res.ok) {
    const detail = await parseGithubError(res, `HTTP ${res.status}`);
    throw new Error(`GitHub 读取失败：${detail}`);
  }
  const json = await res.json();
  const bin = atob(json.content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`${path} 不是合法 JSON：${e.message}`);
  }
  return { sha: json.sha, content: text, parsed };
}

/**
 * @param {string} path
 * @param {object} data
 * @param {string|null} sha
 */
export async function putFile(path, data, sha) {
  const { githubToken, owner, repo, branch = 'main' } = cfg();
  const content = JSON.stringify(data, null, 2) + '\n';
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const body = {
    message: `content(admin): update ${path}`,
    content: btoa(binary),
    branch,
  };
  if (sha) body.sha = sha;

  const url = `${API}/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: headers(githubToken),
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`无法连接 GitHub API：${e.message}`);
  }
  if (!res.ok) {
    const detail = await parseGithubError(res, `HTTP ${res.status}`);
    throw new Error(`GitHub 写入失败：${detail}`);
  }
  return res.json();
}

/** 从当前站点同源加载（localhost / Pages），无 sha，不能用于 API 覆盖除非先 reload GitHub */
export async function loadBothFromSite() {
  const [zhRes, enRes] = await Promise.all([
    fetch('content/content.zh.json', { cache: 'no-store' }),
    fetch('content/content.en.json', { cache: 'no-store' }),
  ]);
  if (!zhRes.ok || !enRes.ok) {
    throw new Error(
      `无法读取本站 JSON（zh: ${zhRes.status}, en: ${enRes.status}）。请用 python -m http.server 在项目根目录启动，或确认已 push content 目录。`
    );
  }
  const zh = await zhRes.json();
  const en = await enRes.json();
  return { zh, en, shaZh: null, shaEn: null, source: 'site' };
}

export async function loadBothContent() {
  const zh = await getFile('content/content.zh.json');
  const en = await getFile('content/content.en.json');
  if (!zh?.parsed || !en?.parsed) {
    const { owner, repo, branch } = cfg();
    throw new Error(
      `仓库 ${owner}/${repo}（分支 ${branch}）中找不到 content/content.zh.json 或 content.en.json。请先把本地 content 目录 push 到 GitHub。`
    );
  }
  return {
    zh: zh.parsed,
    en: en.parsed,
    shaZh: zh.sha,
    shaEn: en.sha,
    source: 'github',
  };
}

export async function publishBoth(zh, en, shas) {
  if (!shas.shaZh || !shas.shaEn) {
    throw new Error('当前为「本站加载」模式，没有文件 sha。请先成功「从 GitHub 重新加载」后再发布。');
  }
  await putFile('content/content.zh.json', zh, shas.shaZh);
  const enFresh = await getFile('content/content.en.json');
  await putFile('content/content.en.json', en, enFresh?.sha ?? shas.shaEn);
}