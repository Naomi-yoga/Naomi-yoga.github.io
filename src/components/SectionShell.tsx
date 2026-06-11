import type { ReactNode } from 'react'
import { WaveBackground, type WaveVariant } from './WaveBackground'

type Props = {
  id: string
  variant: WaveVariant
  children: ReactNode
  className?: string
}

export function SectionShell({ id, variant, children, className = '' }: Props) {
  return (
    <section id={id} className={`section section--${variant} ${className}`.trim()}>
      <WaveBackground variant={variant} />
      <div className="section__inner">{children}</div>
    </section>
  )
}