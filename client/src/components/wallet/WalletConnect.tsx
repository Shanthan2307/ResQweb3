import { useState } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wallet as WalletIcon, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { SOLANA_NETWORK } from '@/lib/solana/config';

export default function WalletConnect() {
  const { wallet, connect, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  // Handle connection
  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (wallet.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get explorer URL for the address
  const getExplorerUrl = () => {
    if (!wallet.publicKey) return '#';
    return `https://explorer.solana.com/address/${wallet.publicKey.toString()}?cluster=${SOLANA_NETWORK}`;
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!wallet.connected) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Connect Wallet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600 pb-4">
          <p>Connect your Solana wallet to make donations and verify resource contributions on the blockchain.</p>
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
              {wallet.publicKey && formatAddress(wallet.publicKey.toString())}
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
            <div className="font-semibold">{wallet.balance.sol.toFixed(4)} SOL</div>
          </div>
          <div className="bg-neutral-100 p-3 rounded-md">
            <div className="text-xs text-neutral-500 mb-1">USDC Balance</div>
            <div className="font-semibold">{wallet.balance.usdc.toFixed(2)} USDC</div>
          </div>
        </div>
        
        <div className="text-xs text-neutral-500 mt-2">
          Network: <span className="font-medium">{SOLANA_NETWORK.charAt(0).toUpperCase() + SOLANA_NETWORK.slice(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}