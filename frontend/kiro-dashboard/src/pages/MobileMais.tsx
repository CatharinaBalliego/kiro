import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { usePrivy } from '@privy-io/react-auth';
import { Card } from '@/components/Card';
import { FeeInfoModal } from '@/components/FeeInfoModal';
import { YieldCard } from '@/components/YieldCard';
import { useWallet } from '@/context/WalletContext';
import { useTransactions } from '@/context/TransactionsContext';
import { getTotalFees } from '@/lib/api/transactions';

interface DayEntry {
  label: string;
  received: number;
  withdrawn: number;
}

function buildChartData(payments: { direction: string; brlCentavos: number; createdAt: string }[]): DayEntry[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const dayKey = d.toDateString();
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const dayPayments = payments.filter((p) => new Date(p.createdAt).toDateString() === dayKey);
    const received = dayPayments
      .filter((p) => p.direction === 'in')
      .reduce((sum, p) => sum + p.brlCentavos / 100, 0);
    const withdrawn = dayPayments
      .filter((p) => p.direction === 'out')
      .reduce((sum, p) => sum + p.brlCentavos / 100, 0);
    return { label, received, withdrawn };
  });
}

function fmtBRL(value: number) {
  return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ChartTooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[10px] border font-sans text-[12px]"
      style={{ background: 'var(--bg-2)', borderColor: 'var(--stroke-2)', padding: '10px 14px', minWidth: 140 }}
    >
      <div className="font-semibold text-[var(--fg-2)] mb-2">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="k-money" style={{ color: entry.color }}>{fmtBRL(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MobileMais() {
  const { isConnected } = useWallet();
  const { payments } = useTransactions();
  const { getAccessToken } = usePrivy();
  const [feeInfoOpen, setFeeInfoOpen] = useState(false);
  const [totalFeesCentavos, setTotalFeesCentavos] = useState<number | null>(null);

  const chartData = useMemo(
    () => buildChartData(isConnected ? payments : []),
    [payments, isConnected],
  );

  const todayKey = new Date().toDateString();
  const todayPayments = isConnected ? payments.filter((p) => new Date(p.createdAt).toDateString() === todayKey) : [];
  const todayIn = todayPayments.filter((p) => p.direction === 'in').reduce((s, p) => s + p.brlCentavos / 100, 0);
  const todayOut = todayPayments.filter((p) => p.direction === 'out').reduce((s, p) => s + p.brlCentavos / 100, 0);

  // Re-fetch whenever transactions list updates so the running total stays in
  // sync without summing on the client (server already aggregates with SUM).
  useEffect(() => {
    if (!isConnected) { setTotalFeesCentavos(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const total = await getTotalFees(token);
        if (!cancelled) setTotalFeesCentavos(total);
      } catch (err) {
        console.warn('[MobileMais] getTotalFees failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, getAccessToken, payments.length]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="k-h1">Movimentações</h1>
        <div className="text-[13px] text-[var(--fg-3)] mt-1">Últimos 7 dias</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-[11px] text-[var(--fg-3)] font-sans uppercase tracking-wider mb-1">Recebido hoje</div>
          <div className="k-money text-[18px] font-semibold" style={{ color: 'var(--kiro-green)' }}>
            {isConnected ? fmtBRL(todayIn) : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] text-[var(--fg-3)] font-sans uppercase tracking-wider mb-1">Sacado hoje</div>
          <div className="k-money text-[18px] font-semibold" style={{ color: '#C99EFA' }}>
            {isConnected ? fmtBRL(todayOut) : '—'}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-stretch">
        <YieldCard />

        <Card>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-[11px] text-[var(--fg-3)] font-sans uppercase tracking-wider">Taxas pagas</div>
            <button
              type="button"
              onClick={() => setFeeInfoOpen(true)}
              className="flex items-center justify-center cursor-pointer"
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--fg-3)' }}
              aria-label="Sobre as taxas"
            >
              <Info size={14} strokeWidth={1.8} />
            </button>
          </div>
          <div className="k-money text-[18px] font-semibold text-[var(--fg-1)]">
            {isConnected && totalFeesCentavos != null ? fmtBRL(totalFeesCentavos / 100) : '—'}
          </div>
          <div className="text-[11px] text-[var(--fg-3)] mt-1">Total acumulado desde o início</div>
        </Card>
      </div>

      <Card>
        <div className="font-display text-[14px] font-semibold text-[var(--fg-1)] mb-4">
          Volume diário
        </div>

        {!isConnected && (
          <div className="text-center text-[var(--fg-3)] text-[13px]" style={{ padding: '40px 0' }}>
            Entre na sua conta para ver suas movimentações.
          </div>
        )}

        {isConnected && (
          <>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={3}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--fg-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="received" name="Recebido" fill="#00FF87" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="withdrawn" name="Sacado" fill="#C99EFA" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <span className="inline-flex items-center gap-[6px] font-sans text-[11px] text-[var(--fg-3)]">
                <span className="rounded-full" style={{ width: 8, height: 8, background: '#00FF87' }} />
                Recebido
              </span>
              <span className="inline-flex items-center gap-[6px] font-sans text-[11px] text-[var(--fg-3)]">
                <span className="rounded-full" style={{ width: 8, height: 8, background: '#C99EFA' }} />
                Sacado
              </span>
            </div>
          </>
        )}
      </Card>

      <FeeInfoModal open={feeInfoOpen} onClose={() => setFeeInfoOpen(false)} />
    </div>
  );
}
