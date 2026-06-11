export type WorkItem = {
  title: string
  description: string
  tags: string[]
  link?: string
  repo?: string
}

export const siteContent = {
  profile: {
    name: 'Naomi',
    role: '工程师 / 创作者',
    tagline: '用代码与产品解决问题，做让自己喜欢的东西。',
    location: '中国',
    highlights: ['前端与全栈', '开源协作', '简约界面', 'Vibe Coding'],
  },
  works: [
    {
      title: '项目 A',
      description: '一句话说明这个项目解决什么问题、你负责什么。',
      tags: ['TypeScript', 'React'],
      link: 'https://example.com',
      repo: 'https://github.com/yourname/project-a',
    },
    {
      title: '项目 B',
      description: '可替换为真实作品：工具、实验或线上产品。',
      tags: ['Node.js', 'API'],
      repo: 'https://github.com/yourname/project-b',
    },
    {
      title: '项目 C',
      description: '第三个占位卡片，部署后可在配置文件中增删。',
      tags: ['设计', '原型'],
    },
  ] satisfies WorkItem[],
  contact: {
    githubUrl: 'https://github.com/Naomi-yoga',
    githubHandle: 'Naomi-yoga',
    note: '优先通过 GitHub Issues 或 Profile 上的联系方式与我沟通。',
  },
}