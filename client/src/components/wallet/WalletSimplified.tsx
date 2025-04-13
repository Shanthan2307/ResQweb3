import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Wallet as WalletIcon, ExternalLink, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { SOLANA_NETWORK } from '@/lib/solana/config';
import { Connection, PublicKey } from '@solana/web3.js';

// USDC mint address on Solana devnet
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Use devnet RPC endpoint
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

interface WalletSimplifiedProps {
  onWalletUpdate?: (status: 'disconnected' | 'connected' | 'error', balance: { sol: number, usdc: number }) => void;
}

export default function WalletSimplified({ onWalletUpdate }: WalletSimplifiedProps) {
  const [walletStatus, setWalletStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState({ sol: 0, usdc: 0 });
  const [connection] = useState(new Connection(RPC_ENDPOINT, 'confirmed'));

  // Notify parent component of wallet status and balance changes
  useEffect(() => {
    if (onWalletUpdate) {
      onWalletUpdate(walletStatus, balance);
    }
  }, [walletStatus, balance, onWalletUpdate]);

  useEffect(() => {
    // Check if Phantom is installed
    if (typeof window !== 'undefined' && (window as any)?.phantom?.solana) {
      const phantom = (window as any).phantom.solana;
      
      // Listen for account changes
      phantom.on('accountChanged', (publicKey: PublicKey) => {
        if (publicKey) {
          setAddress(publicKey.toString());
          fetchBalances(publicKey);
        } else {
          handleDisconnect();
        }
      });

      // Check if already connected
      phantom.connect({ onlyIfTrusted: true })
        .then(({ publicKey }: { publicKey: PublicKey }) => {
          setWalletStatus('connected');
          setAddress(publicKey.toString());
          fetchBalances(publicKey);
        })
        .catch(() => {
          setWalletStatus('disconnected');
        });
    }
  }, []);

  const fetchBalances = async (publicKey: PublicKey) => {
    try {
      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      setBalance(prev => ({ ...prev, sol: solBalance / 1e9 }));

      // Fetch USDC balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: USDC_MINT,
      });
      
      if (tokenAccounts.value.length > 0) {
        const usdcBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        setBalance(prev => ({ ...prev, usdc: usdcBalance }));
      } else {
        setBalance(prev => ({ ...prev, usdc: 0 }));
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      const phantom = (window as any).phantom.solana;
      const { publicKey } = await phantom.connect();
      setWalletStatus('connected');
      setAddress(publicKey.toString());
      fetchBalances(publicKey);
    } catch (error) {
      setWalletStatus('error');
      console.error('Error connecting wallet:', error);
    }
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    try {
      const phantom = (window as any).phantom.solana;
      await phantom.disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
    setWalletStatus('disconnected');
    setAddress(null);
    setBalance({ sol: 0, usdc: 0 });
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get explorer URL for the address
  const getExplorerUrl = () => {
    if (!address) return '#';
    return `https://explorer.solana.com/address/${address}?cluster=${SOLANA_NETWORK}`;
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (walletStatus === 'error') {
    return (
      <Card className="shadow-md border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center text-red-600">
            <AlertCircle className="mr-2 h-5 w-5" />
            Wallet Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm">
            Unable to connect to Phantom wallet. Please make sure you have the Phantom wallet browser extension installed.
          </p>
          <div className="mt-4">
            <a 
              href="https://phantom.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center"
            >
              Get Phantom Wallet
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setWalletStatus('disconnected')} variant="outline" className="w-full">
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (walletStatus === 'disconnected') {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Connect Wallet</CardTitle>
          <CardDescription>
            Connect your Solana wallet to make donations and track blockchain transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600 pb-4">
          <p>Connect your Solana wallet to make donations and verify resource contributions on the blockchain.</p>
          <p className="mt-2 text-xs text-neutral-500">
            Note: This is a demo wallet integration. In a production environment, you would connect to an actual Solana wallet.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleConnect} className="w-full">
            <WalletIcon className="mr-2 h-4 w-4" />
            Connect Phantom Wallet
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center">
            <WalletIcon className="mr-2 h-5 w-5" />
            Connected Wallet
          </span>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>Disconnect</Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4 space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-neutral-500">Address</div>
          <div className="flex items-center">
            <code className="bg-neutral-100 px-2 py-1 rounded text-sm">
              {address && formatAddress(address)}
            </code>
            <button 
              onClick={copyAddress} 
              className="ml-2 p-1 hover:bg-neutral-100 rounded-md transition-colors"
              title="Copy address"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-neutral-500" />
              )}
            </button>
            <a 
              href={getExplorerUrl()} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-1 p-1 hover:bg-neutral-100 rounded-md transition-colors"
              title="View on Explorer"
            >
              <ExternalLink className="h-4 w-4 text-neutral-500" />
            </a>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-100 p-3 rounded-md">
            <div className="text-xs text-neutral-500 mb-1">SOL Balance</div>
            <div className="font-semibold">{balance.sol.toFixed(4)} SOL</div>
          </div>
          <div className="bg-neutral-100 p-3 rounded-md">
            <div className="text-xs text-neutral-500 mb-1">USDC Balance</div>
            <div className="font-semibold">{balance.usdc.toFixed(2)} USDC</div>
          </div>
        </div>
        
        <div className="text-xs text-neutral-500 mt-2">
          Network: <span className="font-medium">{SOLANA_NETWORK.charAt(0).toUpperCase() + SOLANA_NETWORK.slice(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}