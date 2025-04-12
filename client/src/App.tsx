import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import LocalDashboard from "@/pages/dashboard/local-dashboard";
import FireStationDashboard from "@/pages/dashboard/fire-station-dashboard"; 
import NgoDashboard from "@/pages/dashboard/ngo-dashboard";
import { useAuth, AuthProvider } from "./hooks/use-auth";
import WalletPage from "@/pages/wallet";
import ResourcesPage from "@/pages/resources";
import VolunteersPage from "@/pages/volunteers";
import RequestsPage from "@/pages/requests";
import PartnershipsPage from "@/pages/partnerships";

function AppRoutes() {
  const { user } = useAuth();
  
  // Determine which dashboard to show based on user type
  const DashboardComponent = () => {
    if (user?.userType === "local") return <LocalDashboard />;
    if (user?.userType === "firestation") return <FireStationDashboard />;
    if (user?.userType === "ngo") return <NgoDashboard />;
    
    // Default case (though this shouldn't happen due to ProtectedRoute)
    return <NotFound />;
  };
  
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardComponent} />
      <ProtectedRoute path="/wallet" component={WalletPage} />
      <ProtectedRoute path="/resources" component={ResourcesPage} />
      <ProtectedRoute path="/volunteers" component={VolunteersPage} />
      <ProtectedRoute path="/requests" component={RequestsPage} />
      <ProtectedRoute path="/partnerships" component={PartnershipsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
