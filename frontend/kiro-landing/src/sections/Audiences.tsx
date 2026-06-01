import { Smartphone, TrendingUp, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Audiences() {
  return (
    <section
      id="audiencias"
      className="relative z-10 max-w-[1180px] mx-auto px-5 md:px-8 py-16 md:py-24"
    >
      <SectionHeader
        eyebrow="Pra que serve"
        title={
          <>
            Tudo que sua conta <span className="k-gradient-text">precisa fazer</span>.
          </>
        }
        subtitle="O Kiro é a conta do seu negócio. Recebe seus clientes por PIX, faz o dinheiro parado render todo dia, e saca pelo PIX a qualquer hora."
      />

      <div className="grid md:grid-cols-3 gap-5 md:gap-6 mt-12">
        <BenefitCard
          Icon={Smartphone}
          title="PIX direto na conta"
          body="Seu cliente paga, você recebe na hora. Taxa flat de 0,20% por PIX, sem maquininha pra alugar, sem mensalidade."
        />
        <BenefitCard
          Icon={TrendingUp}
          title="Dinheiro parado, dinheiro rendendo"
          body="Tudo que entrar começa a render todo dia útil, no mesmo ritmo do Tesouro Direto. Sem você precisar mexer."
        />
        <BenefitCard
          Icon={Clock}
          title="Saque a qualquer hora"
          body="Precisou pagar fornecedor no domingo de noite? Saca pelo PIX. Funciona 24 horas, todo dia."
        />
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center max-w-[640px] mx-auto">
      <span className="k-eyebrow">{eyebrow}</span>
      <h2
        className="k-display mt-3"
        style={{ fontSize: 'clamp(30px, 4.4vw, 44px)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="font-sans text-[15px] md:text-[16px] text-[var(--fg-2)] leading-relaxed mt-4">
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface BenefitCardProps {
  Icon: LucideIcon;
  title: string;
  body: string;
}

function BenefitCard({ Icon, title, body }: BenefitCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-xl)] border p-7 md:p-8 flex flex-col gap-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        borderColor: 'var(--stroke-2)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
        style={{
          background: 'var(--gradient-glow-green)',
          opacity: 0.35,
        }}
      />

      <span
        className="inline-flex items-center justify-center rounded-[14px] relative"
        style={{
          width: 44,
          height: 44,
          background: 'rgba(0,255,135,0.10)',
          border: '1px solid var(--stroke-green)',
        }}
      >
        <Icon size={22} strokeWidth={1.6} color="var(--kiro-green)" />
      </span>

      <h3
        className="font-display font-semibold text-[var(--fg-1)] tracking-[-0.01em] relative md:min-h-[3.5rem]"
        style={{ fontSize: 'clamp(20px, 2.4vw, 22px)', lineHeight: 1.3 }}
      >
        {title}
      </h3>

      <p className="font-sans text-[14px] text-[var(--fg-2)] leading-relaxed relative">
        {body}
      </p>
    </div>
  );
}
