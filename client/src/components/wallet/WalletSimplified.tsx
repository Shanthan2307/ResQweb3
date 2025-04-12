import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Wallet as WalletIcon, ExternalLink, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { SOLANA_NETWORK } from '@/lib/solana/config';

export default function WalletSimplified() {
  const [walletStatus, setWalletStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fakeBalance, setFakeBalance] = useState({ sol: 0, usdc: 0 });

  // Simulate wallet connection
  const handleConnect = async () => {
    try {
      // Check if browser has a phantom wallet object
      if (typeof window !== 'undefined' && (window as any)?.phantom?.solana) {
        setWalletStatus('connected');
        setAddress('FakeSo1ana4ddress1111111111111111111111111111');
        setFakeBalance({
          sol: 5.2345,
          usdc: 100.00
        });
      } else {
        setWalletStatus('error');
      }
    } catch (error) {
      setWalletStatus('error');
      console.error('Error connecting wallet:', error);
    }
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    setWalletStatus('disconnected');
    setAddress(null);
    setFakeBalance({ sol: 0, usdc: 0 });
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
            <div className="font-semibold">{fakeBalance.sol.toFixed(4)} SOL</div>
          </div>
          <div className="bg-neutral-100 p-3 rounded-md">
            <div className="text-xs text-neutral-500 mb-1">USDC Balance</div>
            <div className="font-semibold">{fakeBalance.usdc.toFixed(2)} USDC</div>
          </div>
        </div>
        
        <div className="text-xs text-neutral-500 mt-2">
          Network: <span className="font-medium">{SOLANA_NETWORK.charAt(0).toUpperCase() + SOLANA_NETWORK.slice(1)}</span>
          <div className="mt-1 p-2 bg-yellow-50 text-yellow-700 rounded">
            This is a demo wallet component, not connected to a real wallet.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}