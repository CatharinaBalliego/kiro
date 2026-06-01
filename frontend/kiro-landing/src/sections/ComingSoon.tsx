import { Sparkles } from 'lucide-react';

export function ComingSoon() {
  return (
    <section
      id="em-breve"
      className="relative z-10 max-w-[1180px] mx-auto px-5 md:px-8 py-12 md:py-16"
    >
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] border px-6 md:px-10 py-10 md:py-12"
        style={{
          background: 'rgba(123,44,191,0.06)',
          borderColor: 'var(--stroke-purple)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'var(--gradient-glow-purple)', opacity: 0.35 }}
        />

        <div className="relative flex flex-col gap-3 max-w-[640px]">
          <span
            className="inline-flex items-center gap-2 self-start rounded-full border font-sans text-[12px] font-medium"
            style={{
              padding: '6px 14px',
              background: 'rgba(123,44,191,0.10)',
              borderColor: 'var(--stroke-purple)',
              color: '#C99EFA',
              letterSpacing: '0.02em',
            }}
          >
            <Sparkles size={13} strokeWidth={2} />
            Em breve
          </span>

          <h2
            className="font-display font-semibold text-[var(--fg-1)] tracking-[-0.02em] mt-2"
            style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', lineHeight: 1.15 }}
          >
            Adiante o que você vendeu no cartão,{' '}
            <span className="k-gradient-text">sem precisar de banco</span>.
          </h2>

          <p className="font-sans text-[15px] md:text-[16px] text-[var(--fg-2)] leading-relaxed mt-1">
            Estamos trabalhando pra que você também possa receber hoje o que
            vendeu no cartão de crédito, dentro do próprio Kiro. Sem espera de
            30 dias, sem fila de banco.
          </p>
        </div>
      </div>
    </section>
  );
}
