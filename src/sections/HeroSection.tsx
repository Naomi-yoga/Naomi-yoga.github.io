import { siteContent } from '@/data/siteContent'
import { SectionShell } from '@/components/SectionShell'

export function HeroSection() {
  const { profile } = siteContent

  return (
    <SectionShell id="about" variant="hero">
      <div className="hero">
        <p className="eyebrow">PROFILE</p>
        <h1 className="hero__title">{profile.name}</h1>
        <p className="hero__role">{profile.role}</p>
        <p className="hero__tagline">{profile.tagline}</p>
        <div className="hero__meta">
          <span className="mono">{profile.location}</span>
          <ul className="hero__chips">
            {profile.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  )
}