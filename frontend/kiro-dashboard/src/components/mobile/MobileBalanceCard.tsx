import { Eye, EyeOff, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { YIELD_APY_LABEL } from '@/lib/mocks';
import { useWallet } from '@/context/WalletContext';
import { useDashboard } from '@/context/DashboardContext';
import { useQuote } from '@/context/QuoteContext';

interface MobileBalanceCardProps {
  onReceive: () => void;
}

export function MobileBalanceCard({ onReceive }: MobileBalanceCardProps) {
  const { isConnected, balance } = useWallet();
  const { valuesHidden, toggleValuesHidden, refresh, isRefreshing } = useDashboard();
  const { formatTesouroAsBRL } = useQuote();

  const displayBalance =
    isConnected && balance !== null ? formatTesouroAsBRL(balance) : 'R$ 0,00';
  const isBlurred = !isConnected || valuesHidden;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="k-eyebrow">Saldo Disponível</span>
        {isConnected ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={refresh}
              disabled={isRefreshing}
              aria-label="Atualizar dados"
              className="inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-white/[0.04] transition-colors disabled:opacity-50"
              style={{ width: 36, height: 36 }}
            >
              <RefreshCw size={17} strokeWidth={1.8} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={toggleValuesHidden}
              aria-label={valuesHidden ? 'Mostrar saldo' : 'Ocultar saldo'}
              aria-pressed={valuesHidden}
              className="inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-white/[0.04] transition-colors"
              style={{ width: 36, height: 36 }}
            >
              {valuesHidden ? <EyeOff size={18} strokeWidth={1.6} /> : <Eye size={18} strokeWidth={1.6} />}
            </button>
          </div>
        ) : (
          <div
            className="inline-flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: 'rgba(0,255,135,0.10)',
              border: '1px solid rgba(0,255,135,0.22)',
              color: 'var(--kiro-green)',
            }}
            aria-hidden="true"
          >
            <Wallet size={17} strokeWidth={1.6} />
          </div>
        )}
      </div>

      <div
        className="k-money font-medium"
        style={{
          fontSize: 38,
          lineHeight: 1.1,
          color: 'var(--kiro-green)',
          textShadow: '0 0 24px rgba(0,255,135,0.28)',
          letterSpacing: '-0.01em',
          filter: isBlurred ? 'blur(12px)' : 'none',
          transition: 'filter 200ms ease-out',
          userSelect: isBlurred ? 'none' : 'auto',
        }}
      >
        {displayBalance}
      </div>

      <div
        className="inline-flex items-center gap-[6px] mt-3 rounded-full font-sans text-[12px] text-[var(--kiro-green)]"
        style={{
          padding: '5px 10px',
          background: 'rgba(0,255,135,0.10)',
          border: '1px solid rgba(0,255,135,0.22)',
        }}
      >
        <Sparkles size={13} strokeWidth={1.8} />
        Rendendo {YIELD_APY_LABEL}
      </div>

      <div className="mt-5">
        <Button variant="secondary" size="lg" onClick={onReceive} className="w-full justify-center">
          Sacar PIX
        </Button>
      </div>
    </Card>
  );
}
