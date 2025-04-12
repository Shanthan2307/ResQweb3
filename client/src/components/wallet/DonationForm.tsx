import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWallet } from '@/hooks/use-wallet';
import { processUSDCDonation } from '@/lib/solana/utils';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { User } from '@shared/schema';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// Define the form schema
const donationSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(Number(val)), { message: "Amount must be a number" })
    .refine(val => Number(val) > 0, { message: "Amount must be greater than 0" }),
  recipientId: z.string().refine(val => !isNaN(Number(val)), { message: "Please select a recipient" }),
  purpose: z.string().min(3, { message: "Purpose must be at least 3 characters" }).max(100),
});

type DonationFormValues = z.infer<typeof donationSchema>;

export default function DonationForm() {
  const { user } = useAuth();
  const { wallet, signAndSendTransaction } = useWallet();
  const [donationStatus, setDonationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Set up the form
  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: '',
      recipientId: '',
      purpose: '',
    },
  });

  // Query to fetch recipients (fire stations and NGOs)
  const { data: fireStations } = useQuery<User[]>({
    queryKey: ['/api/fire-stations'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/fire-stations');
      return res.json();
    },
  });

  const { data: ngos } = useQuery<User[]>({
    queryKey: ['/api/ngos'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/ngos');
      return res.json();
    },
  });

  // Mutation to record donation in the database after blockchain transaction
  const recordDonationMutation = useMutation({
    mutationFn: async (data: { 
      donorId: number;
      recipientId: number;
      amount: number;
      purpose: string;
      transactionSignature: string;
    }) => {
      const res = await apiRequest('POST', '/api/donations', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/donations'] });
      setDonationStatus('success');
      form.reset();
    },
    onError: () => {
      setDonationStatus('error');
    },
  });

  // Handle form submission
  const onSubmit = async (data: DonationFormValues) => {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      setDonationStatus('processing');

      // Process USDC donation on blockchain
      const amount = parseFloat(data.amount);
      const recipientId = parseInt(data.recipientId);

      const donationDetails = {
        senderId: user.id,
        receiverId: recipientId,
        timestamp: Date.now(),
        purpose: data.purpose,
      };

      // Create the transaction
      const transaction = await processUSDCDonation(
        wallet.publicKey,
        amount,
        donationDetails
      );

      // Sign and send the transaction
      const signature = await signAndSendTransaction(transaction);
      setTxSignature(signature);

      // Record the donation in our database
      await recordDonationMutation.mutateAsync({
        donorId: user.id,
        recipientId,
        amount,
        purpose: data.purpose,
        transactionSignature: signature,
      });
    } catch (error) {
      console.error('Error processing donation:', error);
      setDonationStatus('error');
    }
  };

  // Show different card based on donation status
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
          {txSignature && (
            <div className="mt-2">
              <p className="text-xs text-neutral-500">Transaction Hash:</p>
              <a 
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline break-all"
              >
                {txSignature}
              </a>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => {
              setDonationStatus('idle');
              setTxSignature(null);
            }} 
            variant="outline" 
            className="w-full"
          >
            Make Another Donation
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (donationStatus === 'error') {
    return (
      <Card className="shadow-md border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center text-red-600">
            <AlertCircle className="mr-2 h-5 w-5" />
            Donation Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm">There was an error processing your donation. Please try again.</p>
          <p className="text-xs text-neutral-500 mt-2">
            Common issues include:
            <ul className="list-disc pl-5 mt-1">
              <li>Insufficient USDC balance</li>
              <li>Wallet disconnected during transaction</li>
              <li>Transaction rejected by user</li>
            </ul>
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => setDonationStatus('idle')} 
            variant="outline" 
            className="w-full"
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Combine recipients
  const recipients = [
    ...(fireStations || []).map(station => ({
      id: station.id.toString(),
      name: station.name || station.username,
      type: 'Fire Station'
    })),
    ...(ngos || []).map(ngo => ({
      id: ngo.id.toString(),
      name: ngo.name || ngo.username,
      type: 'NGO'
    }))
  ];

  // Show donation form
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Make USDC Donation</CardTitle>
        <CardDescription>
          Donate USDC directly to fire stations or NGOs on the Solana blockchain
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pb-3">
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
                    />
                  </FormControl>
                  <FormDescription>
                    Current balance: {wallet.balance.usdc.toFixed(2)} USDC
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
                      {recipients.length > 0 ? (
                        recipients.map(recipient => (
                          <SelectItem 
                            key={recipient.id} 
                            value={recipient.id}
                          >
                            {recipient.name} ({recipient.type})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>
                          Loading recipients...
                        </SelectItem>
                      )}
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
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!wallet.connected || donationStatus === 'processing'}
            >
              {donationStatus === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
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