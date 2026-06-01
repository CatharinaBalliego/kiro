import { KiroLogo } from '@/components/KiroLogo';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Produto',
    links: [
      { label: 'Pra que serve', href: '#audiencias' },
      { label: 'Como funciona', href: '#como-funciona' },
      { label: 'Em breve', href: '#em-breve' },
      { label: 'Dashboard', href: 'https://kiro-merchant-dashboard.netlify.app/resumo' },
    ],
  },
  {
    title: 'Tecnologia',
    links: [
      { label: 'Stellar Network', href: 'https://stellar.org' },
      { label: 'Etherfuse (TESOURO)', href: 'https://app.etherfuse.com/bonds/TESOURO' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Contato', href: 'mailto:contato@kiro.app' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/kiro-payments' },
      { label: 'X', href: 'https://x.com/Kiro_app' },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="relative z-10 border-t mt-8"
      style={{ borderColor: 'var(--stroke-1)', background: 'rgba(10,11,16,0.6)' }}
    >
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-12">
          <div className="flex flex-col gap-4">
            <KiroLogo size={28} />
            <p className="font-sans text-[13px] text-[var(--fg-3)] leading-relaxed max-w-[300px]">
              Conta do seu negócio que rende todo dia e saca pelo PIX a
              qualquer hora.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="k-eyebrow">{col.title}</span>
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="font-sans text-[13.5px] text-[var(--fg-2)] hover:text-[var(--fg-1)] transition-colors no-underline"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 pt-6 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{ borderColor: 'var(--stroke-1)' }}
        >
          <span className="font-sans text-[12px] text-[var(--fg-4)]">
            © {new Date().getFullYear()} Kiro · Em fase de validação regulatória. Demo aberta.
          </span>
          <span className="font-sans text-[11px] text-[var(--fg-4)] tracking-[0.04em] uppercase">
            Powered by Stellar
          </span>
        </div>
      </div>
    </footer>
  );
}
