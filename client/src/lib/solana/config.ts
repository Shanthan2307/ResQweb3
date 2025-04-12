import { clusterApiUrl, Connection, PublicKey, Keypair } from '@solana/web3.js';

// Default to devnet for development
export const SOLANA_NETWORK = 'devnet';

// Connection to the Solana cluster
export const getConnection = () => new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

// USDC Token Address (this is USDC on devnet)
export const USDC_MINT_ADDRESS = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

// This would be the platform's own wallet for receiving donations
// In production, you would use a secure wallet management system
export const PLATFORM_WALLET = Keypair.generate();