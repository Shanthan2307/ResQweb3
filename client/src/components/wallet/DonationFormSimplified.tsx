import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Connection, SystemProgram, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { AnchorProvider, Program } from '@project-serum/anchor';
import { PROGRAM_ID } from '@/lib/constants';
import idl from '@/lib/idl.json';
import * as anchor from '@project-serum/anchor';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

// Define the donation form schema
const donationSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(Number(val)), { message: "Amount must be a number" })
    .refine(val => Number(val) > 0, { message: "Amount must be greater than 0" }),
  recipientId: z.string().min(1, { message: "Please select a recipient" }),
  purpose: z.string().min(3, { message: "Purpose must be at least 3 characters" }).max(100),
});

type DonationFormValues = z.infer<typeof donationSchema>;

// USDC mint address on Solana devnet
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export default function DonationFormSimplified() {
  const { user } = useAuth();
  const { toast } = useToast();
  const wallet = useWallet();
  const [donationStatus, setDonationStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);

  // Fetch fire stations and NGOs from the database
  const { data: fireStations, isLoading: isLoadingFireStations } = useQuery<User[]>({
    queryKey: ['/api/fire-stations'],
    queryFn: async () => {
      const response = await fetch('/api/fire-stations', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch fire stations');
      return response.json();
    }
  });

  const { data: ngos, isLoading: isLoadingNGOs } = useQuery<User[]>({
    queryKey: ['/api/ngos'],
    queryFn: async () => {
      const response = await fetch('/api/ngos', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch NGOs');
      return response.json();
    }
  });

  // Combine fire stations and NGOs into recipients array
  const recipients = [
    ...(fireStations?.map(fs => ({
      id: fs.id.toString(),
      name: fs.name,
      type: 'Fire Station',
      walletAddress: fs.walletAddress || ''
    })) || []),
    ...(ngos?.map(ngo => ({
      id: ngo.id.toString(),
      name: ngo.name,
      type: 'NGO',
      walletAddress: ngo.walletAddress || ''
    })) || [])
  ];

  // Set up the form
  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: '',
      recipientId: '',
      purpose: '',
    },
  });

  // Fetch USDC balance when wallet is connected
  useEffect(() => {
    const fetchUsdcBalance = async () => {
      if (!wallet.connected || !wallet.publicKey) {
        setUsdcBalance(0);
        setIsLoadingBalance(false);
        return;
      }

      try {
        setIsLoadingBalance(true);
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          { mint: USDC_MINT }
        );

        if (tokenAccounts.value.length > 0) {
          const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
          setUsdcBalance(balance);
        } else {
          setUsdcBalance(0);
        }
      } catch (error) {
        console.error('Error fetching USDC balance:', error);
        setUsdcBalance(0);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchUsdcBalance();
  }, [wallet.connected, wallet.publicKey]);

  // Handle form submission
  const onSubmit = async (data: DonationFormValues) => {
    try {
      if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your Phantom wallet",
          variant: "destructive",
        });
        return;
      }

      if (usdcBalance < parseFloat(data.amount)) {
        toast({
          title: "Insufficient balance",
          description: `You only have ${usdcBalance} USDC available`,
          variant: "destructive",
        });
        return;
      }

      setDonationStatus('processing');
      
      const recipient = recipients.find(r => r.id === data.recipientId);
      if (!recipient) {
        throw new Error("Invalid recipient selected");
      }

      const sponsorPubKey = wallet.publicKey;
      const merchantPubKey = new PublicKey(recipient.walletAddress);
      const amountInSmallestUnit = Math.floor(parseFloat(data.amount) * 1e6);

      // Get connection from environment
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');

      // Get sponsor's token account
      const sponsorTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        sponsorPubKey,
        { mint: USDC_MINT }
      );
      if (sponsorTokenAccounts.value.length === 0) {
        throw new Error('You do not have a USDC token account');
      }
      const sponsorTokenAccount = new PublicKey(sponsorTokenAccounts.value[0].pubkey);

      // Get or create merchant's token account
      const merchantTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        merchantPubKey
      );

      // Check if merchant has a token account
      const merchantTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        merchantPubKey,
        { mint: USDC_MINT }
      );

      // If merchant doesn't have a token account, create one
      if (merchantTokenAccounts.value.length === 0) {
        const createTokenAccountIx = createAssociatedTokenAccountInstruction(
          sponsorPubKey, // payer
          merchantTokenAccount, // ata
          merchantPubKey, // owner
          USDC_MINT // mint
        );

        const transaction = new Transaction().add(createTokenAccountIx);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = sponsorPubKey;

        const signedTx = await wallet.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(txid);
      }

      // Create a wallet adapter that's compatible with AnchorProvider
      const walletAdapter = {
        publicKey: wallet.publicKey,
        signTransaction: async (tx: any) => {
          if (!wallet.signTransaction) {
            throw new Error("Wallet does not support transaction signing");
          }
          return await wallet.signTransaction(tx);
        },
        signAllTransactions: async (txs: any[]) => {
          if (!wallet.signAllTransactions) {
            throw new Error("Wallet does not support transaction signing");
          }
          return await wallet.signAllTransactions(txs);
        }
      };

      const provider = new AnchorProvider(connection, walletAdapter as any, {
        commitment: "confirmed",
      });

      const program = new Program(idl as any, PROGRAM_ID, provider);

      const tx = await program.methods
        .directTransfer(new anchor.BN(amountInSmallestUnit))
        .accounts({
          sponsor: sponsorPubKey,
          sponsorTokenAccount,
          merchantTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      toast({
        title: "Donation successful",
        description: `You've donated ${data.amount} USDC to ${recipient.name}`,
      });
      
      setDonationStatus('success');
      form.reset();
    } catch (error: any) {
      console.error('Error processing donation:', error);
      toast({
        title: "Donation failed",
        description: error.message || "There was an error processing your donation. Please try again.",
        variant: "destructive",
      });
      setDonationStatus('idle');
    }
  };

  // Show success card
  if (donationStatus === 'success') {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Donation Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm">Your donation has been successfully processed on the blockchain.</p>
          <p className="text-xs text-neutral-500 mt-2">
            The transaction has been confirmed and the funds have been transferred.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => setDonationStatus('idle')} 
            variant="outline" 
            className="w-full"
          >
            Make Another Donation
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show donation form
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Make USDC Donation</CardTitle>
        <CardDescription>
          Donate USDC directly to fire stations or NGOs on the blockchain
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pb-3">
            {/* Wallet Connection Status */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Wallet className="h-4 w-4 mr-2" />
                <span className="text-sm">
                  {wallet.connected ? 'Wallet Connected' : 'Wallet Not Connected'}
                </span>
              </div>
              <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
            </div>

            {wallet.connected && (
              <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
                Balance: {isLoadingBalance ? 'Loading...' : `${usdcBalance} USDC`}
              </div>
            )}

            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USDC)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter amount" 
                      {...field} 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      max={usdcBalance}
                    />
                  </FormControl>
                  <FormDescription>
                    {wallet.connected 
                      ? `Available balance: ${usdcBalance} USDC`
                      : 'Connect your wallet to see your balance'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Recipient Field */}
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recipients.map(recipient => (
                        <SelectItem 
                          key={recipient.id} 
                          value={recipient.id}
                        >
                          {recipient.name} ({recipient.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Purpose Field */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of donation purpose" 
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!wallet.connected && (
              <div className="text-xs text-neutral-500 mt-2 p-2 bg-yellow-50 text-yellow-700 rounded">
                Please connect your wallet to make a donation
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={donationStatus === 'processing' || !wallet.connected || isLoadingBalance}
            >
              {donationStatus === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : !wallet.connected ? (
                'Connect Wallet to Donate'
              ) : (
                'Donate USDC'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}