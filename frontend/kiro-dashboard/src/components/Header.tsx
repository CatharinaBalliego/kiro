import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, ChevronDown } from 'lucide-react';
import { TopTabs } from './TopTabs';
import { IconButton } from './IconButton';
import { NotificationsPopover } from './NotificationsPopover';
import { WalletButton } from './WalletButton';
import { useUserProfile } from '@/context/UserProfileContext';
import { useNotifications } from '@/context/NotificationsContext';

/** Top app header: tabs left, notifs / help / user-chip right. */
export function Header() {
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <header
      className="flex items-center justify-between border-b border-[var(--stroke-1)] bg-[var(--bg-0)] flex-shrink-0 relative"
      style={{ height: 64, padding: '0 28px' }}
    >
      <TopTabs />

      <div className="flex items-center gap-[10px]">
        <WalletButton />
        <IconButton
          icon={Bell}
          badge={unreadCount > 0}
          active={notifOpen}
          onClick={() => setNotifOpen((o) => !o)}
          title="Notificações"
        />
        <IconButton icon={HelpCircle} title="Ajuda" />
        <UserChip />
      </div>

      {notifOpen && <NotificationsPopover onClose={() => setNotifOpen(false)} />}
    </header>
  );
}

function UserChip() {
  const { name, role, initials, photoUrl } = useUserProfile();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/config')}
      aria-label="Abrir configurações"
      className="inline-flex items-center gap-[10px] rounded-full border border-[var(--stroke-2)] bg-transparent hover:bg-white/[0.04] cursor-pointer text-[var(--fg-1)] font-sans text-[13px]"
      style={{ padding: '6px 10px 6px 6px' }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full font-display font-semibold text-[12px] text-white overflow-hidden"
        style={{
          width: 30,
          height: 30,
          background: photoUrl ? 'var(--bg-3)' : 'linear-gradient(135deg, #9D4EDD, #7B2CBF)',
          letterSpacing: '0.04em',
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </span>
      <span className="flex flex-col items-start leading-[1.15]">
        <span className="font-medium">{name}</span>
        <span className="text-[11px] text-[var(--fg-3)]">{role}</span>
      </span>
      <ChevronDown size={14} color="var(--fg-3)" strokeWidth={1.6} />
    </button>
  );
}
