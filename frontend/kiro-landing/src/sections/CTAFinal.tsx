import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/Button';

const DASHBOARD_URL = 'https://kiro-merchant-dashboard.netlify.app/resumo';

export function CTAFinal() {
  return (
    <section className="relative z-10 max-w-[1180px] mx-auto px-5 md:px-8 py-16 md:py-24">
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] border text-center px-6 md:px-10 py-14 md:py-20"
        style={{
          background:
            'linear-gradient(135deg, rgba(0,255,135,0.08) 0%, rgba(123,44,191,0.10) 100%)',
          borderColor: 'var(--stroke-2)',
        }}
      >
        {/* Concentric glows */}
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'var(--gradient-glow-green)', opacity: 0.25 }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'var(--gradient-glow-purple)', opacity: 0.20 }}
        />

        <div className="relative max-w-[680px] mx-auto flex flex-col items-center gap-6">
          <span className="k-eyebrow">Pronto pra começar</span>
          <h2
            className="k-display"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}
          >
            Seu dinheiro <span className="k-gradient-text">não dorme</span>.
          </h2>
          <p className="font-sans text-[16px] text-[var(--fg-2)] leading-relaxed max-w-[520px]">
            Veja na prática como funciona uma conta de PIX que rende sozinha e saca a qualquer hora. Demo aberta, sem cadastro.
          </p>
          <Button
            variant="primary"
            size="lg"
            iconRight={ArrowRight}
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2"
          >
            Acessar dashboard
          </Button>
          <span className="font-sans text-[12px] text-[var(--fg-3)]">
            Sem cadastro · Demo aberta
          </span>
        </div>
      </div>
    </section>
  );
}
