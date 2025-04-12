import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Package, Plus, RefreshCw, Truck, ArrowUp, ArrowDown, ExternalLink, Loader2 } from "lucide-react";
import { Resource } from "@shared/schema";

const resourceSchema = z.object({
  name: z.string().min(1, "Resource name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  description: z.string().optional(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

export default function ResourcesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  
  // Fetch resources
  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?ownerId=${user?.id}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch resources");
      return response.json();
    },
    enabled: !!user,
  });
  
  const createForm = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: "",
      category: "Water",
      quantity: 0,
      unit: "units",
      description: "",
    },
  });
  
  const updateForm = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: selectedResource?.name || "",
      category: selectedResource?.category || "Water",
      quantity: selectedResource?.quantity || 0,
      unit: selectedResource?.unit || "units",
      description: selectedResource?.description || "",
    },
  });
  
  // Reset update form when selected resource changes
  useEffect(() => {
    if (selectedResource) {
      updateForm.reset({
        name: selectedResource.name,
        category: "Water", // Use default value since schema doesn't have category
        quantity: selectedResource.quantity,
        unit: "units", // Use default value since schema doesn't have unit
        description: selectedResource.description || "",
      });
    }
  }, [selectedResource, updateForm]);
  
  const createResourceMutation = useMutation({
    mutationFn: async (data: ResourceFormData) => {
      const res = await apiRequest("POST", "/api/resources", {
        ...data,
        ownerId: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource created",
        description: "New resource has been added to your inventory.",
        variant: "default",
      });
      createForm.reset({
        name: "",
        category: "Water",
        quantity: 0,
        unit: "units",
        description: "",
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create resource",
        description: error.message || "There was an error creating the resource.",
        variant: "destructive",
      });
    },
  });
  
  const updateResourceMutation = useMutation({
    mutationFn: async (data: ResourceFormData & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/resources/${data.id}`, {
        ...data,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource updated",
        description: "The resource has been updated successfully.",
        variant: "default",
      });
      setIsUpdateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update resource",
        description: error.message || "There was an error updating the resource.",
        variant: "destructive",
      });
    },
  });
  
  const handleCreateSubmit = (data: ResourceFormData) => {
    if (!user) return;
    createResourceMutation.mutate(data);
  };
  
  const handleUpdateSubmit = (data: ResourceFormData) => {
    if (!user || !selectedResource) return;
    updateResourceMutation.mutate({
      ...data,
      id: selectedResource.id,
    });
  };
  
  const handleResourceAction = (resource: Resource, action: 'view' | 'update') => {
    setSelectedResource(resource);
    if (action === 'update') {
      setIsUpdateDialogOpen(true);
    }
  };
  
  const renderResourcesList = () => {
    if (isLoading) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading resources...</p>
        </div>
      );
    }
    
    if (!resources || resources.length === 0) {
      return (
        <div className="text-center p-12 bg-neutral-50 rounded-lg">
          <Package className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-800 mb-2">No resources found</h3>
          <p className="text-neutral-500 mb-6">You haven't added any resources to your inventory yet.</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Resource
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Card key={resource.id} className="overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-neutral-50 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{resource.name}</CardTitle>
                <Badge className={getResourceStatusColor(resource.quantity)}>
                  {getResourceStatus(resource.quantity)}
                </Badge>
              </div>
              <div className="text-xs text-neutral-500">
                Category: {/* Hardcoded since not in schema */}
                {resource.name.toLowerCase().includes('water') ? 'Water' : 
                 resource.name.toLowerCase().includes('food') ? 'Food' : 
                 resource.name.toLowerCase().includes('medical') ? 'Medical' : 'Other'}
              </div>
            </CardHeader>
            
            <CardContent className="py-4 flex-grow">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-500">Quantity:</span>
                  <span className="font-medium">{resource.quantity} units</span>
                </div>
                
                {resource.description && (
                  <div className="mt-2">
                    <span className="text-sm text-neutral-500">Description:</span>
                    <p className="text-sm mt-1">{resource.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="border-t pt-3 bg-white">
              <div className="flex justify-between w-full">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleResourceAction(resource, 'update')}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Update
                </Button>
                
                {(user?.userType === "firestation" || user?.userType === "ngo") && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="ml-2"
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Distribute
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <DashboardLayout title="Resource Management" subtitle="Track and manage emergency resources">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Button variant="outline" className="hidden md:flex">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {(user?.userType === "firestation" || user?.userType === "ngo") && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Resources</TabsTrigger>
          <TabsTrigger value="low">Low Stock</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {renderResourcesList()}
        </TabsContent>
        
        <TabsContent value="low">
          <div className="text-center p-8 bg-neutral-50 rounded-lg">
            <p className="text-neutral-500">
              This section will show resources with stock levels below 20%.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="critical">
          <div className="text-center p-8 bg-neutral-50 rounded-lg">
            <p className="text-neutral-500">
              This section will show resources with critically low stock (below 10%).
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Resource Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter resource name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Water">Water</SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Medical">Medical</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Shelter">Shelter</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={createForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="units">Units</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="boxes">Boxes</SelectItem>
                        <SelectItem value="packs">Packs</SelectItem>
                        <SelectItem value="pieces">Pieces</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter resource description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createResourceMutation.isPending}
                >
                  {createResourceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Add Resource"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Update Resource Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Resource</DialogTitle>
          </DialogHeader>
          
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(handleUpdateSubmit)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter resource name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={updateForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Water">Water</SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Medical">Medical</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Shelter">Shelter</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={updateForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="units">Units</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="boxes">Boxes</SelectItem>
                        <SelectItem value="packs">Packs</SelectItem>
                        <SelectItem value="pieces">Pieces</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={updateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter resource description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateResourceMutation.isPending}
                >
                  {updateResourceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Resource"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Helper functions
function getResourceStatus(quantity: number): string {
  if (quantity <= 0) return "Out of Stock";
  if (quantity < 10) return "Critical";
  if (quantity < 20) return "Low";
  return "In Stock";
}

function getResourceStatusColor(quantity: number): string {
  if (quantity <= 0) return "bg-red-100 text-red-800";
  if (quantity < 10) return "bg-orange-100 text-orange-800";
  if (quantity < 20) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}