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

const resourceRequestSchema = z.object({
  resourceType: z.string().min(1, "Resource type is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().optional(),
});

type ResourceRequestFormData = z.infer<typeof resourceRequestSchema>;

export default function ResourceRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<ResourceRequestFormData>({
    resolver: zodResolver(resourceRequestSchema),
    defaultValues: {
      resourceType: "Water",
      quantity: 1,
      urgency: "medium",
      description: "",
    },
  });
  
  const requestMutation = useMutation({
    mutationFn: async (data: ResourceRequestFormData) => {
      const res = await apiRequest("POST", "/api/resource-requests", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your resource request has been submitted successfully.",
        variant: "default",
      });
      form.reset({
        resourceType: "Water",
        quantity: 1,
        urgency: "medium",
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/resource-requests"] });
    },
    onError: (error) => {
      toast({
        title: "Request failed",
        description: error.message || "There was an error submitting your request.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: ResourceRequestFormData) => {
    if (!user) return;
    
    requestMutation.mutate({
      ...data,
      quantity: Number(data.quantity),
    });
  };
  
  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">Create Resource Request</h3>
        <div className="mt-2 max-w-xl text-sm text-neutral-500">
          <p>Send a request to local residents and NGOs for needed resources.</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                name="quantity"
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
            </div>
            
            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency Level</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low - Within a week</SelectItem>
                      <SelectItem value="medium">Medium - Within 3 days</SelectItem>
                      <SelectItem value="high">High - Within 24 hours</SelectItem>
                      <SelectItem value="critical">Critical - ASAP</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Provide any additional details about the resource request..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
              <Button type="submit" disabled={requestMutation.isPending}>
                {requestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}