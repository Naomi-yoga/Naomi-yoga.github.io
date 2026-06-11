import { siteContent } from '@/data/siteContent'
import { SectionShell } from '@/components/SectionShell'

export function ContactSection() {
  const { contact } = siteContent

  return (
    <SectionShell id="contact" variant="contact">
      <div className="contact">
        <header className="section-head">
          <p className="eyebrow">CONTACT</p>
          <h2 className="section-head__title">通过 GitHub 联系</h2>
          <p className="section-head__desc">{contact.note}</p>
        </header>
        <a className="contact__github" href={contact.githubUrl} target="_blank" rel="noreferrer">
          <span className="contact__handle">{contact.githubHandle}</span>
          <span className="contact__cta">打开 GitHub 主页 →</span>
        </a>
      </div>
    </SectionShell>
  )
}