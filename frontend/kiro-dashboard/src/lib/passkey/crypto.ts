/**
 * Cryptographic helpers for the passkey-protected Stellar wallet.
 *
 * Key derivation: PRF output (32 bytes from the authenticator) → HKDF-SHA256
 * → 32-byte Ed25519 seed. Because PRF is deterministic (same credential +
 * same salt = same output every time), the wallet is portable: any device
 * that holds the synced passkey derives the exact same Stellar keypair.
 */

/**
 * Derive a 32-byte Ed25519 seed from the passkey PRF output via HKDF-SHA256.
 *
 * Domain separation: salt = "kiro.wallet.seed.v1", info = "stellar-ed25519-seed".
 * Bumping the salt version rotates all derived keys — only do it on a
 * deliberate breaking change.
 */
export async function deriveEdSeedFromPrf(prfOutput: ArrayBuffer): Promise<Uint8Array> {
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    prfOutput,
    { name: 'HKDF' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('kiro.wallet.seed.v1') as BufferSource,
      info: new TextEncoder().encode('stellar-ed25519-seed') as BufferSource,
    },
    hkdfKey,
    256,
  );
  return new Uint8Array(bits);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * Best-effort zeroing of sensitive bytes before they go out of scope.
 * JS GC may keep copies, so treat this as defense-in-depth only.
 */
export function wipeBytes(bytes: Uint8Array): void {
  bytes.fill(0);
}
