import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CreditCard, ArrowRightLeft, Wallet, Loader2, Coins } from "lucide-react";
import { Donation } from "@shared/schema";
import WalletSimplified from "@/components/wallet/WalletSimplified";
import DonationFormSimplified from "@/components/wallet/DonationFormSimplified";
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const addFundsSchema = z.object({
  amount: z.number().min(1, "Amount must be at least 1"),
});

type AddFundsFormData = z.infer<typeof addFundsSchema>;

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [walletBalance, setWalletBalance] = useState({ sol: 0, usdc: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // Fetch transactions (donations)
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Donation[]>({
    queryKey: ["/api/donations"],
    queryFn: async ({ queryKey }) => {
      if (!user) return [];
      
      const donorParam = user.userType === "local" ? `donorId=${user.id}` : "";
      const recipientParam = user.userType !== "local" ? `recipientId=${user.id}` : "";
      const queryParam = donorParam || recipientParam;
      
      const response = await fetch(`${queryKey[0]}?${queryParam}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!user,
  });
  
  const form = useForm<AddFundsFormData>({
    resolver: zodResolver(addFundsSchema),
    defaultValues: {
      amount: 100,
    },
  });
  
  const addFundsMutation = useMutation({
    mutationFn: async (data: AddFundsFormData) => {
      // Step 1: Create payment intent
      setIsPaymentProcessing(true);
      const paymentIntentRes = await apiRequest("POST", "/api/create-payment-intent", { amount: data.amount });
      const { clientSecret } = await paymentIntentRes.json();
      
      // In a real implementation, we would use the clientSecret with Stripe Elements
      // For now, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Add funds to wallet
      const res = await apiRequest("POST", "/api/wallet/add-funds", { amount: data.amount });
      setIsPaymentProcessing(false);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Funds added",
        description: "Your wallet has been successfully topped up.",
        variant: "default",
      });
      form.reset({
        amount: 100,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      setIsPaymentProcessing(false);
      toast({
        title: "Transaction failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: AddFundsFormData) => {
    if (!user) return;
    
    // Only local users can add funds to their wallet
    if (user.userType !== "local") {
      toast({
        title: "Not allowed",
        description: "Only local users can add funds directly to their wallet.",
        variant: "destructive",
      });
      return;
    }
    
    addFundsMutation.mutate({
      amount: Number(data.amount),
    });
  };
  
  const renderTransactionList = () => {
    if (isLoadingTransactions) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading transactions...</p>
        </div>
      );
    }
    
    if (!transactions || transactions.length === 0) {
      return (
        <div className="text-center p-8 bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">No transaction history found.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>{user?.userType === "local" ? "Recipient" : "From"}</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {user?.userType === "local" ? transaction.recipientId : transaction.donorId}
                </TableCell>
                <TableCell>
                  {transaction.amount ? "Money Transfer" : "Resource Donation"}
                </TableCell>
                <TableCell>
                  {transaction.amount ? (
                    <span className={user?.userType === "local" ? "text-red-600" : "text-green-600"}>
                      {user?.userType === "local" ? "-" : "+"}{transaction.amount} {transaction.currency}
                    </span>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={transaction.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  const handleWalletUpdate = (status: 'disconnected' | 'connected' | 'error', balance: { sol: number, usdc: number }) => {
    setWalletStatus(status);
    setWalletBalance(balance);
  };

  // Fetch blockchain transactions
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!wallet.connected || !wallet.publicKey) return;
      
      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
        
        // Get token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          { mint: USDC_MINT }
        );
        
        if (tokenAccounts.value.length > 0) {
          const tokenAccount = tokenAccounts.value[0].pubkey;
          
          // Get recent transactions
          const signatures = await connection.getSignaturesForAddress(
            tokenAccount,
            { limit: 4 }
          );
          
          const transactions = await Promise.all(
            signatures.map(async (sig) => {
              const tx = await connection.getParsedTransaction(sig.signature);
              return {
                id: sig.signature,
                date: new Date(sig.blockTime! * 1000),
                amount: tx?.meta?.postTokenBalances?.[0]?.uiTokenAmount?.uiAmount || 0,
                status: 'completed',
                type: 'USDC Transfer'
              };
            })
          );
          
          setRecentTransactions(transactions);
        }
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
      }
    };
    
    fetchRecentTransactions();
  }, [wallet.connected, wallet.publicKey]);

  return (
    <DashboardLayout title="Wallet & Transactions" subtitle="Manage your funds and view transaction history">
      {/* Wallet Card */}
      <Card className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-full p-3">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <div className="text-sm font-medium text-white/80">Current Balance</div>
              {walletStatus === 'connected' ? (
                <div className="text-3xl font-bold">{walletBalance.usdc.toFixed(2)} USDC</div>
              ) : (
                <div className="text-lg font-medium text-white/80">Please connect wallet to see balance</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="transactions">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          {user?.userType === "local" && (
            <TabsTrigger value="add-funds">
              <CreditCard className="h-4 w-4 mr-2" />
              Add Funds
            </TabsTrigger>
          )}
          <TabsTrigger value="blockchain-wallet">
            <Coins className="h-4 w-4 mr-2" />
            Blockchain Wallet
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTransactionList()}
            </CardContent>
          </Card>
        </TabsContent>
        
        {user?.userType === "local" && (
          <TabsContent value="add-funds">
            <Card>
              <CardHeader>
                <CardTitle>Add Funds to Wallet</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (USDC)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[50, 100, 250, 500].map((amount) => (
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
                    </div>
                    
                    <div className="mt-6">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={addFundsMutation.isPending || isPaymentProcessing}
                      >
                        {addFundsMutation.isPending || isPaymentProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing Payment...
                          </>
                        ) : (
                          "Add Funds"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="blockchain-wallet">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WalletSimplified onWalletUpdate={handleWalletUpdate} />
            <DonationFormSimplified />
          </div>
          
          {/* Recent Transactions Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {!wallet.connected ? (
                <div className="text-center p-8 bg-neutral-50 rounded-lg">
                  <p className="text-neutral-500">Connect your wallet to see recent transactions</p>
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center p-8 bg-neutral-50 rounded-lg">
                  <p className="text-neutral-500">No recent transactions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-white p-2 rounded-full">
                          <ArrowRightLeft className="h-5 w-5 text-primary-500" />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.type}</p>
                          <p className="text-sm text-neutral-500">
                            {format(transaction.date, "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-primary-600">
                          {transaction.amount} USDC
                        </p>
                        <StatusBadge status={transaction.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About Blockchain Integration</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <p>
                  The RESQ platform integrates with the Solana blockchain to enhance transparency and accountability
                  in emergency resource management. Here's what you can do:
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">For Resource Providers:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Record resource fulfillments on the blockchain, creating immutable proof of contributions</li>
                    <li>Establish a verifiable record of your community support during emergencies</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">For Donors:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Send USDC donations directly to fire stations and NGOs with transparent transaction records</li>
                    <li>Track how funds are being used with blockchain verification</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">For Fire Stations & NGOs:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Receive donations in USDC directly to your Solana wallet</li>
                    <li>Verify resource receipts with tamper-proof blockchain confirmation</li>
                  </ul>
                </div>

                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                  <p className="font-medium">Demo Implementation Note</p>
                  <p className="text-xs mt-1">
                    This demo shows UI and interaction flows for blockchain integration without requiring actual Solana wallet connection.
                    In a production environment, the full implementation would connect to real Solana wallets and perform actual blockchain
                    transactions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "bg-neutral-100 text-neutral-800";
  
  switch (status.toLowerCase()) {
    case "pending":
      className = "bg-yellow-100 text-yellow-800";
      break;
    case "completed":
      className = "bg-green-100 text-green-800";
      break;
    case "processing":
      className = "bg-blue-100 text-blue-800";
      break;
    case "failed":
      className = "bg-red-100 text-red-800";
      break;
  }
  
  return (
    <Badge className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}