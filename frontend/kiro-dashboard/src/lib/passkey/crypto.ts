/**
 * HKDF-SHA256 key derivation used to produce the Stellar Ed25519 seed from
 * arbitrary high-entropy input (originally a WebAuthn PRF output, now the
 * signature from a Privy embedded wallet).
 *
 * Domain separation: salt = "kiro.wallet.seed.v1", info = "stellar-ed25519-seed".
 * Bumping the salt rotates all derived wallets — only do it on a deliberate
 * breaking change to the derivation scheme.
 */
export async function deriveEdSeedFromPrf(input: ArrayBuffer): Promise<Uint8Array> {
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    input,
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

/**
 * Best-effort zeroing of sensitive bytes before they go out of scope.
 * JS GC may keep copies — treat this as defense-in-depth only.
 */
export function wipeBytes(bytes: Uint8Array): void {
  bytes.fill(0);
}
