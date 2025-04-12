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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const resourceDonationSchema = z.object({
  recipientId: z.number(),
  resourceType: z.string().min(1, "Resource type is required"),
  resourceQuantity: z.number().min(1, "Quantity must be at least 1"),
  description: z.string().optional(),
});

type ResourceDonationFormData = z.infer<typeof resourceDonationSchema>;

export default function ResourceDonationCard({ recipientId }: { recipientId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<ResourceDonationFormData>({
    resolver: zodResolver(resourceDonationSchema),
    defaultValues: {
      recipientId,
      resourceType: "Water",
      resourceQuantity: 1,
      description: "",
    },
  });
  
  const donationMutation = useMutation({
    mutationFn: async (data: ResourceDonationFormData) => {
      const res = await apiRequest("POST", "/api/donations", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Donation successful",
        description: "Your resources have been donated successfully.",
        variant: "default",
      });
      form.reset({
        recipientId,
        resourceType: "Water",
        resourceQuantity: 1,
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
    },
    onError: (error) => {
      toast({
        title: "Donation failed",
        description: error.message || "There was an error processing your donation.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: ResourceDonationFormData) => {
    if (!user) return;
    
    donationMutation.mutate({
      ...data,
      recipientId: Number(data.recipientId),
      resourceQuantity: Number(data.resourceQuantity),
    });
  };
  
  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">Donate Resources</h3>
        <div className="mt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="resourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Water">Water</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                        <SelectItem value="Shelter">Shelter</SelectItem>
                        <SelectItem value="Clothes">Clothes</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="resourceQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional details about the donation..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" disabled={donationMutation.isPending}>
                  {donationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Donate Resources"
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