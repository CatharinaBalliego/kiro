import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import { fetchTesouroBalance, NETWORK_PASSPHRASE, WALLET_NETWORK } from '@/lib/stellar';
import { deriveEdSeedFromPrf, wipeBytes } from '@/lib/passkey/crypto';

const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// This message is part of the key derivation — changing it rotates every wallet.
const DERIVATION_MESSAGE = 'kiro:stellar:seed:v1';

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  /** Raw TESOURO balance from Horizon (e.g. "1000.0000000"), or null when not connected. */
  balance: string | null;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => void;
  /** Signs an XDR transaction envelope with the derived Stellar keypair. */
  signTransaction: (xdr: string) => Promise<string>;
  /** Re-fetches the TESOURO balance from Horizon. No-op if not connected. */
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Stellar keypair lives in a ref — it never needs to trigger re-renders
  // and we want to minimize the window it stays in JS memory.
  const keypairRef = useRef<Keypair | null>(null);

  // Guards against React StrictMode double-invocation (dev only): StrictMode
  // mounts → unmounts → remounts each effect, which would fire two concurrent
  // personal_sign requests and stall Privy's signing UI.
  const derivingRef = useRef(false);

  // Derive the Stellar wallet from the Privy embedded EVM wallet via HKDF.
  // The EVM wallet signs a fixed message — same wallet always produces the
  // same signature, so the same Stellar keypair is recovered on any device
  // that can authenticate with Privy (including cross-device session restore).
  useEffect(() => {
    if (!ready || !authenticated) {
      derivingRef.current = false; // reset gate on logout so next login can derive
      return;
    }
    if (publicKey) return; // already active this session
    if (derivingRef.current) return; // derivation already in flight

    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
    if (!embeddedWallet) return;

    derivingRef.current = true;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      let seed: Uint8Array | null = null;
      try {
        // EIP-191 personal_sign via the EIP-1193 provider exposed by Privy.
        // The EVM wallet is used only as a signing oracle — the signature is
        // deterministic (same Privy account → same signature → same Stellar key)
        // and is never broadcast or used for any Ethereum transaction.
        const provider = await embeddedWallet.getEthereumProvider();

        const signature = (await provider.request({
          method: 'personal_sign',
          params: [DERIVATION_MESSAGE, embeddedWallet.address],
        })) as string;

        if (cancelled) return;

        // Decode hex signature → HKDF → 32-byte Ed25519 seed
        const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;
        const sigBytes = new Uint8Array(
          (sigHex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)),
        );
        seed = await deriveEdSeedFromPrf(sigBytes.buffer as ArrayBuffer);

        const keypair = Keypair.fromRawEd25519Seed(seed as unknown as Buffer);
        keypairRef.current = keypair;
        const pk = keypair.publicKey();

        if (cancelled) return;

        setPublicKey(pk);

        if (WALLET_NETWORK === 'TESTNET') {
          fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(pk)}`).catch(() => {});
        }

        fetchTesouroBalance(pk)
          .then((bal) => { if (!cancelled) setBalance(bal); })
          .catch(() => {});
      } catch (err) {
        console.error('[Wallet] Stellar derivation failed:', err);
        // Reset gate so the user can retry via connect()
        derivingRef.current = false;
        // Do NOT call logout() here — changing `authenticated` re-triggers this effect
      } finally {
        if (seed) wipeBytes(seed);
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // logout intentionally omitted: it's a stable Privy function and including
  // it causes the effect to re-run on every render in some Privy versions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, wallets, publicKey]);

  const connect = useCallback(() => {
    if (!authenticated) {
      login();
      // useEffect above picks up once Privy fires the authenticated → true transition
    }
  }, [authenticated, login]);

  const disconnect = useCallback(() => {
    keypairRef.current = null;
    setPublicKey(null);
    setBalance(null);
    logout();
  }, [logout]);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    const keypair = keypairRef.current;
    if (!keypair) throw new Error('Carteira não conectada');
    const tx = TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE);
    tx.sign(keypair);
    return tx.toXDR();
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    const bal = await fetchTesouroBalance(publicKey);
    setBalance(bal);
  }, [publicKey]);

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!publicKey,
        publicKey,
        balance,
        // Show loading while Privy SDK initialises or while deriving
        isLoading: !ready || isLoading,
        connect,
        disconnect,
        signTransaction,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
