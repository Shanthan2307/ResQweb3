import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Package,
  Loader2
} from "lucide-react";
import { ResourceRequest } from "@shared/schema";

export default function RequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ResourceRequest | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'fulfill' | 'cancel' | null>(null);
  
  // Fetch resource requests
  const { data: requests, isLoading } = useQuery<ResourceRequest[]>({
    queryKey: ["/api/resource-requests"],
    queryFn: async ({ queryKey }) => {
      let endpoint = `${queryKey[0]}`;
      
      if (user?.userType === "firestation") {
        endpoint += `?requesterId=${user.id}`;
      }
      
      const response = await fetch(endpoint, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch resource requests");
      return response.json();
    },
    enabled: !!user,
  });
  
  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/resource-requests/${requestId}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request updated",
        description: `Request has been ${actionType === 'fulfill' ? 'fulfilled' : 'cancelled'} successfully.`,
        variant: "default",
      });
      setIsActionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/resource-requests"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the request.",
        variant: "destructive",
      });
    },
  });
  
  const handleStatusUpdate = () => {
    if (!selectedRequest || !actionType) return;
    
    const newStatus = actionType === 'fulfill' ? 'fulfilled' : 'cancelled';
    updateRequestStatusMutation.mutate({ 
      requestId: selectedRequest.id, 
      status: newStatus 
    });
  };
  
  const openActionDialog = (request: ResourceRequest, action: 'fulfill' | 'cancel') => {
    setSelectedRequest(request);
    setActionType(action);
    setIsActionDialogOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'fulfilled':
        return <Badge className="bg-green-100 text-green-800">Fulfilled</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-neutral-100 text-neutral-800">{status}</Badge>;
    }
  };
  
  const getUrgencyBadge = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-800">Medium</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge className="bg-neutral-100 text-neutral-800">{urgency}</Badge>;
    }
  };
  
  const getUrgencyProgress = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'low':
        return 25;
      case 'medium':
        return 50;
      case 'high':
        return 75;
      case 'critical':
        return 100;
      default:
        return 0;
    }
  };
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-blue-500';
      case 'high':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-neutral-500';
    }
  };
  
  const renderActiveRequests = () => {
    if (isLoading) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading requests...</p>
        </div>
      );
    }
    
    if (!requests || requests.length === 0) {
      return (
        <div className="text-center p-12 bg-neutral-50 rounded-lg">
          <Package className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-800 mb-2">No resource requests found</h3>
          <p className="text-neutral-500 mb-6">
            {user?.userType === "firestation" 
              ? "You haven't created any resource requests yet."
              : "There are no active resource requests from fire stations."
            }
          </p>
          {user?.userType === "firestation" && (
            <Button>
              Create Request
            </Button>
          )}
        </div>
      );
    }
    
    const activeRequests = requests.filter(r => r.status === "pending");
    
    if (activeRequests.length === 0) {
      return (
        <div className="text-center p-8 bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">No active requests at the moment.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 gap-4">
        {activeRequests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center">
                    {request.resourceType}
                    <span className="text-sm font-normal text-neutral-500 ml-2">
                      ({request.quantity} units requested)
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Request ID: {request.id} • Created on {format(new Date(request.createdAt), "MMM d, yyyy")}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(request.status)}
                  {getUrgencyBadge(request.urgency)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="font-medium">Urgency Level</span>
                    <span className="text-neutral-500">{request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)} priority</span>
                  </div>
                  <Progress value={getUrgencyProgress(request.urgency)} className={getUrgencyColor(request.urgency)} />
                </div>
                
                {request.description && (
                  <div>
                    <p className="text-sm text-neutral-700">{request.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="pt-2 flex justify-between">
              {user?.userType === "firestation" ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openActionDialog(request, 'fulfill')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mark as Fulfilled
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openActionDialog(request, 'cancel')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel Request
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    View Details
                  </Button>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                  >
                    Fulfill Request
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderAllRequests = () => {
    if (isLoading) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading requests...</p>
        </div>
      );
    }
    
    if (!requests || requests.length === 0) {
      return (
        <div className="text-center p-8 bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">No resource requests found.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Resource Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">#{request.id}</TableCell>
                <TableCell>{request.resourceType}</TableCell>
                <TableCell>{request.quantity} units</TableCell>
                <TableCell>{format(new Date(request.createdAt), "MMM d, yyyy")}</TableCell>
                <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell>
                  {request.status === "pending" && user?.userType === "firestation" && (
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openActionDialog(request, 'fulfill')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Fulfill
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openActionDialog(request, 'cancel')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {(request.status !== "pending" || user?.userType !== "firestation") && (
                    <Button 
                      variant="outline" 
                      size="sm"
                    >
                      View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <DashboardLayout title="Resource Requests" subtitle="Track and manage resource requests">
      <div className="flex justify-between items-center mb-6">
        <div>
          {requests && requests.length > 0 && (
            <div className="bg-white shadow rounded-md px-4 py-3 flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
                <div className="text-xs text-neutral-500">Total</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === "pending").length}
                </div>
                <div className="text-xs text-neutral-500">Pending</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === "fulfilled").length}
                </div>
                <div className="text-xs text-neutral-500">Fulfilled</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            <Clock className="h-4 w-4 mr-2" />
            Active Requests
          </TabsTrigger>
          <TabsTrigger value="all">
            <Package className="h-4 w-4 mr-2" />
            All Requests
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          {renderActiveRequests()}
        </TabsContent>
        
        <TabsContent value="all">
          {renderAllRequests()}
        </TabsContent>
      </Tabs>
      
      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'fulfill' ? 'Fulfill Resource Request' : 'Cancel Resource Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'fulfill'
                ? 'Are you sure you want to mark this request as fulfilled? This indicates that all requested resources have been received.'
                : 'Are you sure you want to cancel this request? This action cannot be undone.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-4">
              <div className="bg-neutral-50 p-4 rounded-md space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Resource Type:</span>
                  <span className="text-sm">{selectedRequest.resourceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Quantity:</span>
                  <span className="text-sm">{selectedRequest.quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Urgency:</span>
                  <span className="text-sm">{getUrgencyBadge(selectedRequest.urgency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="text-sm">{getStatusBadge(selectedRequest.status)}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsActionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant={actionType === 'fulfill' ? 'default' : 'destructive'}
              onClick={handleStatusUpdate}
              disabled={updateRequestStatusMutation.isPending}
            >
              {updateRequestStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'fulfill' ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Fulfillment
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Confirm Cancellation
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}