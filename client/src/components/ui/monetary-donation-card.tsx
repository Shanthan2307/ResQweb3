import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";

// Define a simple IDL for the direct transfer program
const idl = {
  version: "0.1.0",
  name: "direct_transfer",
  instructions: [
    {
      name: "directTransfer",
      accounts: [
        { name: "sponsor", isMut: true, isSigner: true },
        { name: "sponsorTokenAccount", isMut: true, isSigner: false },
        { name: "merchantTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    }
  ]
};

const SOLANA_USDC_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PROGRAM_ID = new PublicKey("AXy9RYUDN2siZSrQ5EXHSyQkKgq2QoG27dKiVamUu6hx");

// We'll need Stripe API keys to implement payment processing
const monetaryDonationSchema = z.object({
  recipientId: z.number(),
  amount: z.number().min(1, "Amount must be at least 1"),
  currency: z.string().default("USD"),
});

type MonetaryDonationFormData = z.infer<typeof monetaryDonationSchema>;

export default function MonetaryDonationCard({ recipientId }: { recipientId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const wallet = useWallet();
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  
  const form = useForm<MonetaryDonationFormData>({
    resolver: zodResolver(monetaryDonationSchema),
    defaultValues: {
      recipientId,
      amount: 10,
      currency: "USD",
    },
  });
  
  const donationMutation = useMutation({
    mutationFn: async (data: MonetaryDonationFormData) => {
      // Step 1: Create payment intent
      const paymentIntentRes = await apiRequest("POST", "/api/create-payment-intent", { amount: data.amount });
      const { clientSecret } = await paymentIntentRes.json();
      
      // In a real implementation, we would use the clientSecret to process the payment
      // using Stripe's Elements or Payment components.
      
      // For now we'll just simulate payment success
      setIsPaymentProcessing(true);
      
      // Simulate payment processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Create donation record
      const donationRes = await apiRequest("POST", "/api/donations", data);
      
      setIsPaymentProcessing(false);
      return await donationRes.json();
    },
    onSuccess: () => {
      toast({
        title: "Donation successful",
        description: "Your payment has been processed successfully.",
        variant: "default",
      });
      form.reset({
        recipientId,
        amount: 10,
        currency: "USD",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
    },
    onError: (error) => {
      setIsPaymentProcessing(false);
      toast({
        title: "Donation failed",
        description: error.message || "There was an error processing your donation.",
        variant: "destructive",
      });
    },
  });
  
  const handleDirectTransfer = async (amount: number) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast({
        title: "Wallet Error",
        description: "Please connect your Phantom wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!amount || amount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount",
          variant: "destructive",
        });
        return;
      }

      const sponsorPubKey = wallet.publicKey;
      const merchantPubKey = new PublicKey("AXy9RYUDN2siZSrQ5EXHSyQkKgq2QoG27dKiVamUu6hx");
      const amountInSmallestUnit = Math.floor(amount * 1e6);
      const usdcMint = new PublicKey(SOLANA_USDC_ADDRESS);

      const sponsorTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        sponsorPubKey,
        { mint: usdcMint }
      );
      if (sponsorTokenAccounts.value.length === 0) {
        toast({
          title: "Token Account Error",
          description: "You do not have a USDC token account",
          variant: "destructive",
        });
        return;
      }
      const sponsorTokenAccount = new PublicKey(sponsorTokenAccounts.value[0].pubkey);

      const merchantTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        merchantPubKey,
        { mint: usdcMint }
      );
      if (merchantTokenAccounts.value.length === 0) {
        toast({
          title: "Token Account Error",
          description: "Beneficiary does not have a USDC token account",
          variant: "destructive",
        });
        return;
      }
      const merchantTokenAccount = new PublicKey(merchantTokenAccounts.value[0].pubkey);

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

      const program = new Program(idl as Idl, PROGRAM_ID, provider);

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
        title: "Transfer Successful",
        description: `Transaction ID: ${tx}`,
        variant: "default",
      });

    } catch (error: any) {
      console.error("❌ Error in direct transfer:", error);
      toast({
        title: "Transfer Failed",
        description: error.message || 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: MonetaryDonationFormData) => {
    if (!user) return;
    
    // Call handleDirectTransfer instead of donationMutation
    handleDirectTransfer(data.amount);
  };
  
  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">Donate Funds</h3>
        <div className="mt-2 max-w-xl text-sm text-neutral-500">
          <p>Your monetary donations help fire stations acquire necessary resources quickly.</p>
        </div>
        
        <div className="mt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[10, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    className={amount === form.getValues().amount ? "border-primary-500 bg-primary-50" : ""}
                    onClick={() => form.setValue("amount", amount)}
                  >
                    ${amount}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className={!([10, 25, 50, 100].includes(form.getValues().amount)) ? "border-primary-500 bg-primary-50" : ""}
                  onClick={() => document.getElementById("custom-amount")?.focus()}
                >
                  Custom
                </Button>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={donationMutation.isPending || isPaymentProcessing}>
                  {donationMutation.isPending || isPaymentProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    "Donate Now"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}