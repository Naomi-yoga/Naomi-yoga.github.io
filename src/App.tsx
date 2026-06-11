import { HeroSection } from '@/sections/HeroSection'
import { WorksSection } from '@/sections/WorksSection'
import { ContactSection } from '@/sections/ContactSection'

export default function App() {
  return (
    <>
      <header className="site-header">
        <a className="site-header__brand" href="#about">
          Portfolio
        </a>
        <nav className="site-header__nav" aria-label="页面导航">
          <a href="#about">关于</a>
          <a href="#works">作品</a>
          <a href="#contact">联系</a>
        </nav>
      </header>
      <main>
        <HeroSection />
        <WorksSection />
        <ContactSection />
      </main>
      <footer className="site-footer">
        <span className="mono">Built with React · TypeScript · Vite</span>
      </footer>
    </>
  )
}