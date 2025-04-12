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
  
  const onSubmit = (data: MonetaryDonationFormData) => {
    if (!user) return;
    
    donationMutation.mutate({
      ...data,
      recipientId: Number(data.recipientId),
      amount: Number(data.amount),
    });
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