import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getQuote } from '@/lib/anchors/etherfuse/client';
import { useDashboard } from './DashboardContext';

const RATE_KEY = 'kiro_brl_per_tesouro';
const CUSTOMER_KEY = 'kiro_ef_customer_id';
const POLL_MS = 5 * 60 * 1000;

interface QuoteState {
  /** Latest BRL value of 1 TESOURO. `null` until the first successful fetch. */
  brlPerTesouro: number | null;
  /** Format a TESOURO amount as the equivalent BRL string. Falls back to the raw value when the rate is unknown. */
  formatTesouroAsBRL: (tesouro: string | number) => string;
  /** Convert a BRL amount to TESOURO. Returns null when the rate is unknown. */
  brlToTesouro: (brl: number) => number | null;
  refresh: () => Promise<void>;
}

const QuoteContext = createContext<QuoteState | null>(null);

function formatBRLNumber(num: number): string {
  if (isNaN(num)) return 'R$ 0,00';
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function QuoteProvider({ children }: { children: ReactNode }) {
  const { refreshTick } = useDashboard();
  const [brlPerTesouro, setRate] = useState<number | null>(() => {
    const stored = localStorage.getItem(RATE_KEY);
    if (!stored) return null;
    const n = parseFloat(stored);
    return isNaN(n) || n <= 0 ? null : n;
  });

  const fetchRate = useCallback(async () => {
    const customerId = localStorage.getItem(CUSTOMER_KEY);
    if (!customerId) return;
    try {
      // Off-ramp quote for 1 TESOURO; exchangeRate comes back as BRL per TESOURO.
      const q = await getQuote(customerId, '1');
      const rate = parseFloat(q.exchangeRate);
      if (!rate || rate <= 0) return;
      setRate(rate);
      localStorage.setItem(RATE_KEY, String(rate));
    } catch {
      /* keep last-known rate */
    }
  }, []);

  useEffect(() => {
    fetchRate();
    const id = setInterval(fetchRate, POLL_MS);
    return () => clearInterval(id);
  }, [fetchRate]);

  useEffect(() => {
    if (refreshTick > 0) fetchRate();
  }, [refreshTick, fetchRate]);

  const formatTesouroAsBRL = useCallback(
    (tesouro: string | number) => {
      const t = typeof tesouro === 'string' ? parseFloat(tesouro) : tesouro;
      if (isNaN(t)) return 'R$ 0,00';
      const brl = brlPerTesouro != null ? t * brlPerTesouro : t;
      return formatBRLNumber(brl);
    },
    [brlPerTesouro],
  );

  const brlToTesouro = useCallback(
    (brl: number) => {
      if (brlPerTesouro == null || brlPerTesouro <= 0) return null;
      return brl / brlPerTesouro;
    },
    [brlPerTesouro],
  );

  return (
    <QuoteContext.Provider
      value={{ brlPerTesouro, formatTesouroAsBRL, brlToTesouro, refresh: fetchRate }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote(): QuoteState {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error('useQuote must be used inside <QuoteProvider>');
  return ctx;
}
