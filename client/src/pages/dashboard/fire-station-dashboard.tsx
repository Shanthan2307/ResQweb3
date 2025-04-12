import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import SummaryCard from "@/components/ui/summary-card";
import ResourceRequestForm from "@/components/ui/resource-request-form";
import EmergencyFeed from "@/components/ui/emergency-feed";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, Package, Users, Clock } from "lucide-react";

export default function FireStationDashboard() {
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
  
  // Fetch volunteers
  const { data: volunteers } = useQuery({
    queryKey: ["/api/volunteers"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?fireStationId=${user?.id}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch volunteers");
      return response.json();
    },
    enabled: !!user,
  });
  
  // Fetch resource requests
  const { data: resourceRequests } = useQuery({
    queryKey: ["/api/resource-requests"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?requesterId=${user?.id}&status=pending`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch resource requests");
      return response.json();
    },
    enabled: !!user,
  });
  
  return (
    <DashboardLayout 
      title="Fire Station Dashboard"
      subtitle={user ? `${user.name} - Serving PIN codes ${user.pinCodeRangeStart}-${user.pinCodeRangeEnd}` : ""}
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
          title="Available Resources"
          value={`${resources?.length || 0} types`}
          icon={<Package className="h-6 w-6" />}
          linkText="View inventory"
          linkHref="/resources"
        />
        
        <SummaryCard
          title="Available Volunteers"
          value={volunteers?.length || 0}
          icon={<Users className="h-6 w-6" />}
          linkText="View volunteer pool"
          linkHref="/volunteers"
          iconColor="text-green-700"
        />
        
        <SummaryCard
          title="Active Requests"
          value={resourceRequests?.length || 0}
          icon={<Clock className="h-6 w-6" />}
          linkText="View active requests"
          linkHref="/requests"
          iconColor="text-orange-700"
        />
      </div>
      
      {/* Resource Requests Section */}
      <div className="mt-6">
        <ResourceRequestForm />
      </div>
      
      {/* Emergency Feed Section */}
      <div className="mt-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900 mb-4">Emergency Feed</h3>
        <EmergencyFeed />
      </div>
    </DashboardLayout>
  );
}
