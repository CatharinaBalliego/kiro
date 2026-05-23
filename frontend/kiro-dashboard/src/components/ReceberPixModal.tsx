import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { useWallet } from '@/context/WalletContext';
import { formatBRL } from '@/lib/stellar';
import {
  startOnboarding,
  getKycStatus,
  getBankAccounts,
  getOnRampQuote,
  createOnRampOrder,
  getOnRampOrder,
  type OnRampQuoteResult,
  type OnRampOrderResult,
} from '@/lib/anchors/etherfuse/client';

type Step =
  | 'loading'
  | 'no_wallet'
  | 'kyc'
  | 'kyc_review'
  | 'kyc_rejected'
  | 'amount'
  | 'confirm'
  | 'pix'
  | 'done'
  | 'error';

// Same localStorage keys as SacarPixModal — KYC + bank account are shared
// across on-ramp and off-ramp for the same wallet.
const CUSTOMER_KEY = 'kiro_ef_customer_id';
const BANK_ACCOUNT_KEY = 'kiro_ef_bank_account_id';

interface ReceberPixModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReceberPixModal({ open, onClose }: ReceberPixModalProps) {
  const { isConnected, publicKey, connect, refreshBalance } = useWallet();

  const [step, setStep] = useState<Step>('loading');
  const [kycUrl, setKycUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<OnRampQuoteResult | null>(null);
  const [order, setOrder] = useState<OnRampOrderResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const kycPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef(false);
  const customerIdRef = useRef('');
  const bankAccountIdRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const stopPolls = useCallback(() => {
    if (kycPollRef.current) { clearInterval(kycPollRef.current); kycPollRef.current = null; }
    if (orderPollRef.current) { clearInterval(orderPollRef.current); orderPollRef.current = null; }
  }, []);

  const startKycPolling = useCallback(
    (customerId: string, pubkey: string) => {
      stopPolls();
      kycPollRef.current = setInterval(async () => {
        try {
          const status = await getKycStatus(customerId, pubkey);
          if (status === 'approved') {
            stopPolls();
            setStep('amount');
          } else if (status === 'rejected') {
            stopPolls();
            setStep('kyc_rejected');
          }
        } catch { /* transient */ }
      }, 5000);
    },
    [stopPolls],
  );

  const startOrderPolling = useCallback(
    (orderId: string) => {
      stopPolls();
      orderPollRef.current = setInterval(async () => {
        try {
          const result = await getOnRampOrder(orderId);
          if (result.status === 'completed' || result.status === 'funded') {
            stopPolls();
            refreshBalance().catch(() => { /* silent */ });
            setStep('done');
          } else if (result.status === 'failed' || result.status === 'canceled') {
            stopPolls();
            setErrorMsg('A ordem foi cancelada ou falhou.');
            setStep('error');
          }
        } catch { /* transient */ }
      }, 5000);
    },
    [stopPolls, refreshBalance],
  );

  const startFlow = useCallback(
    async (pubkey: string) => {
      setStep('loading');
      cancelRef.current = false;
      stopPolls();

      let customerId = localStorage.getItem(CUSTOMER_KEY) ?? '';
      let bankAccId = localStorage.getItem(BANK_ACCOUNT_KEY) ?? '';

      try {
        if (customerId && bankAccId) {
          const kycStatus = await getKycStatus(customerId, pubkey);

          if (kycStatus === 'approved') {
            try {
              const accounts = await getBankAccounts(customerId);
              if (accounts.length > 0) {
                bankAccId = accounts[0].id;
                localStorage.setItem(BANK_ACCOUNT_KEY, bankAccId);
              }
            } catch { /* keep stored ID */ }
            customerIdRef.current = customerId;
            bankAccountIdRef.current = bankAccId;
            setStep('amount');
            return;
          }
          if (kycStatus === 'pending') {
            customerIdRef.current = customerId;
            bankAccountIdRef.current = bankAccId;
            setStep('kyc_review');
            startKycPolling(customerId, pubkey);
            return;
          }
          if (kycStatus === 'rejected') {
            setStep('kyc_rejected');
            return;
          }
        }

        if (!customerId) customerId = crypto.randomUUID();
        if (!bankAccId) bankAccId = crypto.randomUUID();

        const result = await startOnboarding(customerId, bankAccId, pubkey);
        customerId = result.customerId;
        bankAccId = result.bankAccountId;
        localStorage.setItem(CUSTOMER_KEY, customerId);
        localStorage.setItem(BANK_ACCOUNT_KEY, bankAccId);
        customerIdRef.current = customerId;
        bankAccountIdRef.current = bankAccId;

        const kycStatus = await getKycStatus(customerId, pubkey);
        if (kycStatus === 'approved') {
          try {
            const accounts = await getBankAccounts(customerId);
            if (accounts.length > 0) {
              bankAccountIdRef.current = accounts[0].id;
              localStorage.setItem(BANK_ACCOUNT_KEY, accounts[0].id);
            }
          } catch { /* keep */ }
          setStep('amount');
          return;
        }
        if (kycStatus === 'pending') {
          setStep('kyc_review');
          startKycPolling(customerId, pubkey);
          return;
        }
        if (kycStatus === 'rejected') {
          setStep('kyc_rejected');
          return;
        }

        setKycUrl(result.kycUrl);
        setStep('kyc');
        startKycPolling(customerId, pubkey);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao verificar identidade');
        setStep('error');
      }
    },
    [stopPolls, startKycPolling],
  );

  useEffect(() => {
    if (!open) {
      stopPolls();
      cancelRef.current = true;
      return;
    }
    setAmount('');
    setQuote(null);
    setOrder(null);
    setErrorMsg('');
    setCopied(false);

    if (!isConnected || !publicKey) {
      setStep('no_wallet');
      return;
    }
    startFlow(publicKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && isConnected && publicKey && step === 'no_wallet') {
      startFlow(publicKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, publicKey]);

  useEffect(() => () => stopPolls(), [stopPolls]);

  async function handleGetQuote() {
    const cents = parseInt(amount.replace(/\D/g, ''), 10);
    if (!publicKey || isNaN(cents) || cents <= 0) return;
    const num = cents / 100;

    setStep('loading');
    try {
      const q = await getOnRampQuote(customerIdRef.current, num.toFixed(2));
      setQuote(q);
      setStep('confirm');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao obter cotação');
      setStep('error');
    }
  }

  async function handleConfirm() {
    if (!quote || !publicKey) return;
    setStep('loading');
    try {
      const o = await createOnRampOrder(quote.quoteId, publicKey, bankAccountIdRef.current);
      setOrder(o);
      setStep('pix');
      startOrderPolling(o.orderId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar ordem');
      setStep('error');
    }
  }

  async function handleCopyPix() {
    if (!order?.depositPixCode) return;
    try {
      await navigator.clipboard.writeText(order.depositPixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function handleClose() {
    stopPolls();
    cancelRef.current = true;
    onClose();
  }

  if (!open) return null;

  // `amount` is stored as a digit-only string of cents (e.g. "10000" → R$ 100,00)
  // so the input always shows a valid BRL formatting and the user never has
  // to type the decimal separator.
  const amountCents = parseInt(amount.replace(/\D/g, ''), 10);
  const amountNum = isNaN(amountCents) ? 0 : amountCents / 100;
  const amountValid = amountNum > 0;
  const amountDisplay = amount
    ? amountNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-full rounded-[var(--radius-xl)] border border-[var(--stroke-2)] p-5 md:p-7"
        style={{
          background: 'rgba(20, 22, 32, 0.97)',
          backdropFilter: 'blur(24px) saturate(140%)',
          boxShadow: 'var(--shadow-3)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex justify-between items-center mb-[22px]">
          <h2 className="k-h2">Receber via PIX</h2>
          <button
            type="button"
            onClick={handleClose}
            className="bg-transparent border-none text-[var(--fg-3)] cursor-pointer"
            style={{ padding: 4 }}
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 size={32} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--kiro-green)' }} />
            <span className="text-[14px] text-[var(--fg-3)]">Carregando...</span>
          </div>
        )}

        {step === 'no_wallet' && (
          <div className="flex flex-col gap-5">
            <p className="text-[14px] text-[var(--fg-2)] leading-relaxed">
              Conecte sua carteira Stellar para receber via PIX.
            </p>
            <Button variant="primary" size="lg" onClick={connect} className="w-full justify-center">
              Conectar carteira
            </Button>
          </div>
        )}

        {step === 'kyc' && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-[var(--fg-2)] leading-relaxed">
              Complete o cadastro abaixo para receber via PIX.
            </p>
            <div
              className="rounded-[var(--radius-md)] overflow-hidden border border-[var(--stroke-3)]"
              style={{ height: 460 }}
            >
              <iframe
                src={kycUrl}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="Cadastro KYC"
              />
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--fg-3)]">
              <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
              Aguardando aprovação do cadastro...
            </div>
          </div>
        )}

        {step === 'kyc_review' && (
          <div className="flex flex-col items-center gap-5 py-10 text-center">
            <Loader2 size={36} strokeWidth={1.4} className="animate-spin" style={{ color: 'var(--kiro-green)' }} />
            <div>
              <p className="text-[15px] font-medium text-[var(--fg-1)] mb-1">Cadastro em análise</p>
              <p className="text-[13px] text-[var(--fg-3)] leading-relaxed">
                Seu cadastro está sendo revisado. Aguarde a aprovação para continuar.
              </p>
            </div>
          </div>
        )}

        {step === 'kyc_rejected' && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <AlertCircle size={40} strokeWidth={1.4} style={{ color: 'rgba(255,77,109,0.85)' }} />
            <div>
              <p className="text-[15px] font-medium text-[var(--fg-1)] mb-1">Cadastro recusado</p>
              <p className="text-[13px] text-[var(--fg-3)] leading-relaxed">
                Sua verificação foi recusada. Entre em contato com o suporte para mais informações.
              </p>
            </div>
            <Button variant="secondary" onClick={handleClose}>Fechar</Button>
          </div>
        )}

        {step === 'amount' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-[6px]">
              <label
                className="text-[11px] text-[var(--fg-3)] font-medium uppercase"
                style={{ letterSpacing: '0.04em' }}
              >
                Quanto deseja receber?
              </label>
              <div
                className="flex items-center gap-[10px] border rounded-[var(--radius-md)]"
                style={{ padding: '14px 16px', borderColor: 'var(--stroke-3)', background: 'var(--bg-3)' }}
              >
                <span className="k-money text-[18px] text-[var(--fg-3)]">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amountDisplay}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="0,00"
                  className="bg-transparent border-none outline-none flex-1 k-money font-medium"
                  style={{ fontSize: 28, color: 'var(--kiro-green)' }}
                  autoFocus
                />
              </div>
              <p className="text-[12px] text-[var(--fg-3)]">
                Você pagará via PIX e o equivalente em TESOURO chegará na sua carteira.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              iconRight={ChevronRight}
              onClick={handleGetQuote}
              disabled={!amountValid}
              className="w-full justify-center"
            >
              Ver cotação
            </Button>
          </div>
        )}

        {step === 'confirm' && quote && (
          <div className="flex flex-col gap-5">
            <div
              className="rounded-[var(--radius-md)] border border-[var(--stroke-3)] flex flex-col gap-3"
              style={{ padding: '18px 20px', background: 'var(--bg-3)' }}
            >
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--fg-3)]">Você paga via PIX</span>
                <span className="text-[15px] font-medium text-[var(--fg-1)]">
                  {formatBRL(quote.sourceAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--fg-3)]">Você recebe</span>
                <span className="text-[18px] font-semibold" style={{ color: 'var(--kiro-green)' }}>
                  {parseFloat(quote.destinationAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} TESOURO
                </span>
              </div>
              <div className="h-px" style={{ background: 'var(--stroke-3)' }} />
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-[var(--fg-3)]">Taxa</span>
                <span className="text-[12px] text-[var(--fg-2)]">
                  {parseFloat(quote.fee) > 0 ? formatBRL(quote.fee) : 'Sem taxa'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-[var(--fg-3)]">Câmbio</span>
                <span className="text-[12px] text-[var(--fg-2)]">
                  1 BRL ={' '}
                  {parseFloat(quote.exchangeRate).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{' '}
                  TESOURO
                </span>
              </div>
            </div>

            <p className="text-[12px] text-[var(--fg-3)] text-center leading-relaxed">
              Cotação válida por alguns minutos. O TESOURO chegará na sua carteira após a confirmação do PIX.
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                icon={ChevronLeft}
                onClick={() => setStep('amount')}
                className="flex-1 justify-center"
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                className="flex-1 justify-center"
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {step === 'pix' && order && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-[var(--fg-2)] text-center leading-relaxed">
              Pague <strong style={{ color: 'var(--kiro-green)' }}>{formatBRL(order.depositAmount)}</strong> via PIX para receber o TESOURO na sua carteira.
            </p>

            <div
              className="flex flex-col items-center gap-3 rounded-[var(--radius-md)]"
              style={{ background: '#FFFFFF', padding: 22 }}
            >
              <img
                src="/qr-code.png"
                alt="QR Code PIX"
                style={{ display: 'block', width: 200, height: 200 }}
              />
            </div>

            <div
              className="border rounded-[var(--radius-md)]"
              style={{ padding: '10px 14px', borderColor: 'var(--stroke-3)', background: 'var(--bg-3)' }}
            >
              <span className="block text-[11px] text-[var(--fg-2)] font-mono truncate">
                {order.depositPixCode}
              </span>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCopyPix}
                className="inline-flex items-center justify-center gap-[6px] rounded-full border border-[var(--stroke-3)] bg-transparent text-[var(--kiro-green)] cursor-pointer text-[12px] font-medium hover:bg-white/[0.04] transition-colors"
                style={{ padding: '8px 18px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar código PIX'}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[12px] text-[var(--fg-3)] justify-center">
              <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
              Aguardando pagamento via PIX
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <CheckCircle size={48} strokeWidth={1.4} style={{ color: 'var(--kiro-green)' }} />
            <div>
              <p className="text-[18px] font-semibold text-[var(--fg-1)] mb-1">Pagamento recebido!</p>
              <p className="text-[13px] text-[var(--fg-3)] leading-relaxed">
                O TESOURO foi creditado na sua carteira.
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={handleClose} className="w-full justify-center">
              Fechar
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <AlertCircle size={40} strokeWidth={1.4} style={{ color: 'rgba(255,77,109,0.85)' }} />
            <div>
              <p className="text-[15px] font-medium text-[var(--fg-1)] mb-1">Algo deu errado</p>
              <p className="text-[13px] text-[var(--fg-3)] leading-relaxed">{errorMsg}</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => publicKey && startFlow(publicKey)}
                className="flex-1 justify-center"
              >
                Tentar novamente
              </Button>
              <Button variant="ghost" onClick={handleClose} className="flex-1 justify-center">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
