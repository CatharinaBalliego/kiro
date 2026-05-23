import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Fingerprint,
  KeyRound,
  Loader2,
  LogOut,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { truncateKey } from '@/lib/stellar';

/** Reads `window.isSecureContext` for HTTPS / localhost checks. False on bare-IP HTTP. */
function isInsecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === false;
}

function primarySubtitle(opts: {
  passkeySupported: boolean;
  hasPasskeyWallet: boolean;
}): string {
  if (isInsecureContext()) {
    return 'Passkeys requerem HTTPS — use localhost ou kiropay.netlify.app';
  }
  if (!opts.passkeySupported) {
    return 'Não suportado neste navegador';
  }
  return opts.hasPasskeyWallet
    ? 'Use a passkey deste dispositivo'
    : 'Biometria, sem seedphrase';
}

/**
 * Desktop variant — full pill when connected, primary "Entrar / Criar conta"
 * with a chevron dropdown for the forget option when not.
 */
export function WalletButton() {
  const {
    isConnected,
    publicKey,
    isLoading,
    hasPasskeyWallet,
    passkeySupported,
    connect,
    disconnect,
    forgetPasskeyAccount,
    recover,
  } = useWallet();
  const profile = useUserProfile();

  const [menuOpen, setMenuOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function handlePrimary() {
    setErrorMsg(null);
    setMenuOpen(false);
    try {
      await connect(profile.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao autenticar.';
      setErrorMsg(msg);
      console.error('[WalletButton] passkey flow failed:', err);
    }
  }

  async function handleRecover() {
    setErrorMsg(null);
    setMenuOpen(false);
    try {
      await recover();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao recuperar conta.';
      setErrorMsg(msg);
    }
  }

  function handleForget() {
    if (
      !confirm(
        'Esquecer esta conta passkey? Sem a sincronização do passkey você não conseguirá recuperar o acesso.',
      )
    ) {
      return;
    }
    setMenuOpen(false);
    forgetPasskeyAccount();
  }

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke-2)] bg-transparent px-3 py-[6px] text-[var(--fg-3)] font-sans text-[13px]">
        <Loader2 size={14} strokeWidth={1.8} className="animate-spin" />
        Conectando…
      </div>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--stroke-green)] bg-[var(--success-bg)]">
        <div className="inline-flex items-center gap-2 pl-3 pr-2 py-[6px] font-sans text-[13px] text-[var(--kiro-green)]">
          <Fingerprint size={13} strokeWidth={1.8} />
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

  const primaryLabel = hasPasskeyWallet ? 'Entrar' : 'Criar conta';
  const disabledPrimary = !passkeySupported || isInsecureContext();

  return (
    <div ref={wrapRef} className="relative">
      <div className="inline-flex items-stretch rounded-full border border-[var(--stroke-2)] bg-transparent hover:bg-white/[0.04] transition-colors">
        <button
          type="button"
          onClick={handlePrimary}
          disabled={disabledPrimary}
          title={disabledPrimary ? primarySubtitle({ passkeySupported, hasPasskeyWallet }) : undefined}
          className="inline-flex items-center gap-2 cursor-pointer text-[var(--fg-2)] hover:text-[var(--fg-1)] font-sans text-[13px] bg-transparent border-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ padding: '6px 12px 6px 12px' }}
        >
          <Fingerprint size={14} strokeWidth={1.6} />
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Mais opções"
          aria-expanded={menuOpen}
          className="inline-flex items-center justify-center cursor-pointer text-[var(--fg-3)] hover:text-[var(--fg-1)] bg-transparent border-none border-l border-l-[var(--stroke-2)]"
          style={{ padding: '0 10px' }}
        >
          <ChevronDown
            size={14}
            strokeWidth={1.8}
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
          />
        </button>
      </div>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 rounded-[var(--radius-md)] border overflow-hidden"
          style={{
            background: 'rgba(20, 22, 32, 0.97)',
            borderColor: 'var(--stroke-2)',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            boxShadow: 'var(--shadow-3)',
            width: 300,
            zIndex: 50,
          }}
        >
          <MenuItem
            icon={<Fingerprint size={16} strokeWidth={1.7} color="var(--kiro-green)" />}
            title={hasPasskeyWallet ? 'Entrar com Face ID' : 'Criar conta com Face ID'}
            subtitle={primarySubtitle({ passkeySupported, hasPasskeyWallet })}
            onClick={handlePrimary}
            disabled={disabledPrimary}
            primary
          />

          {!hasPasskeyWallet && (
            <>
              <div style={{ height: 1, background: 'var(--stroke-1)' }} />
              <MenuItem
                icon={<KeyRound size={15} strokeWidth={1.7} color="var(--fg-2)" />}
                title="Recuperar acesso"
                subtitle="Use sua passkey sincronizada para restaurar a conta em novo dispositivo"
                onClick={handleRecover}
                disabled={disabledPrimary}
              />
            </>
          )}

          {hasPasskeyWallet && (
            <>
              <div style={{ height: 1, background: 'var(--stroke-1)' }} />
              <MenuItem
                icon={<Trash2 size={15} strokeWidth={1.7} color="var(--danger)" />}
                title="Esquecer conta passkey"
                subtitle="Remove o blob local — passkey do OS continua"
                onClick={handleForget}
                danger
              />
            </>
          )}
        </div>
      )}

      {errorMsg && (
        <div
          className="absolute right-0 top-full mt-2 rounded-[var(--radius-sm)] border font-sans text-[12px] max-w-[320px]"
          style={{
            background: 'rgba(255,77,109,0.10)',
            borderColor: 'rgba(255,77,109,0.30)',
            color: '#FF8FA3',
            padding: '8px 12px',
            zIndex: 50,
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
  primary,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-3 text-left bg-transparent border-none cursor-pointer hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={{ padding: '12px 14px' }}
    >
      <span
        className="inline-flex items-center justify-center rounded-[8px] flex-shrink-0 mt-[2px]"
        style={{
          width: 32,
          height: 32,
          background: primary
            ? 'rgba(0,255,135,0.10)'
            : danger
            ? 'rgba(255,77,109,0.10)'
            : 'rgba(255,255,255,0.05)',
          border: primary
            ? '1px solid var(--stroke-green)'
            : danger
            ? '1px solid rgba(255,77,109,0.30)'
            : '1px solid var(--stroke-2)',
        }}
      >
        {icon}
      </span>
      <div className="flex flex-col min-w-0">
        <span
          className="font-sans text-[13.5px] font-medium"
          style={{ color: danger ? 'var(--danger)' : 'var(--fg-1)' }}
        >
          {title}
        </span>
        <span className="font-sans text-[11.5px] text-[var(--fg-3)] mt-[1px] leading-snug">
          {subtitle}
        </span>
      </div>
    </button>
  );
}

/**
 * Compact variant for the mobile header — icon-only that opens a bottom
 * sheet with the passkey actions. The sheet is rendered via `createPortal`
 * to escape the header's `backdrop-filter` containing block (otherwise
 * `position: fixed` anchors to the header's 64px box instead of the viewport).
 */
export function WalletButtonMobile() {
  const {
    isConnected,
    isLoading,
    hasPasskeyWallet,
    passkeySupported,
    connect,
    disconnect,
    forgetPasskeyAccount,
    recover,
  } = useWallet();
  const profile = useUserProfile();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  async function handlePrimary() {
    setErrorMsg(null);
    setSheetOpen(false);
    try {
      await connect(profile.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao autenticar.';
      setErrorMsg(msg);
      setSheetOpen(true);
      console.error('[WalletButtonMobile] passkey flow failed:', err);
    }
  }

  async function handleRecover() {
    setErrorMsg(null);
    setSheetOpen(false);
    try {
      await recover();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao recuperar conta.';
      setErrorMsg(msg);
      setSheetOpen(true);
    }
  }

  function handleForget() {
    if (
      !confirm(
        'Esquecer esta conta passkey? Sem a sincronização do passkey você não conseguirá recuperar o acesso.',
      )
    ) {
      return;
    }
    setSheetOpen(false);
    forgetPasskeyAccount();
  }

  if (isLoading) {
    return (
      <div className="inline-flex items-center justify-center" style={{ width: 44, height: 44 }}>
        <Loader2 size={20} strokeWidth={1.6} className="animate-spin text-[var(--fg-3)]" />
      </div>
    );
  }

  const Icon = isConnected ? Fingerprint : Wallet;
  const disabledPrimary = !passkeySupported || isInsecureContext();

  return (
    <>
      <button
        type="button"
        onClick={isConnected ? disconnect : () => setSheetOpen(true)}
        aria-label={isConnected ? 'Desconectar carteira' : 'Conectar carteira'}
        className="relative inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer transition-colors hover:bg-white/[0.04]"
        style={{ width: 44, height: 44, color: isConnected ? 'var(--kiro-green)' : 'var(--fg-2)' }}
      >
        <Icon size={22} strokeWidth={1.6} />
      </button>

      {sheetOpen && createPortal(
        <div
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 z-[100] flex items-end"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full border-t"
            style={{
              background: 'rgba(20, 22, 32, 0.97)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              borderColor: 'var(--stroke-2)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              padding: '18px 12px calc(24px + env(safe-area-inset-bottom))',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-3)',
            }}
          >
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-display text-[16px] font-semibold text-[var(--fg-1)] m-0">
                Conectar
              </h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Fechar"
                className="bg-transparent border-none text-[var(--fg-3)] cursor-pointer"
                style={{ padding: 4 }}
              >
                <X size={20} strokeWidth={1.6} />
              </button>
            </div>

            <div className="flex flex-col">
              <MenuItem
                icon={<Fingerprint size={16} strokeWidth={1.7} color="var(--kiro-green)" />}
                title={hasPasskeyWallet ? 'Entrar com Face ID' : 'Criar conta com Face ID'}
                subtitle={primarySubtitle({ passkeySupported, hasPasskeyWallet })}
                onClick={handlePrimary}
                disabled={disabledPrimary}
                primary
              />

              {!hasPasskeyWallet && (
                <>
                  <div style={{ height: 1, background: 'var(--stroke-1)' }} />
                  <MenuItem
                    icon={<KeyRound size={15} strokeWidth={1.7} color="var(--fg-2)" />}
                    title="Recuperar acesso"
                    subtitle="Use sua passkey sincronizada para restaurar a conta em novo dispositivo"
                    onClick={handleRecover}
                    disabled={disabledPrimary}
                  />
                </>
              )}

              {hasPasskeyWallet && (
                <>
                  <div style={{ height: 1, background: 'var(--stroke-1)' }} />
                  <MenuItem
                    icon={<Trash2 size={15} strokeWidth={1.7} color="var(--danger)" />}
                    title="Esquecer conta passkey"
                    subtitle="Remove o blob local — passkey do OS continua"
                    onClick={handleForget}
                    danger
                  />
                </>
              )}
            </div>

            {errorMsg && (
              <div
                className="mt-3 mx-2 rounded-[var(--radius-sm)] border font-sans text-[12px]"
                style={{
                  background: 'rgba(255,77,109,0.10)',
                  borderColor: 'rgba(255,77,109,0.30)',
                  color: '#FF8FA3',
                  padding: '8px 12px',
                }}
              >
                {errorMsg}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
