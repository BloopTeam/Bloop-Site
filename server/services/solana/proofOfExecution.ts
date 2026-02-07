/**
 * Solana Proof-of-Execution Service
 *
 * Anchors bot execution results to Solana devnet as verifiable proof.
 * Each execution produces a SHA-256 hash that gets written on-chain
 * via a Memo transaction, creating an immutable audit trail.
 *
 * Minimal, non-invasive — Bloop stays a standalone product.
 * This just adds optional on-chain receipts for bot work.
 */
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet'
const SOLANA_RPC = process.env.SOLANA_RPC_URL ||
  (SOLANA_NETWORK === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com')

// Memo Program ID (official Solana memo program)
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

// Keypair file location (gitignored in data/)
const KEYPAIR_PATH = path.resolve(process.cwd(), 'data', 'solana-keypair.json')

// ─── Keypair management ──────────────────────────────────────────────────────

let cachedKeypair: Keypair | null = null

function getOrCreateKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair

  try {
    if (fs.existsSync(KEYPAIR_PATH)) {
      const raw = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
      cachedKeypair = Keypair.fromSecretKey(Uint8Array.from(raw))
      return cachedKeypair
    }
  } catch {
    // Corrupted file — regenerate
  }

  // Generate new keypair
  const kp = Keypair.generate()
  const dir = path.dirname(KEYPAIR_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(kp.secretKey)))
  fs.chmodSync(KEYPAIR_PATH, 0o600)
  cachedKeypair = kp
  console.log(`[Solana] Generated new keypair: ${kp.publicKey.toBase58()}`)
  return kp
}

// ─── Execution proof ─────────────────────────────────────────────────────────

export interface ExecutionProof {
  /** SHA-256 hash of the execution data */
  hash: string
  /** Solana transaction signature (if submitted on-chain) */
  txSignature: string | null
  /** Solana explorer URL */
  explorerUrl: string | null
  /** Public key that signed the proof */
  signer: string
  /** Timestamp */
  timestamp: string
  /** Whether the proof was anchored on-chain */
  onChain: boolean
  /** Network used */
  network: string
}

export interface ExecutionData {
  botId: string
  userId: string
  specialization: string
  skill: string
  filesAnalyzed: number
  fileList: string[]
  issuesFound: number
  executionTimeMs: number
  provider: string
  /** First 200 chars of the AI response (summary, not full content) */
  summary: string
}

/**
 * Create a SHA-256 hash of the execution data.
 * This is deterministic — same input always produces the same hash.
 */
function hashExecution(data: ExecutionData): string {
  const canonical = JSON.stringify({
    botId: data.botId,
    userId: data.userId,
    specialization: data.specialization,
    skill: data.skill,
    filesAnalyzed: data.filesAnalyzed,
    fileList: data.fileList.sort(),
    issuesFound: data.issuesFound,
    provider: data.provider,
    summary: data.summary,
  })
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

/**
 * Anchor an execution proof to Solana via a Memo transaction.
 *
 * The memo contains: "OPENCLAW:PROOF:<hash>:<botId>:<specialization>:<filesCount>"
 * Anyone can verify this by looking up the transaction on Solana Explorer.
 */
export async function anchorExecutionProof(data: ExecutionData): Promise<ExecutionProof> {
  const hash = hashExecution(data)
  const keypair = getOrCreateKeypair()
  const timestamp = new Date().toISOString()

  // Build the memo string (kept short to minimize tx cost)
  const memo = `OPENCLAW:PROOF:${hash.slice(0, 16)}:${data.botId.slice(0, 20)}:${data.specialization}:${data.filesAnalyzed}f:${data.issuesFound}i`

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed')

    // Check if keypair has SOL for tx fees
    const balance = await connection.getBalance(keypair.publicKey)
    if (balance < 5000) {
      // Not enough SOL for a transaction — return off-chain proof
      console.log(`[Solana] Insufficient balance (${balance} lamports). Proof stored off-chain only.`)
      console.log(`[Solana] Fund this address on devnet: ${keypair.publicKey.toBase58()}`)
      return {
        hash,
        txSignature: null,
        explorerUrl: null,
        signer: keypair.publicKey.toBase58(),
        timestamp,
        onChain: false,
        network: SOLANA_NETWORK,
      }
    }

    // Create memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf-8'),
    })

    // Build and send transaction
    const tx = new Transaction().add(memoInstruction)
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment: 'confirmed',
    })

    const explorerUrl = SOLANA_NETWORK === 'mainnet-beta'
      ? `https://explorer.solana.com/tx/${signature}`
      : `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_NETWORK}`

    console.log(`[Solana] Execution proof anchored: ${signature}`)

    return {
      hash,
      txSignature: signature,
      explorerUrl,
      signer: keypair.publicKey.toBase58(),
      timestamp,
      onChain: true,
      network: SOLANA_NETWORK,
    }
  } catch (err) {
    // On-chain failed — return off-chain proof (hash is still verifiable)
    console.warn(`[Solana] On-chain anchor failed:`, err instanceof Error ? err.message : err)
    return {
      hash,
      txSignature: null,
      explorerUrl: null,
      signer: keypair.publicKey.toBase58(),
      timestamp,
      onChain: false,
      network: SOLANA_NETWORK,
    }
  }
}

/**
 * Get the Solana public key used for proofs.
 */
export function getProofPublicKey(): string {
  return getOrCreateKeypair().publicKey.toBase58()
}

/**
 * Get current Solana balance (in SOL).
 */
export async function getProofBalance(): Promise<{ sol: number; address: string; network: string }> {
  const keypair = getOrCreateKeypair()
  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed')
    const balance = await connection.getBalance(keypair.publicKey)
    return {
      sol: balance / 1e9,
      address: keypair.publicKey.toBase58(),
      network: SOLANA_NETWORK,
    }
  } catch {
    return { sol: 0, address: keypair.publicKey.toBase58(), network: SOLANA_NETWORK }
  }
}

export default { anchorExecutionProof, getProofPublicKey, getProofBalance }
