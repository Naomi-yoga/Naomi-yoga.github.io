/** Card templates editable in admin */
export const CARD_TEMPLATES = [
  { value: 'text', label: '文本块 (关于/理念)' },
  { value: 'skills', label: '技能标签' },
  { value: 'work', label: '工作经历（列表）' },
  { value: 'projects', label: '项目作品（列表）' },
  { value: 'education', label: '教育背景（列表）' },
  { value: 'contact', label: '联系我' },
];

export const TAG_VARIANTS = ['violet', 'cyan', 'zinc', 'emerald'];

export const LINK_TYPES = ['github', 'mail', 'twitter', 'linkedin', 'globe'];

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function emptyZh() {
  return {
    meta: { title: '徐辉 | 个人简历', description: '' },
    header: { subtitle: '个人简历 · Bento' },
    footer: '',
    profile: { name: '徐辉', titleHtml: '', avatarUrl: null, avatarAlt: '徐辉' },
    workExperience: [],
    projects: [],
    education: [],
    cards: [],
    contact: { note: '', links: [] },
  };
}

export function emptyEn() {
  return {
    meta: { title: 'Xu Hui | Resume', description: '' },
    header: { subtitle: 'Resume · Bento' },
    footer: '',
    profile: { name: 'Xu Hui', titleHtml: '', avatarUrl: null, avatarAlt: 'Xu Hui' },
    workExperience: [],
    projects: [],
    education: [],
    cards: [],
    contact: { note: '', links: [] },
  };
}