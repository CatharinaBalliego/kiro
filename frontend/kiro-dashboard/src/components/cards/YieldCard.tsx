import { Zap, ChevronRight, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardEyebrow } from '../Card';
import { StatusTag } from '../StatusTag';
import { YIELD } from '@/lib/mocks';
import { useDashboard } from '@/context/DashboardContext';

/**
 * "Rendimento Acumulado" card. Big +R$ number, trend chip, area chart, and
 * a CDI-yield trust line at the bottom.
 *
 * Chart is Recharts (shadcn-style usage) themed entirely via inline SVG
 * colors that pull from the design-system tokens.
 */
export function YieldCard() {
  const { valuesHidden } = useDashboard();
  return (
    <Card className="min-h-[290px]">
      <div style={{ filter: 'blur(3.2px)' }}>
      <CardEyebrow info>Rendimento Acumulado</CardEyebrow>

      <div
        className="k-money font-medium"
        style={{
          fontSize: 38,
          color: 'var(--kiro-green)',
          letterSpacing: '-0.01em',
          filter: valuesHidden ? 'blur(12px)' : 'none',
          transition: 'filter 200ms ease-out',
          userSelect: valuesHidden ? 'none' : 'auto',
        }}
      >
        {YIELD.accumulated}
      </div>

      <div className="mt-[6px] flex items-center gap-2 font-sans text-[12px] text-[var(--fg-3)]">
        {YIELD.thisMonthLabel}
        <StatusTag status="success" withIcon={false}>
          <TrendingUp size={11} strokeWidth={2.4} />
          &nbsp;{YIELD.trendLabel}
        </StatusTag>
      </div>

      <div className="mt-[14px]" style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={YIELD.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="yieldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF87" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#00FF87" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="day" hide />
            <YAxis hide domain={[0, 110]} />
            <ReferenceLine y={0} stroke="transparent" />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00FF87"
              strokeWidth={1.8}
              fill="url(#yieldFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#00FF87', stroke: '#00FF87' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between k-money text-[10px] text-[var(--fg-3)] mt-[6px]">
        {YIELD.tick.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      <div
        className="mt-[18px] flex items-center gap-3 border rounded-[var(--radius-md)]"
        style={{
          padding: '12px 14px',
          borderColor: 'var(--stroke-2)',
          background: 'rgba(123,44,191,0.06)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-[8px]"
          style={{ width: 28, height: 28, background: 'rgba(123,44,191,0.20)' }}
        >
          <Zap size={14} color="#C99EFA" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium text-[var(--fg-1)]">
            Seu saldo rende automaticamente
          </div>
          <div className="k-money text-[11px] text-[var(--fg-3)] mt-[2px]">
            100% do CDI para contas KIRO
          </div>
        </div>
        <ChevronRight size={16} color="var(--fg-3)" strokeWidth={1.6} />
      </div>
      </div>
    </Card>
  );
}
