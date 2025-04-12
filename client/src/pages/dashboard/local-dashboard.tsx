import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ResourceDonationCard from "@/components/ui/resource-donation-card";
import MonetaryDonationCard from "@/components/ui/monetary-donation-card";
import VolunteerRegistrationCard from "@/components/ui/volunteer-registration-card";
import DonationHistoryTable from "@/components/ui/donation-history-table";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { User } from "@shared/schema";

export default function LocalDashboard() {
  const { user } = useAuth();
  
  // Fetch assigned fire station
  const { data: assignedFireStation, isLoading } = useQuery<User>({
    queryKey: ["/api/assigned-fire-station"],
    enabled: !!user && user?.userType === "local",
  });
  
  // Fetch resource requests from assigned fire station
  const { data: resourceRequests } = useQuery({
    queryKey: ["/api/resource-requests"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?status=pending`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch resource requests");
      return response.json();
    },
    enabled: !!user && !!assignedFireStation,
  });
  
  const hasActiveRequests = resourceRequests?.length > 0;
  
  return (
    <DashboardLayout 
      title="Local User Dashboard"
      subtitle={`Welcome back, ${user?.name}. ${assignedFireStation ? `Your assigned fire station is ${assignedFireStation.name}.` : 'Loading your assigned fire station...'}`}
    >
      {hasActiveRequests && (
        <div className="mb-6">
          <Alert className="bg-primary-50 border-l-4 border-primary-700">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-primary-700" />
              <div className="ml-3">
                <AlertTitle className="text-primary-700">Resource Request</AlertTitle>
                <AlertDescription className="text-primary-700">
                  {assignedFireStation?.name} is requesting resources. Please consider donating!
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {assignedFireStation && (
          <>
            <ResourceDonationCard recipientId={assignedFireStation.id} />
            <MonetaryDonationCard recipientId={assignedFireStation.id} />
          </>
        )}
      </div>
      
      {assignedFireStation && (
        <div className="mt-6">
          <VolunteerRegistrationCard fireStationId={assignedFireStation.id} />
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900 mb-4">Recent Donation History</h3>
        {user && <DonationHistoryTable donorId={user.id} />}
      </div>
    </DashboardLayout>
  );
}
