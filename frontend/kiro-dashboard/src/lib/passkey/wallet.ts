/**
 * Glue between the passkey ceremony, HKDF key derivation, and the Stellar SDK.
 *
 * Threat model summary:
 * - The Ed25519 seed is derived deterministically from the passkey's PRF
 *   output via HKDF-SHA256. No random secret is generated or stored.
 * - The PRF output lives in the device's Secure Enclave / TPM and never
 *   leaves it; HKDF derives the seed in JS memory only long enough to sign.
 * - Because derivation is deterministic, the wallet is portable: any device
 *   that holds the synced passkey (iCloud Keychain, Google Password Manager)
 *   derives the exact same Stellar keypair — no encrypted blob needed.
 * - localStorage stores only the credentialId (for the authentication hint)
 *   and the public key (for display). Both are non-sensitive.
 * - On every signing operation we re-prompt biometric — no key caching.
 * - The plaintext seed exists in JS memory for the ~milliseconds between
 *   derivation and signing, then is wiped (best-effort).
 */

import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE, WALLET_NETWORK } from '@/lib/stellar';
import {
  authenticatePasskey,
  createPasskey,
  isPasskeySupported,
} from './webauthn';
import {
  base64ToBytes,
  bytesToBase64,
  deriveEdSeedFromPrf,
  wipeBytes,
} from './crypto';

// Bumping this key invalidates existing local state — users on the old version
// will see "Criar conta". Bumped from v1 (random seed + AES-GCM) to v2
// (deterministic HKDF derivation — no encrypted secret stored).
const STORAGE_KEY = 'kiro_passkey_wallet_v2';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

interface StoredWallet {
  version: 2;
  credentialIdB64: string;
  /** Cached for display — re-derivable from the passkey at any time. */
  publicKey: string;
  createdAt: string;
}

export { isPasskeySupported };

export function getStoredPasskeyWallet(): StoredWallet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWallet;
    if (
      parsed.version !== 2 ||
      typeof parsed.credentialIdB64 !== 'string' ||
      typeof parsed.publicKey !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasPasskeyWallet(): boolean {
  return getStoredPasskeyWallet() !== null;
}

/**
 * Drop the local blob. Does NOT delete the passkey credential — only the
 * authenticator (OS / browser settings) can do that.
 */
export function forgetPasskeyWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Onboard: create a passkey, derive the Stellar seed via HKDF from the PRF
 * output, and persist the credentialId + public key. Returns the public key.
 *
 * If a wallet already exists locally, refuse — caller must `forgetPasskeyWallet`
 * first if a fresh start is intentional.
 */
export async function createPasskeyWallet(userName = 'Lojista Kiro'): Promise<string> {
  if (hasPasskeyWallet()) {
    throw new Error(
      'Já existe uma conta passkey neste navegador. Desconecte antes de criar outra.',
    );
  }

  const reg = await createPasskey(userName);

  let seed: Uint8Array | null = null;
  try {
    seed = await deriveEdSeedFromPrf(reg.prfOutput);
    const keypair = Keypair.fromRawEd25519Seed(seed as unknown as Buffer);
    const publicKey = keypair.publicKey();

    const stored: StoredWallet = {
      version: 2,
      credentialIdB64: bytesToBase64(reg.credentialId),
      publicKey,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    if (WALLET_NETWORK === 'TESTNET') {
      try {
        await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
      } catch (err) {
        console.warn('[passkey] friendbot fund failed (non-fatal):', err);
      }
    }

    return publicKey;
  } finally {
    if (seed) wipeBytes(seed);
    seed = null;
  }
}

/**
 * Authenticate with the stored passkey and return the public key. The seed is
 * NOT derived here — derivation happens lazily inside `signXdrWithPasskey()`
 * when actually signing, minimizing the time the seed is in JS memory.
 */
export async function loginWithPasskey(): Promise<string> {
  const stored = getStoredPasskeyWallet();
  if (!stored) throw new Error('Nenhuma conta passkey neste navegador.');

  await authenticatePasskey(base64ToBytes(stored.credentialIdB64));

  return stored.publicKey;
}

/**
 * Sign an XDR transaction envelope by re-deriving the seed from the passkey
 * PRF output. Re-prompts biometric on every call by design.
 */
export async function signXdrWithPasskey(xdr: string): Promise<string> {
  const stored = getStoredPasskeyWallet();
  if (!stored) throw new Error('Nenhuma conta passkey encontrada.');

  const auth = await authenticatePasskey(base64ToBytes(stored.credentialIdB64));

  let seed: Uint8Array | null = null;
  let keypair: Keypair | null = null;
  try {
    seed = await deriveEdSeedFromPrf(auth.prfOutput);
    keypair = Keypair.fromRawEd25519Seed(seed as unknown as Buffer);
    const tx = TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE);
    tx.sign(keypair);
    return tx.toXDR();
  } finally {
    if (seed) wipeBytes(seed);
    seed = null;
    keypair = null;
  }
}

/**
 * Recover a wallet on a new device using a discoverable (synced) passkey.
 *
 * No `credentialId` hint is passed — the browser shows all passkeys for this
 * rpId, so the user can pick their synced passkey from iCloud/Google Password
 * Manager. The PRF output deterministically re-derives the same Stellar keypair,
 * and the credentialId + publicKey are written to localStorage so subsequent
 * logins work normally.
 */
export async function recoverPasskeyWallet(): Promise<string> {
  const auth = await authenticatePasskey();

  let seed: Uint8Array | null = null;
  try {
    seed = await deriveEdSeedFromPrf(auth.prfOutput);
    const keypair = Keypair.fromRawEd25519Seed(seed as unknown as Buffer);
    const publicKey = keypair.publicKey();

    const stored: StoredWallet = {
      version: 2,
      credentialIdB64: bytesToBase64(auth.credentialId),
      publicKey,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    return publicKey;
  } finally {
    if (seed) wipeBytes(seed);
    seed = null;
  }
}
