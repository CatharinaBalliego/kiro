import { ArrowRight, ArrowDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/Button';

const DASHBOARD_URL = 'https://kiro-merchant-dashboard.netlify.app/resumo';

export function Hero() {
  return (
    <section
      id="top"
      className="relative z-10 max-w-[1180px] mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24"
    >
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-center">
        {/* Copy */}
        <div className="flex flex-col gap-6 md:gap-7">
          <Pill />
          <h1
            className="k-display"
            style={{ fontSize: 'clamp(38px, 6vw, 64px)' }}
          >
            Receba PIX.
            <br />
            <span className="k-gradient-text">Seu dinheiro rende.</span>
          </h1>
          <p className="font-sans text-[16px] md:text-[17px] text-[var(--fg-2)] leading-relaxed max-w-[520px]">
            O Kiro é a conta do seu negócio que rende todo dia. Seu cliente
            paga por PIX, o saldo parado já começa a render sozinho, e você
            saca pelo PIX quando precisar. Sem maquininha, sem mensalidade.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Button
              variant="primary"
              size="lg"
              iconRight={ArrowRight}
              href={DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Acessar dashboard
            </Button>
            <Button variant="secondary" size="lg" iconRight={ArrowDown} href="#como-funciona">
              Como funciona
            </Button>
          </div>

          <p className="font-sans text-[12px] text-[var(--fg-3)] mt-2">
            Demo aberta · sem cadastro
          </p>
        </div>

        {/* Visual: balance card mock */}
        <div className="relative">
          <BalanceCardMock />
        </div>
      </div>
    </section>
  );
}

function Pill() {
  return (
    <span
      className="inline-flex items-center gap-2 self-start rounded-full border font-sans text-[12px] font-medium"
      style={{
        padding: '6px 14px',
        background: 'rgba(0,255,135,0.06)',
        borderColor: 'var(--stroke-green)',
        color: 'var(--kiro-green)',
        letterSpacing: '0.02em',
      }}
    >
      <Sparkles size={13} strokeWidth={2} />
      Conta que rende · PIX a qualquer hora
    </span>
  );
}

/** Static glass mock of the dashboard's BalanceCard — purely decorative. */
function BalanceCardMock() {
  return (
    <div className="relative">
      {/* Green halo behind the card */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 rounded-full pointer-events-none"
        style={{ background: 'var(--gradient-glow-green)', opacity: 0.6 }}
      />

      <div
        className="relative rounded-[var(--radius-xl)] border p-6 md:p-7"
        style={{
          background: 'rgba(17, 19, 28, 0.85)',
          borderColor: 'var(--stroke-2)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="k-eyebrow">Saldo disponível</span>
          <span
            className="text-[10px] font-display font-medium px-2 py-1 rounded-full"
            style={{
              background: 'rgba(0,255,135,0.10)',
              color: 'var(--kiro-green)',
              border: '1px solid var(--stroke-green)',
              letterSpacing: '0.04em',
            }}
          >
            Rendendo
          </span>
        </div>

        <div
          className="k-money font-semibold"
          style={{
            fontSize: 'clamp(36px, 5vw, 52px)',
            color: 'var(--fg-1)',
            lineHeight: 1.05,
          }}
        >
          R$ 4.925,<span style={{ color: 'var(--fg-3)' }}>00</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span
            className="inline-block rounded-full"
            style={{
              width: 7,
              height: 7,
              background: 'var(--kiro-green)',
              boxShadow: '0 0 8px rgba(0,255,135,0.7)',
            }}
          />
          <span className="text-[12px] text-[var(--fg-3)] font-sans">
            Atualizado agora há poucos segundos
          </span>
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="mt-6 w-full font-display font-medium rounded-[var(--radius-md)] cursor-default"
          style={{
            background: 'var(--kiro-green)',
            color: 'var(--fg-on-green)',
            padding: '14px 20px',
            fontSize: 14,
            boxShadow: 'var(--shadow-glow-green)',
          }}
        >
          Receber via PIX agora →
        </button>

        {/* Mini transactions row */}
        <div
          className="mt-5 pt-5 border-t flex flex-col gap-3"
          style={{ borderColor: 'var(--stroke-1)' }}
        >
          {[
            { label: 'PIX recebido', value: 'R$ 259,90' },
            { label: 'PIX recebido', value: 'R$ 189,00' },
            { label: 'Rendimento (mês)', value: 'R$ 14,72' },
          ].map((row) => (
            <div key={row.label + row.value} className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--fg-3)] font-sans">{row.label}</span>
              <span className="k-money text-[13px] font-medium" style={{ color: 'var(--fg-1)' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
