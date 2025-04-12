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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const volunteerRegistrationSchema = z.object({
  fireStationId: z.number(),
  skills: z.array(z.string()).min(1, "Please select at least one skill"),
  availability: z.array(z.string()).min(1, "Please select at least one availability slot"),
  emergencyContact: z.string().min(10, "Emergency contact should be at least 10 characters"),
});

type VolunteerRegistrationFormData = z.infer<typeof volunteerRegistrationSchema>;

const availabilityOptions = [
  { id: "weekday-morning", label: "Weekday Mornings" },
  { id: "weekday-afternoon", label: "Weekday Afternoons" },
  { id: "weekday-evening", label: "Weekday Evenings" },
  { id: "weekend-morning", label: "Weekend Mornings" },
  { id: "weekend-afternoon", label: "Weekend Afternoons" },
  { id: "weekend-evening", label: "Weekend Evenings" },
  { id: "emergency-call", label: "Emergency On-Call" },
];

const skillOptions = [
  { id: "first-aid", label: "First Aid" },
  { id: "cpr", label: "CPR Certified" },
  { id: "heavy-lifting", label: "Heavy Lifting" },
  { id: "driving", label: "Emergency Vehicle Driving" },
  { id: "communications", label: "Communications" },
  { id: "coordination", label: "Coordination" },
  { id: "medical", label: "Medical Background" },
];

export default function VolunteerRegistrationCard({ fireStationId }: { fireStationId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<VolunteerRegistrationFormData>({
    resolver: zodResolver(volunteerRegistrationSchema),
    defaultValues: {
      fireStationId,
      skills: [],
      availability: [],
      emergencyContact: "",
    },
  });
  
  const volunteerMutation = useMutation({
    mutationFn: async (data: VolunteerRegistrationFormData) => {
      const res = await apiRequest("POST", "/api/volunteers", {
        ...data,
        userId: user?.id
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "You have been registered as a volunteer. Thank you for your service!",
        variant: "default",
      });
      form.reset({
        fireStationId,
        skills: [],
        availability: [],
        emergencyContact: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message || "There was an error registering you as a volunteer.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: VolunteerRegistrationFormData) => {
    if (!user) return;
    volunteerMutation.mutate(data);
  };
  
  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">Volunteer Registration</h3>
        <div className="mt-2 max-w-xl text-sm text-neutral-500">
          <p>Register as a volunteer to help during emergencies and provide support to your local fire station.</p>
        </div>
        
        <div className="mt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-neutral-700 mb-3">Skills & Capabilities</h4>
                <FormField
                  control={form.control}
                  name="skills"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-2">
                        {skillOptions.map((skill) => (
                          <FormField
                            key={skill.id}
                            control={form.control}
                            name="skills"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={skill.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(skill.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, skill.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== skill.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {skill.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-neutral-700 mb-3">Availability</h4>
                <FormField
                  control={form.control}
                  name="availability"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-2">
                        {availabilityOptions.map((option) => (
                          <FormField
                            key={option.id}
                            control={form.control}
                            name="availability"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={option.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, option.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== option.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {option.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Information</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide emergency contact details..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" disabled={volunteerMutation.isPending}>
                  {volunteerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Register as Volunteer"
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