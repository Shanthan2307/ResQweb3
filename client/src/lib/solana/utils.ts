import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  TransactionInstruction 
} from '@solana/web3.js';
import { 
  createTransferInstruction, 
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import { getConnection, USDC_MINT_ADDRESS, PLATFORM_WALLET } from './config';

/**
 * Records a resource fulfillment on the Solana blockchain
 * Uses a memo instruction to store metadata about the fulfilled order
 */
export async function recordResourceFulfillment(
  walletPublicKey: PublicKey,
  resourceDetails: {
    resourceType: string;
    quantity: number;
    fireStationId: number;
    fulfillingUser: string;
    timestamp: number;
    purpose: string;
    volunteerId?: number;
  }
) {
  try {
    const connection = getConnection();
    
    // Convert resource details to a JSON string
    const metadataStr = JSON.stringify(resourceDetails);
    
    // Create a memo instruction to store the resource fulfillment data
    const dataEncoder = new TextEncoder();
    const encodedData = dataEncoder.encode(metadataStr);
    // Convert to Buffer for Solana compatibility
    const data = Buffer.from(encodedData);
    
    // Memo program ID
    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    
    // Create the memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: memoProgramId,
      data,
    });
    
    // Create a small SOL transfer to make the transaction valid
    // In a production app, we'd use a proper program to record this data
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: walletPublicKey,
      toPubkey: PLATFORM_WALLET.publicKey,
      lamports: 5000, // A small fee in lamports (0.000005 SOL)
    });
    
    // Create a transaction and add the instructions
    const transaction = new Transaction().add(memoInstruction, transferInstruction);
    
    // Set the recent blockhash and fee payer
    transaction.feePayer = walletPublicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Return the serialized transaction that can be signed by the wallet
    return transaction;
  } catch (error) {
    console.error('Error recording resource fulfillment:', error);
    throw error;
  }
}

/**
 * Processes a USDC donation from a user's wallet to the platform
 */
export async function processUSDCDonation(
  walletPublicKey: PublicKey, 
  amount: number,
  donationDetails: {
    senderId: number;
    receiverId: number;
    timestamp: number;
    purpose: string;
  }
) {
  try {
    const connection = getConnection();
    
    // Get or create the associated token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      PLATFORM_WALLET, // Only used to pay for the account creation
      USDC_MINT_ADDRESS,
      walletPublicKey
    );
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      PLATFORM_WALLET,
      USDC_MINT_ADDRESS,
      PLATFORM_WALLET.publicKey
    );
    
    // USDC has 6 decimals
    const tokenAmount = amount * 1000000;
    
    // Create the transfer instruction
    const transferInstruction = createTransferCheckedInstruction(
      fromTokenAccount.address,
      USDC_MINT_ADDRESS,
      toTokenAccount.address,
      walletPublicKey,
      tokenAmount,
      6 // USDC decimals
    );
    
    // Create a memo instruction to store the donation metadata
    const metadataStr = JSON.stringify(donationDetails);
    const dataEncoder = new TextEncoder();
    const encodedData = dataEncoder.encode(metadataStr);
    // Convert to Buffer for Solana compatibility
    const data = Buffer.from(encodedData);
    
    // Memo program ID
    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    
    // Create the memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: memoProgramId,
      data,
    });
    
    // Create a transaction and add the instructions
    const transaction = new Transaction().add(transferInstruction, memoInstruction);
    
    // Set the recent blockhash and fee payer
    transaction.feePayer = walletPublicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Return the serialized transaction that can be signed by the wallet
    return transaction;
  } catch (error) {
    console.error('Error processing USDC donation:', error);
    throw error;
  }
}

/**
 * Gets the USDC balance for a wallet
 */
export async function getUSDCBalance(walletPublicKey: PublicKey): Promise<number> {
  try {
    const connection = getConnection();
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { mint: USDC_MINT_ADDRESS }
    );
    
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return balance;
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return 0;
  }
}

/**
 * Gets the SOL balance for a wallet
 */
export async function getSOLBalance(walletPublicKey: PublicKey): Promise<number> {
  try {
    const connection = getConnection();
    const balance = await connection.getBalance(walletPublicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
}