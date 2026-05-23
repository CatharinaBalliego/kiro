import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Plus, Search, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChip } from '@/components/FilterChip';
import { StatusTag } from '@/components/StatusTag';
import { useWallet } from '@/context/WalletContext';
import { fetchTesouroPayments, type WalletPayment } from '@/lib/stellar';

type FilterKey = 'todos' | 'recebidos' | 'saques';

interface TransacoesProps {
  /** Opens the on-ramp modal. Optional because only mobile renders the trigger. */
  onReceive?: () => void;
}

/** Full filterable list of every TESOURO movement on the connected wallet. */
export default function Transacoes({ onReceive }: TransacoesProps) {
  const { publicKey, balance, isConnected } = useWallet();
  // `null` = haven't fetched yet (show skeleton). `[]` = fetched but empty.
  const [payments, setPayments] = useState<WalletPayment[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!publicKey) {
      setPayments(null);
      return;
    }
    let cancelled = false;
    fetchTesouroPayments(publicKey, 100).then((p) => {
      if (!cancelled) setPayments(p);
    });
    return () => { cancelled = true; };
  }, [publicKey, balance]);

  const filtered = useMemo(() => {
    if (!payments) return [];
    const needle = q.trim().toLowerCase();
    return payments.filter((p) => {
      if (filter === 'recebidos' && p.direction !== 'in') return false;
      if (filter === 'saques' && p.direction !== 'out') return false;
      if (!needle) return true;
      const label = p.direction === 'out' ? 'saque via pix' : 'pagamento recebido';
      return (
        label.includes(needle) ||
        p.amountBRL.toLowerCase().includes(needle) ||
        p.when.toLowerCase().includes(needle)
      );
    });
  }, [payments, filter, q]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end justify-between flex-wrap gap-[14px]">
        <div>
          <h1 className="k-h1">Transações</h1>
          <div className="text-[13px] text-[var(--fg-3)] mt-1">
            Todas as movimentações da sua carteira KIRO.
          </div>
        </div>
        <div className="flex gap-[10px]">
          {/* Desktop-only utility buttons — chips below already cover filtering and CSV is not useful on a phone. */}
          <Button variant="secondary" size="sm" icon={Filter} className="hidden md:inline-flex">
            Filtros
          </Button>
          <Button variant="secondary" size="sm" icon={Download} className="hidden md:inline-flex">
            Exportar CSV
          </Button>
          {/* Mobile-only: desktop users already have the trigger on /recebimentos. */}
          {onReceive && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={onReceive}
              className="md:hidden"
            >
              Novo recebimento
            </Button>
          )}
        </div>
      </div>

      <Card glass={false} className="!p-[18px] flex flex-col gap-[14px]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[280px] max-w-[380px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]">
              <Search size={16} strokeWidth={1.6} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por descrição, valor ou data"
              className="w-full border outline-none rounded-[var(--radius-md)] font-sans text-[13px]"
              style={{
                padding: '10px 12px 10px 38px',
                background: 'var(--bg-3)',
                borderColor: 'var(--stroke-3)',
                color: 'var(--fg-1)',
              }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <FilterChip active={filter === 'todos'} onClick={() => setFilter('todos')}>
              Todos
            </FilterChip>
            <FilterChip active={filter === 'recebidos'} onClick={() => setFilter('recebidos')}>
              Recebidos
            </FilterChip>
            <FilterChip active={filter === 'saques'} onClick={() => setFilter('saques')}>
              Saques
            </FilterChip>
          </div>
        </div>

        <div
          className="hidden md:grid border-b border-[var(--stroke-1)] font-display text-[11px] text-[var(--fg-3)] uppercase"
          style={{
            gridTemplateColumns: '36px 1fr auto 110px 110px',
            gap: 16,
            padding: '8px 12px',
            letterSpacing: '0.10em',
          }}
        >
          <div></div>
          <div>Descrição</div>
          <div className="text-right">Valor</div>
          <div>Status</div>
          <div className="text-right">Data</div>
        </div>

        {!isConnected && (
          <EmptyState message="Conecte sua carteira para ver suas movimentações." />
        )}
        {isConnected && payments === null && <SkeletonList />}
        {isConnected && payments && filtered.length === 0 && (
          <EmptyState
            message={
              payments.length === 0
                ? 'Nenhuma movimentação registrada ainda.'
                : 'Nenhuma transação encontrada com esses filtros.'
            }
          />
        )}
        {filtered.length > 0 && (
          <div className="flex flex-col gap-[2px]">
            {filtered.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PaymentRow({ payment }: { payment: WalletPayment }) {
  const isOut = payment.direction === 'out';
  const Icon = isOut ? ArrowUpRight : ShoppingBag;
  const label = isOut ? 'Saque via PIX' : 'Pagamento recebido';
  const amountColor = isOut ? '#FF4D6D' : 'var(--kiro-green)';
  const amountText = `${isOut ? '− ' : '+ '}${payment.amountBRL}`;

  return (
    <>
      {/* Mobile: icon | label + date stacked | amount + status stacked. */}
      <div
        className="md:hidden grid items-center cursor-pointer rounded-[12px] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-white/[0.03]"
        style={{
          gridTemplateColumns: '36px minmax(0, 1fr) auto',
          gap: 12,
          padding: '12px 10px',
        }}
      >
        <div
          className="flex items-center justify-center rounded-[10px]"
          style={{
            width: 36,
            height: 36,
            background: isOut ? 'rgba(123,44,191,0.16)' : 'rgba(0,255,135,0.10)',
            color: isOut ? '#C99EFA' : 'var(--kiro-green)',
          }}
        >
          <Icon size={18} strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] text-[var(--fg-1)] font-medium truncate">{label}</div>
          <div className="k-money text-[11px] text-[var(--fg-3)] mt-[2px]">{payment.when}</div>
        </div>
        <div className="flex flex-col items-end gap-[6px]">
          <span
            className="k-money text-[14px] whitespace-nowrap"
            style={{ color: amountColor }}
          >
            {amountText}
          </span>
          <StatusTag status="success">Concluído</StatusTag>
        </div>
      </div>

      {/* Desktop: original 5-column grid. */}
      <div
        className="hidden md:grid items-center cursor-pointer rounded-[12px] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-white/[0.03]"
        style={{
          gridTemplateColumns: '36px 1fr auto 110px 110px',
          gap: 16,
          padding: '14px 12px',
        }}
      >
        <div
          className="flex items-center justify-center rounded-[10px]"
          style={{
            width: 36,
            height: 36,
            background: isOut ? 'rgba(123,44,191,0.16)' : 'rgba(0,255,135,0.10)',
            color: isOut ? '#C99EFA' : 'var(--kiro-green)',
          }}
        >
          <Icon size={18} strokeWidth={1.6} />
        </div>
        <div className="text-[14px] text-[var(--fg-1)] font-medium">{label}</div>
        <div
          className="k-money text-[14px] text-right whitespace-nowrap"
          style={{ color: amountColor }}
        >
          {amountText}
        </div>
        <div>
          <StatusTag status="success">Concluído</StatusTag>
        </div>
        <div className="k-money text-[11px] text-[var(--fg-3)] text-right">{payment.when}</div>
      </div>
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="text-center text-[var(--fg-3)] text-[13px]"
      style={{ padding: 60 }}
    >
      {message}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid items-center rounded-[12px]"
          style={{
            gridTemplateColumns: '36px minmax(0,1fr) auto',
            gap: 12,
            padding: '14px 10px',
          }}
        >
          <div
            className="rounded-[10px] animate-pulse"
            style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.04)' }}
          />
          <div
            className="rounded animate-pulse"
            style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.04)' }}
          />
          <div
            className="rounded animate-pulse justify-self-end"
            style={{ height: 14, width: 90, background: 'rgba(255,255,255,0.04)' }}
          />
        </div>
      ))}
    </div>
  );
}
