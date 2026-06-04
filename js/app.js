import { renderResume, getStoredLang, storeLang } from './render.js';

const body = document.body;
const btnZh = document.getElementById('btn-zh');
const btnEn = document.getElementById('btn-en');

const active =
  'rounded-full px-3 py-1 text-xs font-medium text-zinc-100 bg-zinc-800';
const idle =
  'rounded-full px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-100';

function updateToggle(lang) {
  if (lang === 'zh') {
    btnZh.className = active;
    btnEn.className = idle;
    btnZh.setAttribute('aria-pressed', 'true');
    btnEn.setAttribute('aria-pressed', 'false');
  } else {
    btnEn.className = active;
    btnZh.className = idle;
    btnEn.setAttribute('aria-pressed', 'true');
    btnZh.setAttribute('aria-pressed', 'false');
  }
}

async function setLang(lang) {
  body.setAttribute('data-lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  updateToggle(lang);
  storeLang(lang);
  await renderResume(lang);
}

btnZh.addEventListener('click', () => setLang('zh'));
btnEn.addEventListener('click', () => setLang('en'));

const initial = getStoredLang();
setLang(initial);