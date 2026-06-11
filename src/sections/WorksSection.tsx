import { siteContent } from '@/data/siteContent'
import { SectionShell } from '@/components/SectionShell'

export function WorksSection() {
  const { works } = siteContent

  return (
    <SectionShell id="works" variant="works">
      <div className="works">
        <header className="section-head">
          <p className="eyebrow">WORKS</p>
          <h2 className="section-head__title">个人作品</h2>
          <p className="section-head__desc">精选项目与实验，可按需在配置中维护。</p>
        </header>
        <ul className="works__grid">
          {works.map((work) => (
            <li key={work.title} className="work-card">
              <h3 className="work-card__title">{work.title}</h3>
              <p className="work-card__desc">{work.description}</p>
              <ul className="work-card__tags">
                {work.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <div className="work-card__links">
                {work.link ? (
                  <a href={work.link} target="_blank" rel="noreferrer">
                    访问
                  </a>
                ) : null}
                {work.repo ? (
                  <a href={work.repo} target="_blank" rel="noreferrer">
                    仓库
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}