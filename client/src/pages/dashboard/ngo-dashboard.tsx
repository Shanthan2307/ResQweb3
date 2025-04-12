import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import SummaryCard from "@/components/ui/summary-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Wallet, Package, Users, UserPlus } from "lucide-react";
import { ResourceRequest, User } from "@shared/schema";
import { format } from "date-fns";

export default function NgoDashboard() {
  const { user } = useAuth();
  
  // Fetch resources
  const { data: resources } = useQuery({
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
  
  // Fetch pending resource requests
  const { data: pendingRequests } = useQuery<ResourceRequest[]>({
    queryKey: ["/api/resource-requests"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?status=pending`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch resource requests");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch fire stations for partnerships
  const { data: fireStations } = useQuery<User[]>({
    queryKey: ["/api/fire-stations"],
    enabled: !!user,
  });

  // Fetch all users to get requester names
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && !!pendingRequests,
  });

  const getRequesterName = (requesterId: number) => {
    if (!allUsers) return `Fire Station #${requesterId}`;
    const requester = allUsers.find(user => user.id === requesterId);
    return requester ? requester.name : `Fire Station #${requesterId}`;
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-neutral-100 text-neutral-800";
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case "critical": return "Critical Priority";
      case "high": return "High Priority";
      case "medium": return "Medium Priority";
      case "low": return "Low Priority";
      default: return "Unknown Priority";
    }
  };

  const getStockStatusBadge = (quantity: number) => {
    if (quantity <= 0) return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    if (quantity < 50) return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  return (
    <DashboardLayout 
      title="NGO Dashboard"
      subtitle={user ? `${user.name} - Supporting emergency services nationwide` : ""}
    >
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Wallet Balance"
          value={`${user?.walletBalance || 0} USDC`}
          icon={<Wallet className="h-6 w-6" />}
          linkText="View transactions"
          linkHref="/wallet"
          iconColor="text-blue-700"
        />
        
        <SummaryCard
          title="Resource Inventory"
          value={`${resources?.length || 0} types`}
          icon={<Package className="h-6 w-6" />}
          linkText="View inventory"
          linkHref="/resources"
        />
        
        <SummaryCard
          title="Specialist Volunteers"
          value="125"
          icon={<Users className="h-6 w-6" />}
          linkText="View volunteer database"
          linkHref="/volunteers"
          iconColor="text-green-700"
        />
        
        <SummaryCard
          title="Fire Station Partnerships"
          value={fireStations?.length || 0}
          icon={<UserPlus className="h-6 w-6" />}
          linkText="View partnerships"
          linkHref="/partnerships"
          iconColor="text-blue-700"
        />
      </div>
      
      {/* Pending Support Requests */}
      <div className="mt-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900 mb-4">Pending Support Requests</h3>
        <Card className="shadow overflow-hidden">
          {pendingRequests && pendingRequests.length > 0 ? (
            <ul className="divide-y divide-neutral-200">
              {pendingRequests.map(request => (
                <li key={request.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-neutral-900">
                            {request.resourceType} - {request.quantity} units
                          </p>
                          <p className="text-sm text-neutral-500">
                            From: {getRequesterName(request.requesterId)} • 
                            Due: {request.urgency === "critical" ? "Immediate" : 
                                 request.urgency === "high" ? "24 hours" : 
                                 request.urgency === "medium" ? "3 days" : "7 days"}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <Badge className={getUrgencyBadgeColor(request.urgency)}>
                          {getUrgencyLabel(request.urgency)}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-neutral-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {allUsers && request.requesterId && (
                            <>
                              {
                                allUsers.find(user => user.id === request.requesterId)?.pinCodeRangeStart 
                                ? `PIN Code Area: ${allUsers.find(user => user.id === request.requesterId)?.pinCodeRangeStart}-${allUsers.find(user => user.id === request.requesterId)?.pinCodeRangeEnd}`
                                : "Location information unavailable"
                              }
                            </>
                          )}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-neutral-500 sm:mt-0">
                        <p>
                          Requested: {format(new Date(request.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end space-x-4">
                      <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
                        View Details
                      </Button>
                      <Button size="sm">
                        Fulfill Request
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-neutral-500">
              No pending support requests at this time.
            </div>
          )}
        </Card>
      </div>
      
      {/* Resource Management */}
      <div className="mt-6">
        <div className="md:flex md:items-center md:justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-neutral-900">Resource Management</h3>
          <div className="mt-4 md:mt-0">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Resource
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {resources && resources.length > 0 ? (
            resources.map(resource => (
              <Card key={resource.id} className="p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-neutral-900">{resource.name}</h4>
                  {getStockStatusBadge(resource.quantity)}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Quantity:</span>
                    <span className="font-medium text-neutral-900">{resource.quantity} units</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-neutral-500">Last Updated:</span>
                    <span className="font-medium text-neutral-900">
                      {format(new Date(), "d 'days ago'")}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" className="text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-100">
                    Update
                  </Button>
                  <Button size="sm">
                    {resource.quantity <= 0 ? "Order More" : "Distribute"}
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full p-6 text-center bg-white rounded-lg shadow text-neutral-500">
              No resources available. Click "Add New Resource" to get started.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
