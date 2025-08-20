import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Auth from "@/pages/auth";
import Pricing from "@/pages/pricing";
import Settings from "@/pages/settings";
import BuyCredits from "@/pages/buy-credits";
import PaymentCallback from "@/pages/payment-callback";
import NotFound from "@/pages/not-found";
import TemplateMockupPage from "@/pages/template-mockup-page";
import { MockupPage } from "@/pages/mockup-page";
import AboutUsPage from "@/pages/about-us";
import TermsOfServicePage from "@/pages/terms-of-service";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import ContactPage from "@/pages/contact";
import HomePage from "@/pages/home";
import FeaturesPage from "@/pages/features";
import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, login, user } = useAuth();

  // Debug authentication state
  console.log('🔍 Auth Debug:', { isAuthenticated, hasUser: !!user, currentPath: window.location.pathname });

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/home" component={HomePage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      <Route path="/about-us" component={AboutUsPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/pricing" component={() => <Pricing onSelectPlan={() => {}} />} />
      <Route path="/auth" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
      
      {/* Protected routes */}
      {isAuthenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/settings" component={Settings} />
          <Route path="/buy-credits" component={BuyCredits} />
          <Route path="/template-mockups" component={TemplateMockupPage} />
          <Route path="/template-mockup" component={TemplateMockupPage} />
          <Route path="/mockup" component={MockupPage} />
          <Route path="/mockups" component={MockupPage} />
          <Route path="/payment-callback/:reference" component={PaymentCallback} />
          <Route path="/payment-callback" component={PaymentCallback} />
        </>
      ) : (
        <>
          <Route path="/" component={HomePage} />
          {/* Redirect protected routes to auth for unauthenticated users */}
          <Route path="/settings" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
          <Route path="/buy-credits" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
          <Route path="/template-mockups" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
          <Route path="/template-mockup" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
          <Route path="/mockup" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
          <Route path="/mockups" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
          <Route path="/payment-callback/:reference" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
          <Route path="/payment-callback" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
        </>
      )}
      
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
