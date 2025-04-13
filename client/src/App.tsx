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

import React, { useState, useEffect, useMemo } from 'react';
import { Route, Switch } from 'wouter';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import Homepage from "@/pages/homepage";

// Import the wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

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
      <Route path="/" component={Homepage} />
      <ProtectedRoute path="/dashboard" component={DashboardComponent} />
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
  // You can change the network to 'mainnet-beta' for production
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export default App;
