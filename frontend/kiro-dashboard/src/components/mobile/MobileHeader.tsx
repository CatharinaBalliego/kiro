import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings } from 'lucide-react';
import { NotificationsPopover } from '../NotificationsPopover';
import { WalletButtonMobile } from '../WalletButton';
import { useUserProfile } from '@/context/UserProfileContext';
import { useWallet } from '@/context/WalletContext';
import { useNotifications } from '@/context/NotificationsContext';

/**
 * Sticky top bar for the mobile shell.
 *
 * When disconnected, hides the user profile / settings / bell and exposes only
 * the wallet connect CTA — nothing that would imply an authenticated session.
 */
export function MobileHeader() {
  const [notifOpen, setNotifOpen] = useState(false);
  const { name, initials, photoUrl } = useUserProfile();
  const { isConnected } = useWallet();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--stroke-1)] bg-[var(--bg-0)]/95 backdrop-blur-md flex-shrink-0"
      style={{ height: 64, padding: '0 16px' }}
    >
      {isConnected ? (
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-flex items-center justify-center rounded-full font-display font-semibold text-[13px] text-white flex-shrink-0 overflow-hidden"
            style={{
              width: 40,
              height: 40,
              background: photoUrl ? 'var(--bg-3)' : 'linear-gradient(135deg, #9D4EDD, #7B2CBF)',
              letterSpacing: '0.04em',
            }}
            aria-hidden="true"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[12px] text-[var(--fg-3)] font-sans">Olá,</span>
            <span className="text-[15px] text-[var(--fg-1)] font-display font-semibold truncate">
              {name}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[15px] text-[var(--fg-1)] font-display font-semibold">
            KIRO
          </span>
          <span className="text-[12px] text-[var(--fg-3)] font-sans">
            Conecte sua carteira
          </span>
        </div>
      )}

      <div className="flex items-center">
        <WalletButtonMobile />
        {isConnected && (
          <>
            <button
              type="button"
              onClick={() => navigate('/config')}
              aria-label="Configurações"
              className="inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--fg-1)] hover:bg-white/[0.04] transition-colors"
              style={{ width: 44, height: 44 }}
            >
              <Settings size={22} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notificações"
              aria-expanded={notifOpen}
              className="relative inline-flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--fg-1)] hover:bg-white/[0.04] transition-colors"
              style={{ width: 44, height: 44 }}
            >
              <Bell size={22} strokeWidth={1.6} />
              {unreadCount > 0 && (
                <span
                  className="absolute rounded-full bg-[var(--kiro-green)]"
                  style={{
                    top: 10,
                    right: 10,
                    width: 8,
                    height: 8,
                    boxShadow: '0 0 8px rgba(0,255,135,0.7)',
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          </>
        )}
      </div>

      {notifOpen && <NotificationsPopover onClose={() => setNotifOpen(false)} />}
    </header>
  );
}
