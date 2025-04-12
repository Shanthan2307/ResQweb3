import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from 'date-fns';
import { 
  HomeIcon as BuildingCommunity, 
  Search, 
  MapPin, 
  Phone, 
  UserPlus, 
  Users, 
  Check, 
  X, 
  RefreshCw,
  Loader2
} from "lucide-react";
import { User } from "@shared/schema";

const partnershipRequestSchema = z.object({
  fireStationId: z.number().positive("Please select a fire station"),
  message: z.string().min(10, "Please provide a short message to the fire station"),
});

type PartnershipRequestFormData = z.infer<typeof partnershipRequestSchema>;

export default function PartnershipsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPartnershipDialogOpen, setIsPartnershipDialogOpen] = useState(false);
  const [selectedFireStation, setSelectedFireStation] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch fire stations
  const { data: fireStations, isLoading: isLoadingFireStations } = useQuery<User[]>({
    queryKey: ["/api/fire-stations"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0], {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch fire stations");
      return response.json();
    },
    enabled: !!user && user.userType === "ngo",
  });
  
  // Fetch partnerships
  const { data: partnerships, isLoading: isLoadingPartnerships } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?ngoId=${user?.id}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch partnerships");
      return response.json();
    },
    enabled: !!user && user.userType === "ngo",
  });
  
  const form = useForm<PartnershipRequestFormData>({
    resolver: zodResolver(partnershipRequestSchema),
    defaultValues: {
      fireStationId: selectedFireStation?.id || 0,
      message: "",
    },
  });
  
  // Update form when selected fire station changes
  useEffect(() => {
    if (selectedFireStation) {
      form.setValue("fireStationId", selectedFireStation.id);
    }
  }, [selectedFireStation, form]);
  
  const createPartnershipMutation = useMutation({
    mutationFn: async (data: PartnershipRequestFormData) => {
      const res = await apiRequest("POST", "/api/partnerships", {
        ...data,
        ngoId: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Partnership request sent",
        description: "Your partnership request has been sent successfully.",
        variant: "default",
      });
      form.reset({
        fireStationId: 0,
        message: "",
      });
      setIsPartnershipDialogOpen(false);
      setSelectedFireStation(null);
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
    },
    onError: (error) => {
      toast({
        title: "Request failed",
        description: error.message || "There was an error sending your partnership request.",
        variant: "destructive",
      });
    },
  });
  
  const handlePartnershipRequest = (data: PartnershipRequestFormData) => {
    if (!user) return;
    createPartnershipMutation.mutate(data);
  };
  
  const openPartnershipDialog = (fireStation: User) => {
    setSelectedFireStation(fireStation);
    setIsPartnershipDialogOpen(true);
  };
  
  const filteredFireStations = searchQuery && fireStations
    ? fireStations.filter(station => 
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (station.pinCodeRangeStart && station.pinCodeRangeStart.toString().includes(searchQuery)) ||
        (station.pinCodeRangeEnd && station.pinCodeRangeEnd.toString().includes(searchQuery))
      )
    : fireStations;
  
  const renderFireStationsList = () => {
    if (isLoadingFireStations) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading fire stations...</p>
        </div>
      );
    }
    
    if (!fireStations || fireStations.length === 0) {
      return (
        <div className="text-center p-12 bg-neutral-50 rounded-lg">
          <BuildingCommunity className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-800 mb-2">No fire stations found</h3>
          <p className="text-neutral-500">There are no fire stations registered in the system.</p>
        </div>
      );
    }
    
    if (filteredFireStations && filteredFireStations.length === 0) {
      return (
        <div className="text-center p-8 bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">No fire stations match your search criteria.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFireStations?.map((station) => {
          // Check if already partnered
          const isPartnered = partnerships?.some(p => 
            p.fireStationId === station.id && p.status === "active"
          );
          
          // Check if partnership request is pending
          const isPending = partnerships?.some(p => 
            p.fireStationId === station.id && p.status === "pending"
          );
          
          return (
            <Card key={station.id} className="overflow-hidden h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{station.name}</CardTitle>
                  {isPartnered && (
                    <Badge className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" /> Partnered
                    </Badge>
                  )}
                  {isPending && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <RefreshCw className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  ID: {station.id}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2 flex-grow">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-neutral-500 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <p>PIN Codes: {station.pinCodeRangeStart} - {station.pinCodeRangeEnd}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-4 w-4 text-neutral-500 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <p>Contact: Fire Station Admin</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-2">
                <Button 
                  variant={isPartnered ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={isPartnered || isPending}
                  onClick={() => openPartnershipDialog(station)}
                >
                  {isPartnered ? (
                    <>
                      <Users className="h-4 w-4 mr-1" />
                      View Partnership
                    </>
                  ) : isPending ? (
                    "Request Pending"
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Request Partnership
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };
  
  const renderPartnerships = () => {
    if (isLoadingPartnerships) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading partnerships...</p>
        </div>
      );
    }
    
    if (!partnerships || partnerships.length === 0) {
      return (
        <div className="text-center p-12 bg-neutral-50 rounded-lg">
          <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-800 mb-2">No partnerships found</h3>
          <p className="text-neutral-500 mb-6">
            You haven't created any partnerships with fire stations yet.
          </p>
          <Button onClick={() => setIsPartnershipDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Request New Partnership
          </Button>
        </div>
      );
    }
    
    const activePartnerships = partnerships.filter(p => p.status === "active");
    
    if (activePartnerships.length === 0) {
      return (
        <div className="text-center p-8 bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">You don't have any active partnerships yet.</p>
        </div>
      );
    }
    
    // In a real implementation, we would fetch the fire station details for each partnership
    // For now, simulate using the fireStations data
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fire Station</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activePartnerships.map((partnership) => {
              const partnerStation = fireStations?.find(s => s.id === partnership.fireStationId);
              return (
                <TableRow key={partnership.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-red-100 text-red-800">
                          {partnerStation?.name.slice(0, 2).toUpperCase() || "FS"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{partnerStation?.name || `Fire Station #${partnership.fireStationId}`}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {partnerStation ? (
                      <span>PIN {partnerStation.pinCodeRangeStart} - {partnerStation.pinCodeRangeEnd}</span>
                    ) : (
                      <span>Unknown area</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {partnership.createdAt ? format(new Date(partnership.createdAt), "MMM d, yyyy") : "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <DashboardLayout title="Partnerships" subtitle="Manage partnerships with fire stations">
      <Tabs defaultValue="explore">
        <TabsList className="mb-4">
          <TabsTrigger value="explore">
            <BuildingCommunity className="h-4 w-4 mr-2" />
            Explore Fire Stations
          </TabsTrigger>
          <TabsTrigger value="partnerships">
            <Users className="h-4 w-4 mr-2" />
            Active Partnerships
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="explore">
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search by name or PIN code..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {renderFireStationsList()}
        </TabsContent>
        
        <TabsContent value="partnerships">
          {renderPartnerships()}
        </TabsContent>
      </Tabs>
      
      {/* Partnership Request Dialog */}
      <Dialog open={isPartnershipDialogOpen} onOpenChange={setIsPartnershipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Partnership</DialogTitle>
            <DialogDescription>
              Send a partnership request to collaborate with this fire station during emergencies.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFireStation && (
            <div className="py-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selectedFireStation.name}</CardTitle>
                  <CardDescription>
                    {selectedFireStation.pinCodeRangeStart && selectedFireStation.pinCodeRangeEnd && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        PIN Codes: {selectedFireStation.pinCodeRangeStart} - {selectedFireStation.pinCodeRangeEnd}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePartnershipRequest)} className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Tell the fire station why you'd like to partner with them..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsPartnershipDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createPartnershipMutation.isPending}
                    >
                      {createPartnershipMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Request"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}