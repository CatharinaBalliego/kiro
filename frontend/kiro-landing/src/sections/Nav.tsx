import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { KiroLogo } from '@/components/KiroLogo';
import { Button } from '@/components/Button';

const DASHBOARD_URL = 'https://kiro-merchant-dashboard.netlify.app/resumo';

const LINKS = [
  { href: '#audiencias', label: 'Pra que serve' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#numeros', label: 'Números' },
];

/** Sticky top nav. Glass effect on scroll. */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-colors"
      style={{
        background: scrolled ? 'rgba(10,11,16,0.75)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--stroke-1)' : '1px solid transparent',
      }}
    >
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between gap-4">
        <a href="#top" aria-label="Início" className="no-underline">
          <KiroLogo size={28} />
        </a>

        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-sans text-[14px] text-[var(--fg-2)] hover:text-[var(--fg-1)] transition-colors no-underline"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Button
          variant="primary"
          size="md"
          iconRight={ArrowRight}
          href={DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Acessar dashboard
        </Button>
      </div>
    </header>
  );
}
