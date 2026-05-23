import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useWallet } from './WalletContext';
import { useDashboard } from './DashboardContext';
import { fetchTesouroPayments, type WalletPayment } from '@/lib/stellar';

const SEEN_KEY = 'kiro_notifications_last_seen';
const POLL_MS = 30_000;

export interface Notification {
  id: string;
  direction: 'in' | 'out';
  title: string;
  ago: string;
  createdAt: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  /** Mark every current notification as seen (called when the popover opens). */
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

function buildTitle(p: WalletPayment): string {
  if (p.direction === 'in') return `Você recebeu ${p.amountBRL} via PIX`;
  return `Saque de ${p.amountBRL} concluído`;
}

/**
 * Builds the notifications feed from on-chain TESOURO movements.
 * Only meaningful when a wallet is connected; otherwise the feed is empty
 * so the bell stays quiet on the unauthenticated landing.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { publicKey, balance } = useWallet();
  const { refreshTick } = useDashboard();
  const [payments, setPayments] = useState<WalletPayment[]>([]);
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(SEEN_KEY) ?? '',
  );

  const fetchOnce = useCallback(async () => {
    if (!publicKey) {
      setPayments([]);
      return;
    }
    const p = await fetchTesouroPayments(publicKey, 20);
    setPayments(p);
  }, [publicKey]);

  useEffect(() => {
    fetchOnce();
    if (!publicKey) return;
    const id = setInterval(fetchOnce, POLL_MS);
    return () => clearInterval(id);
    // balance/refreshTick trigger a re-fetch when an on/off-ramp completes.
  }, [publicKey, fetchOnce, balance, refreshTick]);

  const notifications = useMemo<Notification[]>(
    () =>
      payments.map((p) => ({
        id: p.id,
        direction: p.direction,
        title: buildTitle(p),
        ago: p.when,
        createdAt: p.createdAt,
      })),
    [payments],
  );

  const unreadCount = useMemo(() => {
    if (!notifications.length) return 0;
    if (!lastSeen) return notifications.length;
    return notifications.filter((n) => n.createdAt > lastSeen).length;
  }, [notifications, lastSeen]);

  const markAllRead = useCallback(() => {
    if (!notifications.length) return;
    const newest = notifications[0].createdAt;
    setLastSeen(newest);
    localStorage.setItem(SEEN_KEY, newest);
  }, [notifications]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
