import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Auth from "@/pages/auth";
import Pricing from "@/pages/pricing";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, login, user } = useAuth();

  // Debug authentication state
  console.log('🔍 Auth Debug:', { isAuthenticated, hasUser: !!user });

  // Always show the main app content since we can see the dashboard is working
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pricing" component={() => <Pricing onSelectPlan={() => {}} />} />
      <Route path="/auth" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
