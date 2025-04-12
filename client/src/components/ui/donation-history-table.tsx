import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Donation } from "@shared/schema";

export default function DonationHistoryTable({ donorId }: { donorId: number }) {
  const { user } = useAuth();

  // Fetch donations made by the user
  const { data: donations, isLoading } = useQuery<Donation[]>({
    queryKey: ["/api/donations"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?donorId=${donorId}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch donations");
      return response.json();
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-neutral-500">Loading donation history...</p>
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <div className="text-center p-8 bg-neutral-50 rounded-lg">
        <p className="text-neutral-500">No donation history found. Make your first donation today!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donations.map((donation) => (
            <TableRow key={donation.id}>
              <TableCell className="font-medium">
                {format(new Date(donation.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                {donation.recipientId}
              </TableCell>
              <TableCell>
                {donation.resourceType ? "Resource" : "Monetary"}
              </TableCell>
              <TableCell>
                {donation.resourceType ? (
                  <span>{donation.resourceQuantity} units of {donation.resourceType}</span>
                ) : (
                  <span>${donation.amount} {donation.currency}</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={donation.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "bg-neutral-100 text-neutral-800";
  
  switch (status.toLowerCase()) {
    case "pending":
      className = "bg-yellow-100 text-yellow-800";
      break;
    case "delivered":
    case "completed":
      className = "bg-green-100 text-green-800";
      break;
    case "in transit":
    case "processing":
      className = "bg-blue-100 text-blue-800";
      break;
    case "cancelled":
    case "failed":
      className = "bg-red-100 text-red-800";
      break;
  }
  
  return (
    <Badge className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}