import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { truncateKey } from '@/lib/stellar';

/**
 * Desktop variant — full pill with address + XLM balance.
 * Used in the top Header alongside the user chip.
 */
export function WalletButton() {
  const { isConnected, publicKey, isLoading, connect, disconnect } = useWallet();

  if (isLoading) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke-2)] bg-transparent px-3 py-[6px] text-[var(--fg-3)] font-sans text-[13px]"
      >
        <Loader2 size={14} strokeWidth={1.8} className="animate-spin" />
        Conectando…
      </div>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--stroke-green)] bg-[var(--success-bg)]">
        <div
          className="inline-flex items-center gap-2 pl-3 pr-2 py-[6px] font-sans text-[13px] text-[var(--kiro-green)]"
        >
          <span
            className="rounded-full bg-[var(--kiro-green)]"
            style={{ width: 7, height: 7, boxShadow: '0 0 6px rgba(0,255,135,0.7)' }}
            aria-hidden="true"
          />
          <span className="font-mono tracking-tight">{truncateKey(publicKey)}</span>
        </div>
        <button
          type="button"
          onClick={disconnect}
          aria-label="Desconectar carteira"
          title="Desconectar"
          className="inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--fg-3)] hover:text-[var(--danger)] hover:bg-white/[0.04] transition-colors mr-1"
          style={{ width: 28, height: 28 }}
        >
          <LogOut size={13} strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke-2)] bg-transparent hover:bg-white/[0.04] cursor-pointer text-[var(--fg-2)] hover:text-[var(--fg-1)] font-sans text-[13px] transition-colors"
      style={{ padding: '6px 14px 6px 10px' }}
    >
      <Wallet size={14} strokeWidth={1.6} />
      Conectar Carteira
    </button>
  );
}

/**
 * Compact variant for the mobile header — icon-only when disconnected,
 * green dot when connected. Tapping always opens the modal / disconnects.
 */
export function WalletButtonMobile() {
  const { isConnected, isLoading, connect, disconnect } = useWallet();

  if (isLoading) {
    return (
      <div
        className="inline-flex items-center justify-center"
        style={{ width: 44, height: 44 }}
      >
        <Loader2 size={20} strokeWidth={1.6} className="animate-spin text-[var(--fg-3)]" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={isConnected ? disconnect : connect}
      aria-label={isConnected ? 'Desconectar carteira' : 'Conectar carteira'}
      className="relative inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer transition-colors hover:bg-white/[0.04]"
      style={{ width: 44, height: 44, color: isConnected ? 'var(--kiro-green)' : 'var(--fg-2)' }}
    >
      <Wallet size={22} strokeWidth={1.6} />
    </button>
  );
}
