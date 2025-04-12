import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2 } from 'lucide-react';

// Define the donation form schema
const donationSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(Number(val)), { message: "Amount must be a number" })
    .refine(val => Number(val) > 0, { message: "Amount must be greater than 0" }),
  recipientId: z.string().min(1, { message: "Please select a recipient" }),
  purpose: z.string().min(3, { message: "Purpose must be at least 3 characters" }).max(100),
});

type DonationFormValues = z.infer<typeof donationSchema>;

export default function DonationFormSimplified() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [donationStatus, setDonationStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  // Sample recipients
  const recipients = [
    { id: '1', name: 'Central Fire Station', type: 'Fire Station' },
    { id: '2', name: 'Westside Fire Department', type: 'Fire Station' },
    { id: '3', name: 'Emergency Relief NGO', type: 'NGO' },
    { id: '4', name: 'Disaster Response Team', type: 'NGO' },
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

  // Handle form submission
  const onSubmit = async (data: DonationFormValues) => {
    try {
      setDonationStatus('processing');
      
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Donation successful",
        description: `You've donated ${data.amount} USDC to ${recipients.find(r => r.id === data.recipientId)?.name}`,
      });
      
      setDonationStatus('success');
      form.reset();
    } catch (error) {
      console.error('Error processing donation:', error);
      toast({
        title: "Donation failed",
        description: "There was an error processing your donation. Please try again.",
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
          <p className="text-sm">Your donation has been successfully processed.</p>
          <p className="text-xs text-neutral-500 mt-2">
            Note: This is a simulated blockchain transaction for demonstration purposes.
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
                    Demo wallet has 100.00 USDC available
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
            
            <div className="text-xs text-neutral-500 mt-2 p-2 bg-yellow-50 text-yellow-700 rounded">
              This is a demo donation form that simulates blockchain transactions.
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={donationStatus === 'processing'}
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