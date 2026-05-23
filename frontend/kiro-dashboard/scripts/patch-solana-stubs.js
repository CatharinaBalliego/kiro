// Patches Privy's optional Solana peer deps with no-op stubs after npm install.
// These packages are not used by our app (Stellar-only), but Privy imports them
// conditionally. Without stubs, Vite's __vite-optional-peer-dep virtual modules
// emit empty ES modules that fail Rollup's named-export checks at build time.

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nm = join(__dirname, '..', 'node_modules');

const stubs = [
  {
    dir: join(nm, '@solana', 'kit'),
    pkg: { name: '@solana/kit', version: '0.0.1', type: 'module', main: 'index.js', exports: { '.': './index.js' } },
    code: `export const getTransactionDecoder = () => ({ decode: () => null });
export const getBase64Decoder = () => ({ decode: () => null });
export const getBase58Encoder = () => ({ encode: () => '' });
export const getBase58Decoder = () => ({ decode: () => null });
export const getTransactionEncoder = () => ({ encode: () => null });
export const getCompiledTransactionMessageEncoder = () => ({ encode: () => null });
export const getCompiledTransactionMessageDecoder = () => ({ decode: () => null });
export const compileTransaction = () => null;
export const decompileTransactionMessage = () => null;
export const fetchAddressesForLookupTables = async () => ({});
export const createSolanaRpc = () => ({});
export const createSolanaRpcSubscriptions = () => ({});
export const sendAndConfirmTransactionFactory = () => async () => null;
export const signTransactionMessageWithSigners = async () => null;
export const getSignatureFromTransaction = () => '';
export const lamports = (v) => v;
export const address = (v) => v;
export const pipe = (...fns) => fns.reduce((v, f) => f(v));
export const createTransactionMessage = () => ({});
export const setTransactionMessageFeePayer = () => ({});
export const setTransactionMessageFeePayerSigner = () => ({});
export const setTransactionMessageLifetimeUsingBlockhash = () => ({});
export const appendTransactionMessageInstruction = () => ({});
export const appendTransactionMessageInstructions = () => ({});
export const createNoopSigner = () => ({});
export const isSolanaError = () => false;
`,
  },
  {
    dir: join(nm, '@solana-program', 'system'),
    pkg: { name: '@solana-program/system', version: '0.0.1', type: 'module', main: 'index.js', exports: { '.': './index.js' } },
    code: `export const getTransferSolInstruction = () => null;\n`,
  },
  {
    dir: join(nm, '@solana-program', 'token'),
    pkg: { name: '@solana-program/token', version: '0.0.1', type: 'module', main: 'index.js', exports: { '.': './index.js' } },
    code: `export const findAssociatedTokenPda = async () => [];
export const getCreateAssociatedTokenIdempotentInstruction = () => null;
export const getTransferInstruction = () => null;
`,
  },
  {
    dir: join(nm, '@solana-program', 'memo'),
    pkg: { name: '@solana-program/memo', version: '0.0.1', type: 'module', main: 'index.js', exports: { '.': './index.js' } },
    code: `export const getAddMemoInstruction = () => null;\n`,
  },
];

for (const { dir, pkg, code } of stubs) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
  writeFileSync(join(dir, 'index.js'), code);
}

console.log('[patch-solana-stubs] Solana stub packages applied.');
