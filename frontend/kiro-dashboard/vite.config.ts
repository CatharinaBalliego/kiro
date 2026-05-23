import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';

interface ApiEnv {
  apiKey: string;
  baseUrl: string;
  tesouroAsset: string;
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function efetch(env: ApiEnv, method: string, pathname: string, body?: unknown) {
  const res = await fetch(env.baseUrl + pathname, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: env.apiKey },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();

  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // Non-JSON response — Etherfuse sometimes returns plain text for errors.
      if (!res.ok) {
        console.error(`[etherfuse-api] ${method} ${pathname} → ${res.status}:`, text.slice(0, 300));
        const err = new Error(text.slice(0, 200)) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const errObj = (data as { error?: { message?: string }; message?: string }).error;
    const msg = errObj?.message ?? (data as { message?: string }).message ?? `HTTP ${res.status}`;
    console.error(`[etherfuse-api] ${method} ${pathname} → ${res.status}:`, JSON.stringify(data).slice(0, 300));
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Identity payload for the sandbox bypass /kyc submission. Matches the
// documented schema for POST /ramp/customer/{id}/kyc.
const SANDBOX_KYC_IDENTITY = {
  name: { givenName: 'Sandbox', familyName: 'Tester' },
  dateOfBirth: '1990-01-15',
  address: {
    street: 'Av. Paulista 1000',
    city: 'Sao Paulo',
    region: 'SP',
    postalCode: '01310100',
    country: 'BR',
  },
  idNumbers: [{ value: '00000000191', type: 'CPF' }],
};

// customerInfo payload for the customer-agreement acceptance. The openapi
// marks it "optional" but the live API rejects each missing field one at a
// time ("Phone not provided" → "Email not provided" → "Occupation not
// provided" → ...). Schema is `ProofOfIdentityUserInfo` from openapi.yaml,
// so we send the full shape upfront to short-circuit the iteration.
const SANDBOX_CUSTOMER_INFO = {
  email: 'sandbox@kiro.test',
  phoneNumber: '+5511999999999',
  dateOfBirth: '1990-01-15',
  // Both `name` and `address` are flat strings in the live API's
  // customerInfo struct, even though openapi.yaml's ProofOfIdentityUserInfo
  // types them as objects. Sending the object form gets rejected with
  // "invalid type: map, expected a string".
  name: 'Sandbox Tester',
  address: 'Av. Paulista 1000, Sao Paulo, SP 01310-100, BR',
  idNumbers: [{ value: '00000000191', type: 'CPF' }],
  occupation: 'Software Developer',
  identificationType: 'CPF',
};

/**
 * Etherfuse off-ramp proxy. Runs as Vite middleware so the API key stays
 * server-side and `npm run dev` boots both UI and proxy in one terminal.
 */
function etherfuseApi(env: ApiEnv): Plugin {
  console.log('[etherfuse-api] plugin instantiated. apiKey:', env.apiKey ? 'present' : 'MISSING');
  return {
    name: 'kiro-etherfuse-api',
    configureServer(server) {
      console.log('[etherfuse-api] configureServer called — registering middleware');
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/ef-')) return next();
        console.log('[etherfuse-api]', req.method, url);

        const parsed = new URL(url, 'http://localhost');
        const method = req.method ?? 'GET';

        try {
          // POST /api/ef-onboarding → POST /ramp/onboarding-url
          // Returns canonical { customerId, bankAccountId, kycUrl }. If the wallet
          // is already onboarded under a different customer ("see org: XYZ"), we
          // recover by switching to that customer and reusing its first bank account.
          if (parsed.pathname === '/api/ef-onboarding' && method === 'POST') {
            const body = JSON.parse(await readBody(req)) as { customerId: string; bankAccountId: string; publicKey: string };
            let { customerId, bankAccountId } = body;
            const { publicKey } = body;

            const tryOnboard = (cid: string, bid: string) => efetch(env, 'POST', '/ramp/onboarding-url', {
              customerId: cid, bankAccountId: bid, publicKey, blockchain: 'stellar',
            }) as Promise<{ presigned_url: string }>;

            try {
              const data = await tryOnboard(customerId, bankAccountId);
              return sendJson(res, { customerId, bankAccountId, kycUrl: data.presigned_url });
            } catch (err) {
              const e = err as Error & { status?: number };
              const match = e.message.match(/see org:\s*([0-9a-f-]+)/i);
              if (!match) throw err;

              const existingCustomerId = match[1];
              console.log('[etherfuse-api] wallet already onboarded under customer', existingCustomerId);

              try {
                const accountsData = await efetch(env, 'POST', `/ramp/customer/${existingCustomerId}/bank-accounts`, {
                  pageSize: 10, pageNumber: 0,
                }) as { items?: Array<{ bankAccountId: string }> };
                const accounts = accountsData.items ?? [];
                if (accounts.length > 0) bankAccountId = accounts[0].bankAccountId;
              } catch { /* keep new bankAccountId — onboarding will create it */ }

              const data = await tryOnboard(existingCustomerId, bankAccountId);
              return sendJson(res, {
                customerId: existingCustomerId,
                bankAccountId,
                kycUrl: data.presigned_url,
              });
            }
          }

          // GET /api/ef-kyc-status?customerId=...&publicKey=...
          if (parsed.pathname === '/api/ef-kyc-status' && method === 'GET') {
            const customerId = parsed.searchParams.get('customerId');
            const publicKey = parsed.searchParams.get('publicKey');
            try {
              const data = await efetch(env, 'GET', `/ramp/customer/${customerId}/kyc/${publicKey}`);
              return sendJson(res, { status: (data as { status?: string }).status ?? 'not_started' });
            } catch (err) {
              const e = err as { status?: number };
              if (e.status === 404 || e.status === 400) {
                return sendJson(res, { status: 'not_started' });
              }
              throw err;
            }
          }

          // POST /api/ef-bank-accounts → POST /ramp/customer/{id}/bank-accounts
          if (parsed.pathname === '/api/ef-bank-accounts' && method === 'POST') {
            const { customerId } = JSON.parse(await readBody(req));
            const data = await efetch(env, 'POST', `/ramp/customer/${customerId}/bank-accounts`, {
              pageSize: 10, pageNumber: 0,
            });
            return sendJson(res, { accounts: (data as { items?: unknown[] }).items ?? [] });
          }

          // POST /api/ef-quote → POST /ramp/quote
          if (parsed.pathname === '/api/ef-quote' && method === 'POST') {
            const { customerId, sourceAmount } = JSON.parse(await readBody(req));
            const quoteId = randomUUID();
            const data = await efetch(env, 'POST', '/ramp/quote', {
              quoteId, customerId, blockchain: 'stellar',
              quoteAssets: { type: 'offramp', sourceAsset: env.tesouroAsset, targetAsset: 'BRL' },
              sourceAmount,
            }) as Record<string, string | null>;
            return sendJson(res, {
              quoteId: data.quoteId,
              sourceAmount: data.sourceAmount,
              destinationAmount: data.destinationAmountAfterFee ?? data.destinationAmount ?? '0',
              exchangeRate: data.exchangeRate ?? '1',
              fee: data.feeAmount ?? '0',
              expiresAt: data.expiresAt ?? '',
            });
          }

          // POST /api/ef-order → POST /ramp/order (off-ramp)
          if (parsed.pathname === '/api/ef-order' && method === 'POST') {
            const { quoteId, stellarAddress, bankAccountId } = JSON.parse(await readBody(req));
            const orderId = randomUUID();
            const data = await efetch(env, 'POST', '/ramp/order', {
              orderId, bankAccountId, publicKey: stellarAddress, quoteId,
            }) as { offramp?: { orderId: string } };
            return sendJson(res, { orderId: data.offramp?.orderId ?? orderId });
          }

          // GET /api/ef-order?orderId=...
          if (parsed.pathname === '/api/ef-order' && method === 'GET') {
            const orderId = parsed.searchParams.get('orderId');
            const data = await efetch(env, 'GET', `/ramp/order/${orderId}`) as Record<string, unknown>;
            return sendJson(res, {
              orderId: data.orderId,
              status: data.status,
              burnTransaction: data.burnTransaction ?? null,
            });
          }

          // POST /api/ef-onramp-quote → POST /ramp/quote (BRL → TESOURO).
          // Pass `walletAddress` when known so Etherfuse can detect missing
          // trustlines/accounts and include the one-time setup cost in the
          // fee — without it, the order endpoint rejects new wallets with
          // "trustline not found".
          if (parsed.pathname === '/api/ef-onramp-quote' && method === 'POST') {
            const { customerId, sourceAmount, walletAddress } = JSON.parse(await readBody(req)) as {
              customerId: string; sourceAmount: string; walletAddress?: string;
            };
            const quoteId = randomUUID();
            const body: Record<string, unknown> = {
              quoteId, customerId, blockchain: 'stellar',
              quoteAssets: { type: 'onramp', sourceAsset: 'BRL', targetAsset: env.tesouroAsset },
              sourceAmount,
            };
            if (walletAddress) body.walletAddress = walletAddress;
            const data = await efetch(env, 'POST', '/ramp/quote', body) as Record<string, string | null>;
            return sendJson(res, {
              quoteId: data.quoteId,
              sourceAmount: data.sourceAmount,
              destinationAmount: data.destinationAmountAfterFee ?? data.destinationAmount ?? '0',
              exchangeRate: data.exchangeRate ?? '1',
              fee: data.feeAmount ?? '0',
              expiresAt: data.expiresAt ?? '',
            });
          }

          // POST /api/ef-onramp-order → POST /ramp/order (on-ramp).
          // Response includes the PIX deposit details the user must pay.
          if (parsed.pathname === '/api/ef-onramp-order' && method === 'POST') {
            const { quoteId, stellarAddress, bankAccountId } = JSON.parse(await readBody(req));
            const orderId = randomUUID();
            const data = await efetch(env, 'POST', '/ramp/order', {
              orderId, bankAccountId, publicKey: stellarAddress, quoteId,
            }) as { onramp?: Record<string, string | undefined> };
            const o = data.onramp ?? {};
            return sendJson(res, {
              orderId: o.orderId ?? orderId,
              depositAmount: o.depositAmount ?? '',
              depositPixKey: o.depositPixKey ?? '',
              depositPixKeyType: o.depositPixKeyType ?? '',
              depositPixCode: o.depositPixCode ?? '',
              beneficiary: o.beneficiary ?? '',
            });
          }

          // POST /api/ef-sandbox-approve — fast-forwards KYC AND accepts both
          // required agreements in one shot. Order matters: docs upload runs
          // FIRST because calling /ramp/onboarding-url for an existing customer
          // appears to disrupt the next docs-upload auto-approval. After docs
          // settle, we refresh the presigned URL (needed as auth for agreements)
          // and post the two agreement acceptances. Each step is best-effort —
          // re-calling for an already-approved/already-accepted customer just
          // gets caught and we move on. Gated server-side on the base URL.
          if (parsed.pathname === '/api/ef-sandbox-approve' && method === 'POST') {
            if (!env.baseUrl.includes('sand')) {
              return sendJson(res, { error: 'Sandbox approve indisponível fora do ambiente sandbox' }, 403);
            }
            const { customerId, publicKey, bankAccountId } = JSON.parse(await readBody(req)) as {
              customerId: string; publicKey: string; bankAccountId: string;
            };

            // 1. Submit programmatic KYC with PII — sandbox auto-approves on
            //    success AND populates the fields (esp. phoneNumber) that the
            //    customer-agreement endpoint later requires. Using /kyc rather
            //    than /kyc/documents because the latter doesn't set PII and
            //    runs into "Too many pending documents" on retries.
            let kycStatus: string | null = null;
            try {
              // Docs claim no `id` field exists, but the live deserializer
              // demands one — column count from the error matches the inner
              // identity close, so `id` is required INSIDE identity.
              // Using customerId since that's the only UUID we have handy.
              const kycData = await efetch(env, 'POST', `/ramp/customer/${customerId}/kyc`, {
                pubkey: publicKey,
                identity: { id: customerId, ...SANDBOX_KYC_IDENTITY },
              }) as { status?: string };
              kycStatus = kycData.status ?? null;
            } catch (err) {
              console.log('[ef-sandbox-approve] /kyc failed (likely already approved):', (err as Error).message);
              try {
                const statusData = await efetch(env, 'GET', `/ramp/customer/${customerId}/kyc/${publicKey}`) as { status?: string };
                kycStatus = statusData.status ?? null;
              } catch { /* keep null */ }
            }

            // 2. (Removed — the agreement loop below fetches a fresh URL per call.)

            // 3. Accept all THREE required agreements. Fetch a FRESH presigned
            //    URL before each call in case the token is single-use, and
            //    log the response body so we can see whether the API is
            //    returning {success: false} on 200 (which our efetch wouldn't
            //    treat as an error).
            const freshUrl = async (): Promise<string | null> => {
              try {
                const data = await efetch(env, 'POST', '/ramp/onboarding-url', {
                  customerId, bankAccountId, publicKey, blockchain: 'stellar',
                }) as { presigned_url?: string };
                return data.presigned_url ?? null;
              } catch (err) {
                console.log('[ef-sandbox-approve] freshUrl failed:', (err as Error).message);
                return null;
              }
            };

            const agreementCalls: Array<[string, (url: string) => Record<string, unknown>]> = [
              ['/ramp/agreements/electronic-signature', (url) => ({ presignedUrl: url })],
              ['/ramp/agreements/terms-and-conditions', (url) => ({ presignedUrl: url })],
              ['/ramp/agreements/customer-agreement', (url) => ({
                presignedUrl: url,
                customerInfo: SANDBOX_CUSTOMER_INFO,
              })],
            ];
            for (const [path, buildBody] of agreementCalls) {
              const url = await freshUrl();
              if (!url) continue;
              try {
                const result = await efetch(env, 'POST', path, buildBody(url));
                console.log(`[ef-sandbox-approve] ${path} →`, JSON.stringify(result));
              } catch (err) {
                console.log(`[ef-sandbox-approve] ${path} failed:`, (err as Error).message);
              }
            }

            return sendJson(res, { ok: true, data: { status: kycStatus } });
          }

          // GET /api/ef-onramp-order?orderId=... — poll for completion.
          // POST /api/ef-onramp-claim-tx — proxies to /ramp/order/{id}/regenerate_tx,
          // which returns a fresh Stellar claim XDR for completed on-ramp orders.
          // Fallback for when the order GET response comes back without the
          // stored stellarClaimTransaction (observed with sandbox simulate-deposit).
          if (parsed.pathname === '/api/ef-onramp-claim-tx' && method === 'POST') {
            const { orderId } = JSON.parse(await readBody(req)) as { orderId: string };
            const data = await efetch(env, 'POST', `/ramp/order/${orderId}/regenerate_tx`) as {
              stellarClaimTransaction?: string;
            };
            return sendJson(res, {
              stellarClaimTransaction: data.stellarClaimTransaction ?? null,
            });
          }

          if (parsed.pathname === '/api/ef-onramp-order' && method === 'GET') {
            const orderId = parsed.searchParams.get('orderId');
            const data = await efetch(env, 'GET', `/ramp/order/${orderId}`) as Record<string, unknown>;
            return sendJson(res, {
              orderId: data.orderId,
              status: data.status,
              confirmedTxSignature: data.confirmedTxSignature ?? null,
              amountInTokens: data.amountInTokens ?? null,
              amountInFiat: data.amountInFiat ?? null,
              // Stellar-only: present when the wallet lacked a trustline and
              // Etherfuse delivered via a claimable balance. The client must
              // sign and submit this XDR to add the trustline + claim tokens.
              stellarClaimTransaction: data.stellarClaimTransaction ?? null,
              stellarClaimableBalanceId: data.stellarClaimableBalanceId ?? null,
            });
          }

          return sendJson(res, { error: 'Not found' }, 404);
        } catch (err) {
          const e = err as Error & { status?: number };
          console.error('[etherfuse-api]', e.message);
          return sendJson(res, { error: e.message ?? 'Internal error' }, e.status ?? 500);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const raw = loadEnv(mode, process.cwd(), '');
  const apiEnv: ApiEnv = {
    apiKey: raw.ETHERFUSE_API_KEY ?? '',
    baseUrl: (raw.ETHERFUSE_BASE_URL ?? 'https://api.sand.etherfuse.com').replace(/\/$/, ''),
    tesouroAsset: `${raw.VITE_TESOURO_CODE ?? 'TESOURO'}:${raw.VITE_TESOURO_ISSUER ?? ''}`,
  };

  return {
    // Order matters: etherfuseApi first so its middleware is installed before
    // Vite's SPA-fallback that returns index.html for unknown routes.
    plugins: [etherfuseApi(apiEnv), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // CJS wallet SDKs inside stellar-wallets-kit reference Node's `global`.
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      esbuildOptions: {
        define: { global: 'globalThis' },
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
