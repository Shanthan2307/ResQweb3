import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Emergency } from "@shared/schema";

export default function EmergencyFeed() {
  const { user } = useAuth();

  // Fetch active emergencies
  const { data: emergencies, isLoading } = useQuery<Emergency[]>({
    queryKey: ["/api/emergencies"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?status=active`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch emergencies");
      return response.json();
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-neutral-500">Loading emergencies...</p>
      </div>
    );
  }

  if (!emergencies || emergencies.length === 0) {
    return (
      <Card className="bg-neutral-50">
        <CardContent className="px-4 py-5 sm:p-6 text-center">
          <p className="text-neutral-500">No active emergencies at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {emergencies.map((emergency) => (
        <Card key={emergency.id} className="bg-white shadow overflow-hidden divide-y divide-neutral-200">
          <CardHeader className="px-4 py-4 sm:px-6 bg-red-50">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <CardTitle className="text-base font-medium text-red-800">
                {emergency.title}
              </CardTitle>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-sm text-neutral-500">
                Reported {format(new Date(emergency.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
              <Badge className="bg-red-100 text-red-800 font-medium">
                {emergency.severity.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="px-4 py-4 sm:px-6">
            <p className="text-sm text-neutral-700 mb-4">{emergency.description}</p>
            
            <div className="text-sm">
              <span className="font-medium text-neutral-900">Location:</span>{" "}
              <span className="text-neutral-700">{emergency.location}</span>
            </div>
            
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-neutral-900">Resources Needed:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {emergency.resourcesNeeded?.map((resource, index) => (
                  <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                    {resource}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="bg-white px-4 py-4 sm:px-6 flex justify-end">
            <Button>
              Offer Support
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}