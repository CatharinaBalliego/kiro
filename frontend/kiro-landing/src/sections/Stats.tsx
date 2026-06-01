const STATS: { value: string; suffix?: string; label: string }[] = [
  { value: '24', suffix: '/7', label: 'PIX a qualquer hora, todo dia' },
  { value: '100', suffix: '%', label: 'Do seu saldo rende sozinho' },
  { value: '1', suffix: ' clique', label: 'Pra sacar pro seu banco' },
  { value: 'R$ 0', label: 'Sem mensalidade, sem maquininha' },
];

export function Stats() {
  return (
    <section
      id="numeros"
      className="relative z-10 max-w-[1180px] mx-auto px-5 md:px-8 py-16 md:py-20"
    >
      <div
        className="rounded-[var(--radius-xl)] border overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.025)',
          borderColor: 'var(--stroke-2)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center justify-center text-center py-8 md:py-12 px-4 relative"
              style={{
                borderRight:
                  i < STATS.length - 1 ? '1px solid var(--stroke-1)' : 'none',
                borderBottom:
                  i < 2 ? '1px solid var(--stroke-1)' : 'none',
              }}
            >
              <div
                className="font-display font-bold k-gradient-text"
                style={{
                  fontSize: 'clamp(40px, 5.5vw, 64px)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {s.value}
                {s.suffix && (
                  <span style={{ fontSize: '0.55em', marginLeft: '0.05em' }}>
                    {s.suffix}
                  </span>
                )}
              </div>
              <span className="font-sans text-[12px] md:text-[13px] text-[var(--fg-3)] mt-3 max-w-[180px] leading-snug">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="font-sans text-[11px] text-[var(--fg-4)] text-center mt-4">
        * Demo aberta. Em fase de validação regulatória.
      </p>
    </section>
  );
}
