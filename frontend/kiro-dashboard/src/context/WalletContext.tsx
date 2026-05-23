import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchTesouroBalance } from '@/lib/stellar';
import {
  createPasskeyWallet,
  forgetPasskeyWallet,
  hasPasskeyWallet as readHasPasskeyWallet,
  isPasskeySupported,
  loginWithPasskey as authPasskey,
  recoverPasskeyWallet,
  signXdrWithPasskey,
} from '@/lib/passkey/wallet';

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  /** Raw TESOURO balance from Horizon (e.g. "1000.0000000"), or null when not connected / issuer unconfigured. */
  balance: string | null;
  isLoading: boolean;
  /** True when a passkey-protected wallet blob exists in localStorage (regardless of session). */
  hasPasskeyWallet: boolean;
  /** True when the browser exposes the WebAuthn + PRF surface we need. */
  passkeySupported: boolean;
  /**
   * Create a new passkey-backed Stellar account if none exists locally,
   * otherwise authenticate the existing one. `userName` is shown by the
   * OS in the biometric prompt — pass the merchant's store name when
   * known so the prompt reads naturally.
   */
  connect: (userName?: string) => Promise<void>;
  /** Ends the current session. Does NOT remove the local passkey blob — call `forgetPasskeyAccount` to wipe. */
  disconnect: () => void;
  /** Permanently delete the local passkey blob (the OS passkey itself stays). */
  forgetPasskeyAccount: () => void;
  /** Signs an XDR transaction envelope using the local passkey-protected key. Returns signed XDR. */
  signTransaction: (xdr: string) => Promise<string>;
  /** Re-fetches the TESOURO balance from Horizon. No-op if not connected. */
  refreshBalance: () => Promise<void>;
  /**
   * Restore access on a new device using a discoverable (synced) passkey.
   * Shows the browser passkey picker with no hint — user selects their synced
   * credential and the wallet is re-derived deterministically from the PRF output.
   */
  recover: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPasskeyWallet, setHasPasskeyWallet] = useState<boolean>(false);
  const [passkeySupported, setPasskeySupported] = useState<boolean>(false);

  useEffect(() => {
    setHasPasskeyWallet(readHasPasskeyWallet());
    setPasskeySupported(isPasskeySupported());
  }, []);

  const loadBalance = useCallback(async (address: string) => {
    try {
      const bal = await fetchTesouroBalance(address);
      setBalance(bal);
    } catch (err) {
      console.error('[Wallet] Failed to fetch balance:', err);
    }
  }, []);

  const connect = useCallback(
    async (userName?: string) => {
      setIsLoading(true);
      try {
        let address: string;
        // Read freshly from storage rather than relying on the state copy —
        // avoids races where the user clicked before the mount effect ran.
        if (readHasPasskeyWallet()) {
          address = await authPasskey();
        } else {
          address = await createPasskeyWallet(userName ?? 'Lojista Kiro');
          setHasPasskeyWallet(true);
        }
        setPublicKey(address);
        await loadBalance(address);
      } finally {
        setIsLoading(false);
      }
    },
    [loadBalance],
  );

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setBalance(null);
    // Note: passkey blob remains in localStorage so the user can return via
    // connect() without re-creating. Call `forgetPasskeyAccount` explicitly
    // to wipe it.
  }, []);

  const forgetPasskeyAccount = useCallback(() => {
    forgetPasskeyWallet();
    setHasPasskeyWallet(false);
    setPublicKey(null);
    setBalance(null);
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    return signXdrWithPasskey(xdr);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    const bal = await fetchTesouroBalance(publicKey);
    setBalance(bal);
  }, [publicKey]);

  const recover = useCallback(async () => {
    setIsLoading(true);
    try {
      const address = await recoverPasskeyWallet();
      setHasPasskeyWallet(true);
      setPublicKey(address);
      await loadBalance(address);
    } finally {
      setIsLoading(false);
    }
  }, [loadBalance]);

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!publicKey,
        publicKey,
        balance,
        isLoading,
        hasPasskeyWallet,
        passkeySupported,
        connect,
        disconnect,
        forgetPasskeyAccount,
        signTransaction,
        refreshBalance,
        recover,
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
