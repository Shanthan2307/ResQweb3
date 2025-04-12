import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getConnection, SOLANA_NETWORK } from '@/lib/solana/config';
import { getSOLBalance, getUSDCBalance } from '@/lib/solana/utils';

// Define the context type
interface WalletContextType {
  wallet: {
    connected: boolean;
    publicKey: PublicKey | null;
    balance: {
      sol: number;
      usdc: number;
    };
  };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
  refreshBalance: () => Promise<void>;
}

// Create the context with a default value
const WalletContext = createContext<WalletContextType | null>(null);

// Provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState({
    connected: false,
    publicKey: null as PublicKey | null,
    balance: {
      sol: 0,
      usdc: 0,
    },
  });

  // Connect to wallet (Phantom)
  const connect = async () => {
    try {
      // Check if Phantom is installed
      const phantomProvider = (window as any)?.phantom?.solana;
      
      if (!phantomProvider) {
        window.open('https://phantom.app/', '_blank');
        throw new Error('Please install Phantom wallet from phantom.app');
      }

      // Connect to wallet
      const response = await phantomProvider.connect();
      const publicKey = new PublicKey(response.publicKey.toString());
      
      setWallet(prev => ({
        ...prev,
        connected: true,
        publicKey,
      }));

      // Get balances
      await refreshBalance(publicKey);
      
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  };

  // Disconnect from wallet
  const disconnect = async () => {
    try {
      const phantomProvider = (window as any)?.phantom?.solana;
      
      if (phantomProvider) {
        await phantomProvider.disconnect();
      }
      
      setWallet({
        connected: false,
        publicKey: null,
        balance: {
          sol: 0,
          usdc: 0,
        },
      });
    } catch (error) {
      console.error('Error disconnecting from wallet:', error);
      throw error;
    }
  };

  // Sign and send a transaction
  const signAndSendTransaction = async (transaction: Transaction): Promise<string> => {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      const phantomProvider = (window as any)?.phantom?.solana;
      
      if (!phantomProvider) {
        throw new Error('Phantom wallet not available');
      }

      // Request signature and send transaction
      const { signature } = await phantomProvider.signAndSendTransaction(transaction);
      
      // Wait for confirmation
      const connection = getConnection();
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Refresh balances after transaction
      await refreshBalance();
      
      return signature;
    } catch (error) {
      console.error('Error signing and sending transaction:', error);
      throw error;
    }
  };

  // Refresh balance
  const refreshBalance = async (publicKey: PublicKey | null = null) => {
    try {
      const walletKey = publicKey || wallet.publicKey;
      
      if (!walletKey) {
        return;
      }

      // Get SOL balance
      const solBalance = await getSOLBalance(walletKey);
      
      // Get USDC balance
      const usdcBalance = await getUSDCBalance(walletKey);
      
      setWallet(prev => ({
        ...prev,
        balance: {
          sol: solBalance,
          usdc: usdcBalance,
        },
      }));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Check wallet connection on load
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const phantomProvider = (window as any)?.phantom?.solana;
        
        if (phantomProvider && phantomProvider.isConnected) {
          const publicKey = new PublicKey(phantomProvider.publicKey.toString());
          
          setWallet(prev => ({
            ...prev,
            connected: true,
            publicKey,
          }));

          await refreshBalance(publicKey);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkWalletConnection();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connect,
        disconnect,
        signAndSendTransaction,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook to use the wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}