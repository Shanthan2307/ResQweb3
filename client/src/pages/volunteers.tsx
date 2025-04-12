import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { z } from "zod";
import { Users, UserCheck, Calendar, Clock, Phone, AlertTriangle, CheckCheck, XCircle, Mail, User } from "lucide-react";
import { Volunteer, User as UserType } from "@shared/schema";

export default function VolunteersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Fetch volunteers
  const { data: volunteers, isLoading } = useQuery<Volunteer[]>({
    queryKey: ["/api/volunteers"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?fireStationId=${user?.id}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch volunteers");
      return response.json();
    },
    enabled: !!user && user.userType === "firestation",
  });
  
  // Fetch volunteer user details
  const { data: volunteerUsers, isLoading: isLoadingUsers } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`${queryKey[0]}?userType=local`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch volunteer users");
      return response.json();
    },
    enabled: !!user && user.userType === "firestation",
  });
  
  const updateVolunteerStatusMutation = useMutation({
    mutationFn: async ({ volunteerId, status }: { volunteerId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/volunteers/${volunteerId}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Volunteer status has been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the volunteer status.",
        variant: "destructive",
      });
    },
  });
  
  const handleUpdateStatus = (volunteerId: number, status: string) => {
    updateVolunteerStatusMutation.mutate({ volunteerId, status });
  };
  
  const getVolunteerUser = (userId: number) => {
    return volunteerUsers?.find(u => u.id === userId);
  };
  
  const getVolunteerNameInitials = (userId: number) => {
    const volunteerUser = getVolunteerUser(userId);
    if (!volunteerUser) return "U";
    
    const nameParts = volunteerUser.name.split(" ");
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };
  
  const getStatusBadge = (status: string) => {
    let className = "bg-neutral-100 text-neutral-800";
    
    switch (status.toLowerCase()) {
      case "active":
        className = "bg-green-100 text-green-800";
        break;
      case "inactive":
        className = "bg-neutral-100 text-neutral-800";
        break;
      case "on-call":
        className = "bg-blue-100 text-blue-800";
        break;
      case "deployed":
        className = "bg-orange-100 text-orange-800";
        break;
    }
    
    return (
      <Badge className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  const handleViewVolunteer = (volunteer: Volunteer) => {
    setActiveVolunteer(volunteer);
    setIsViewDialogOpen(true);
  };
  
  const renderActiveVolunteers = () => {
    if (isLoading || isLoadingUsers) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading volunteers...</p>
        </div>
      );
    }
    
    if (!volunteers || volunteers.length === 0) {
      return (
        <div className="text-center p-12 bg-neutral-50 rounded-lg">
          <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-800 mb-2">No volunteers found</h3>
          <p className="text-neutral-500 mb-6">
            You don't have any volunteers registered yet. Encourage local users to register as volunteers.
          </p>
        </div>
      );
    }
    
    const activeVolunteers = volunteers.filter(v => v.status === "active" || v.status === "on-call");
    
    if (activeVolunteers.length === 0) {
      return (
        <div className="text-center p-8 bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">No active volunteers at the moment.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeVolunteers.map((volunteer) => {
          const volunteerUser = getVolunteerUser(volunteer.userId);
          return (
            <Card key={volunteer.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{getVolunteerNameInitials(volunteer.userId)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{volunteerUser?.name || "Volunteer"}</CardTitle>
                      <p className="text-xs text-neutral-500">ID: {volunteer.id}</p>
                    </div>
                  </div>
                  {getStatusBadge(volunteer.status)}
                </div>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-start text-sm">
                    <UserCheck className="h-4 w-4 text-neutral-500 mr-2 mt-0.5" />
                    <div>
                      <span className="font-medium">Skills: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {volunteer.skills?.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start text-sm">
                    <Calendar className="h-4 w-4 text-neutral-500 mr-2 mt-0.5" />
                    <div>
                      <span className="font-medium">Availability: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {volunteer.availability?.map((available, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                            {available}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-2">
                <div className="flex w-full space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewVolunteer(volunteer)}
                  >
                    View Details
                  </Button>
                  
                  <Button 
                    variant={volunteer.status === "on-call" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(volunteer.id, volunteer.status === "on-call" ? "active" : "on-call")}
                  >
                    {volunteer.status === "on-call" ? "Remove from Call" : "Set On-Call"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };
  
  const renderAllVolunteers = () => {
    if (isLoading || isLoadingUsers) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-500">Loading volunteers...</p>
        </div>
      );
    }
    
    if (!volunteers || volunteers.length === 0) {
      return (
        <div className="text-center p-8 bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">No volunteers registered.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {volunteers.map((volunteer) => {
              const volunteerUser = getVolunteerUser(volunteer.userId);
              return (
                <TableRow key={volunteer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getVolunteerNameInitials(volunteer.userId)}</AvatarFallback>
                      </Avatar>
                      <span>{volunteerUser?.name || "Volunteer"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.skills?.slice(0, 2).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {(volunteer.skills?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(volunteer.skills?.length || 0) - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.availability?.slice(0, 2).map((available, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                          {available}
                        </Badge>
                      ))}
                      {(volunteer.availability?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs bg-blue-50">
                          +{(volunteer.availability?.length || 0) - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(volunteer.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewVolunteer(volunteer)}
                      >
                        View
                      </Button>
                      
                      {volunteer.status === "active" ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(volunteer.id, "inactive")}
                        >
                          Deactivate
                        </Button>
                      ) : volunteer.status === "inactive" ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(volunteer.id, "active")}
                        >
                          Activate
                        </Button>
                      ) : null}
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
    <DashboardLayout title="Volunteer Management" subtitle="Manage emergency response volunteers">
      <div className="flex justify-between items-center mb-6">
        <div>
          {volunteers && volunteers.length > 0 && (
            <div className="bg-white shadow rounded-md px-4 py-3 flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{volunteers.length}</div>
                <div className="text-xs text-neutral-500">Total</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {volunteers.filter(v => v.status === "active").length}
                </div>
                <div className="text-xs text-neutral-500">Active</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {volunteers.filter(v => v.status === "on-call").length}
                </div>
                <div className="text-xs text-neutral-500">On-Call</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            <UserCheck className="h-4 w-4 mr-2" />
            Active Volunteers
          </TabsTrigger>
          <TabsTrigger value="all">
            <Users className="h-4 w-4 mr-2" />
            All Volunteers
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          {renderActiveVolunteers()}
        </TabsContent>
        
        <TabsContent value="all">
          {renderAllVolunteers()}
        </TabsContent>
      </Tabs>
      
      {/* View Volunteer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Volunteer Details</DialogTitle>
          </DialogHeader>
          
          {activeVolunteer && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {getVolunteerNameInitials(activeVolunteer.userId)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">
                    {getVolunteerUser(activeVolunteer.userId)?.name || "Volunteer"}
                  </h3>
                  <div className="flex items-center mt-1">
                    {getStatusBadge(activeVolunteer.status)}
                    <span className="text-sm text-neutral-500 ml-2">
                      Volunteer ID: {activeVolunteer.id}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Skills & Expertise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {activeVolunteer.skills?.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                      {!activeVolunteer.skills?.length && (
                        <span className="text-sm text-neutral-500">No skills listed</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Availability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {activeVolunteer.availability?.map((available, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">
                          {available}
                        </Badge>
                      ))}
                      {!activeVolunteer.availability?.length && (
                        <span className="text-sm text-neutral-500">No availability listed</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {activeVolunteer.emergencyContact || "No emergency contact provided"}
                  </p>
                </CardContent>
              </Card>
              
              <div className="flex justify-between pt-4">
                <div className="space-x-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </div>
                
                <div className="space-x-2">
                  {activeVolunteer.status === "active" ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          handleUpdateStatus(activeVolunteer.id, "inactive");
                          setIsViewDialogOpen(false);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Deactivate
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          handleUpdateStatus(activeVolunteer.id, "on-call");
                          setIsViewDialogOpen(false);
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Set On-Call
                      </Button>
                    </>
                  ) : activeVolunteer.status === "inactive" ? (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        handleUpdateStatus(activeVolunteer.id, "active");
                        setIsViewDialogOpen(false);
                      }}
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  ) : activeVolunteer.status === "on-call" ? (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        handleUpdateStatus(activeVolunteer.id, "active");
                        setIsViewDialogOpen(false);
                      }}
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Return to Active
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}