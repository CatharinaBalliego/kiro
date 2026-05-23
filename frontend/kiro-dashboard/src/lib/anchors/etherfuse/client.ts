import type { KycStatus, SavedFiatAccount } from '../types';

const BASE = '/api';

async function apiFetch<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  if (!text) throw new Error(`Resposta vazia de ${path}`);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // Server returned HTML (e.g. Vite's index.html fallback) — proxy/middleware misconfigured.
    throw new Error(`Rota ${path} não encontrada. Reinicie o servidor de dev (npm run dev).`);
  }
  if (!res.ok) {
    throw new Error((data.error as string | undefined) ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export interface OnboardingResult {
  /** Canonical customer ID — may differ from the input if the wallet was already onboarded. */
  customerId: string;
  /** Canonical bank account ID — may be an existing one if the customer already had accounts. */
  bankAccountId: string;
  /** Hosted KYC/onboarding URL. */
  kycUrl: string;
}

/**
 * Starts (or recovers) onboarding for a wallet. The server transparently handles
 * the "wallet already added to another customer" case by switching to the
 * existing customer ID + bank account. Always treat the returned IDs as authoritative.
 */
export async function startOnboarding(
  customerId: string,
  bankAccountId: string,
  publicKey: string,
): Promise<OnboardingResult> {
  return apiFetch<OnboardingResult>('POST', '/ef-onboarding', {
    customerId,
    bankAccountId,
    publicKey,
  });
}

/**
 * Sandbox-only escape hatch: in one round trip, this auto-approves KYC
 * (placeholder document upload) AND accepts both required agreements
 * (terms-and-conditions + customer-agreement). The hosted UI normally
 * walks the user through both, so the programmatic bypass must replay
 * the agreements step too or quotes fail with "Terms and conditions
 * have not been completed". Server-side is gated on `ETHERFUSE_BASE_URL`
 * containing "sand", so this no-ops in prod.
 *
 * Returns the canonical KYC status from the upload response — important
 * because the regular `GET /kyc/{publicKey}` endpoint has a propagation
 * delay and may still report "proposed" right after the upload succeeds.
 * Trust this return value, not a follow-up `getKycStatus` call.
 */
export async function sandboxApprove(
  customerId: string,
  publicKey: string,
  bankAccountId: string,
): Promise<KycStatus> {
  const res = await apiFetch<{ ok: boolean; data: { status?: string } }>(
    'POST',
    '/ef-sandbox-approve',
    { customerId, publicKey, bankAccountId },
  );
  const raw = res.data?.status;
  if (raw === 'approved' || raw === 'approved_chain_deploying') return 'approved';
  if (raw === 'rejected') return 'rejected';
  if (raw === 'proposed') return 'pending';
  return 'not_started';
}

/** Returns the canonical KYC status for a customer+wallet pair. */
export async function getKycStatus(
  customerId: string,
  publicKey: string,
): Promise<KycStatus> {
  const { status } = await apiFetch<{ status: string }>('GET', '/ef-kyc-status', undefined, {
    customerId,
    publicKey,
  });
  if (status === 'approved' || status === 'approved_chain_deploying') return 'approved';
  if (status === 'proposed') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'not_started';
}

/** Lists registered PIX/fiat accounts for a customer. */
export async function getBankAccounts(customerId: string): Promise<SavedFiatAccount[]> {
  const { accounts } = await apiFetch<{
    accounts: Array<{
      bankAccountId: string;
      pixKey?: string;
      accountHolderName?: string;
      createdAt: string;
    }>;
  }>('POST', '/ef-bank-accounts', { customerId });

  return accounts.map((a) => ({
    id: a.bankAccountId,
    type: 'pix',
    accountNumber: a.pixKey ?? '',
    bankName: 'PIX',
    accountHolderName: a.accountHolderName ?? '',
    createdAt: a.createdAt,
  }));
}

export interface QuoteResult {
  quoteId: string;
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: string;
  fee: string;
  expiresAt: string;
}

/** Gets a TESOURO→BRL off-ramp quote for the given source amount. */
export async function getQuote(
  customerId: string,
  sourceAmount: string,
): Promise<QuoteResult> {
  return apiFetch<QuoteResult>('POST', '/ef-quote', { customerId, sourceAmount });
}

/** Creates an off-ramp order. Returns the Etherfuse order ID. */
export async function createOrder(
  quoteId: string,
  stellarAddress: string,
  bankAccountId: string,
): Promise<{ orderId: string }> {
  return apiFetch<{ orderId: string }>('POST', '/ef-order', {
    quoteId,
    stellarAddress,
    bankAccountId,
  });
}

export interface OrderPollResult {
  orderId: string;
  status: string;
  burnTransaction: string | null;
}

/** Polls a single order status. Check `burnTransaction` — present when XDR is ready. */
export async function getOrder(orderId: string): Promise<OrderPollResult> {
  return apiFetch<OrderPollResult>('GET', '/ef-order', undefined, { orderId });
}

// ---------------------------------------------------------------------------
// On-ramp (BRL → TESOURO via PIX deposit)
// ---------------------------------------------------------------------------

export interface OnRampQuoteResult {
  quoteId: string;
  /** BRL amount the user will pay. */
  sourceAmount: string;
  /** TESOURO amount that will arrive in the wallet. */
  destinationAmount: string;
  exchangeRate: string;
  fee: string;
  expiresAt: string;
}

export interface OnRampOrderResult {
  orderId: string;
  /** BRL amount to deposit. */
  depositAmount: string;
  depositPixKey: string;
  depositPixKeyType: string;
  /** PIX BR-Code / EMV copy-paste string — encode as QR. */
  depositPixCode: string;
  beneficiary: string;
}

export interface OnRampPollResult {
  orderId: string;
  status: string;
  /** Stellar tx hash once TESOURO has been delivered. */
  confirmedTxSignature: string | null;
  amountInTokens: string | null;
  amountInFiat: string | null;
  /**
   * Stellar-only. Present when the destination wallet lacked a TESOURO
   * trustline at order time: Etherfuse delivers via a claimable balance and
   * gives us back an unsigned XDR that does ChangeTrust + ClaimClaimableBalance
   * in one transaction. The user must sign this with their wallet and submit
   * to Horizon to actually receive the tokens.
   */
  stellarClaimTransaction: string | null;
  stellarClaimableBalanceId: string | null;
}

/**
 * Gets a BRL→TESOURO on-ramp quote. `walletAddress` is optional but strongly
 * recommended — when provided, Etherfuse detects missing trustlines/accounts
 * and folds the one-time setup cost into the fee, returning a claim XDR on
 * the resulting order rather than rejecting it.
 */
export async function getOnRampQuote(
  customerId: string,
  sourceAmount: string,
  walletAddress?: string,
): Promise<OnRampQuoteResult> {
  return apiFetch<OnRampQuoteResult>('POST', '/ef-onramp-quote', {
    customerId, sourceAmount, walletAddress,
  });
}

/** Creates an on-ramp order. Returns the PIX deposit details. */
export async function createOnRampOrder(
  quoteId: string,
  stellarAddress: string,
  bankAccountId: string,
): Promise<OnRampOrderResult> {
  return apiFetch<OnRampOrderResult>('POST', '/ef-onramp-order', {
    quoteId,
    stellarAddress,
    bankAccountId,
  });
}

/** Polls an on-ramp order. `status === 'completed'` means TESOURO has been delivered. */
export async function getOnRampOrder(orderId: string): Promise<OnRampPollResult> {
  return apiFetch<OnRampPollResult>('GET', '/ef-onramp-order', undefined, { orderId });
}

/**
 * Asks Etherfuse to rebuild and return a fresh Stellar claim XDR for a
 * completed on-ramp order. Use as a fallback when the order GET response
 * comes back with `stellarClaimTransaction: null` even though the order
 * is completed (observed with sandbox simulate-deposit).
 */
export async function regenerateClaimXdr(orderId: string): Promise<string | null> {
  const res = await apiFetch<{ stellarClaimTransaction: string | null }>(
    'POST', '/ef-onramp-claim-tx', { orderId },
  );
  return res.stellarClaimTransaction;
}
