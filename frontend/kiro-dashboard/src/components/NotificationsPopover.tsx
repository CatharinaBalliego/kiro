import { useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, BellOff } from 'lucide-react';
import { useNotifications, type Notification } from '@/context/NotificationsContext';

/** Notifications dropdown opened from the bell IconButton in the header. */
export function NotificationsPopover({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  // Opening the popover counts as "seeing" all current notifications.
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <div
      className="absolute z-50 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--stroke-2)]"
      style={{
        top: 58,
        right: 28,
        width: 340,
        background: 'rgba(20, 22, 32, 0.96)',
        backdropFilter: 'blur(20px) saturate(140%)',
        boxShadow: 'var(--shadow-3)',
      }}
    >
      <div
        className="flex justify-between items-center border-b border-[var(--stroke-1)]"
        style={{ padding: '14px 16px' }}
      >
        <span className="font-display font-semibold text-[14px] text-[var(--fg-1)]">
          Notificações
        </span>
        <span className="k-money text-[11px] text-[var(--fg-3)]">
          {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'nova' : 'novas'}` : 'Nenhuma nova'}
        </span>
      </div>

      {notifications.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 text-center text-[var(--fg-3)]"
          style={{ padding: '28px 16px' }}
        >
          <BellOff size={22} strokeWidth={1.5} />
          <span className="text-[13px]">Nenhuma notificação ainda.</span>
        </div>
      ) : (
        notifications.slice(0, 6).map((n) => <NotificationRow key={n.id} n={n} />)
      )}

      <div className="text-center" style={{ padding: '12px 16px' }}>
        <button
          type="button"
          onClick={onClose}
          className="font-display text-[12px] text-[var(--kiro-green)] bg-transparent border-none cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function NotificationRow({ n }: { n: Notification }) {
  const Icon = n.direction === 'in' ? ArrowDownLeft : ArrowUpRight;
  const color = n.direction === 'in' ? '#00FF87' : '#C99EFA';
  return (
    <div
      className="flex gap-3 items-start border-b border-[var(--stroke-1)]"
      style={{ padding: '12px 16px' }}
    >
      <div
        className="flex items-center justify-center rounded-[8px] flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          background:
            n.direction === 'in' ? 'rgba(0,255,135,0.10)' : 'rgba(123,44,191,0.16)',
        }}
      >
        <Icon size={16} color={color} strokeWidth={1.6} />
      </div>
      <div className="flex-1">
        <div className="text-[13px] text-[var(--fg-1)] leading-[1.35]">{n.title}</div>
        <div className="k-money text-[11px] text-[var(--fg-3)] mt-[2px]">{n.ago}</div>
      </div>
    </div>
  );
}
