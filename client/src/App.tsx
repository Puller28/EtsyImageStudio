import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Auth from "@/pages/auth";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
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
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import Migration from "@/pages/migration";
import MockupOutpaintPage from "@/pages/mockup-outpaint";
import MockupFramedPage from "@/pages/mockup-framed";
import TemplateCreatePage from "@/pages/template-create";
import WorkspaceHomePage from "@/pages/workspace/workspace-home";
import WorkspaceProjectsPage from "@/pages/workspace/workspace-projects";
import UpscaleToolPage from "@/pages/tools/upscale-tool";
import MockupToolPage from "@/pages/tools/mockup-tool";
import PrintFormatsToolPage from "@/pages/tools/print-formats-tool";
import ListingToolPage from "@/pages/tools/listing-tool";
import GenerateToolPage from "@/pages/tools/generate-tool";
import BackgroundRemovalToolPage from "@/pages/tools/background-removal-tool";
import WorkflowPage from "@/pages/workflow/workflow-hub";
import WorkflowRunnerPage from "@/pages/workflow/workflow-runner";
import AdminDashboard from "@/pages/AdminDashboard";
import BlogGenerator from "@/pages/BlogGenerator";
import BlogManagement from "@/pages/BlogManagement";
import BlogPostEdit from "@/pages/BlogPostEdit";
import SocialMediaAutomation from "@/pages/SocialMediaAutomation";
import ContentCalendar from "@/pages/ContentCalendar";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { initGA, identifyUser, trackUserPlan } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { SEOHead } from "@/components/seo-head";
import { useLocation } from "wouter";

function Router() {
  const { isAuthenticated, login, user } = useAuth();
  const [location] = useLocation();
  
  // Initialize analytics tracking
  useAnalytics();

  // Track user authentication and plan status
  useEffect(() => {
    if (isAuthenticated && user) {
      identifyUser(user.id, {
        plan_type: user.subscriptionPlan || 'free',
        subscription_status: user.subscriptionStatus || 'inactive'
      });
      
      trackUserPlan(
        user.subscriptionPlan || 'free', 
        user.credits || 0
      );
    }
  }, [isAuthenticated, user]);

  // Debug authentication state
  console.log('🔍 Auth Debug:', { isAuthenticated, hasUser: !!user, currentPath: window.location.pathname });

  if (isAuthenticated) {
    return (
      <>
        <SEOHead path={location} />
        <WorkspaceProvider>
          <AppShell>
            <Switch>
              <Route path="/" component={WorkspaceHomePage} />
              <Route path="/workspace" component={WorkspaceHomePage} />
              <Route path="/workspace/projects" component={WorkspaceProjectsPage} />
              <Route path="/workspace/projects/:id" component={() => <ProjectDetailPage showChrome={false} />} />
              <Route path="/settings" component={Settings} />
              <Route path="/buy-credits" component={BuyCredits} />
              <Route path="/tools/upscale" component={() => <UpscaleToolPage />} />
              <Route path="/tools/generate" component={() => <GenerateToolPage />} />
              <Route path="/tools/mockups" component={MockupToolPage} />
              <Route path="/tools/print-formats" component={() => <PrintFormatsToolPage />} />
              <Route path="/tools/listing" component={() => <ListingToolPage />} />
              <Route path="/tools/background-removal" component={() => <BackgroundRemovalToolPage />} />
              <Route path="/workflow" component={WorkflowPage} />
              <Route path="/workflow/run" component={WorkflowRunnerPage} />
              <Route path="/projects/:id" component={() => <ProjectDetailPage showChrome={false} />} />
              <Route path="/projects" component={WorkspaceProjectsPage} />
              <Route path="/migration" component={Migration} />
              <Route path="/mockups/outpaint" component={MockupOutpaintPage} />
              <Route path="/mockups/frame" component={MockupFramedPage} />
              <Route path="/templates/create" component={TemplateCreatePage} />
              <Route path="/template-mockups" component={() => <MockupPage showChrome={false} />} />
              <Route path="/payment-callback/:reference" component={PaymentCallback} />
              <Route path="/payment-callback" component={PaymentCallback} />
              <Route path="/blog" component={BlogPage} />
              <Route path="/blog/:slug" component={BlogPostPage} />
              <Route path="/about-us" component={AboutUsPage} />
              <Route path="/features" component={FeaturesPage} />
              <Route path="/contact" component={ContactPage} />
              <Route path="/terms-of-service" component={TermsOfServicePage} />
              <Route path="/privacy-policy" component={PrivacyPolicyPage} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/blog-generator" component={BlogGenerator} />
              <Route path="/admin/blog-posts" component={BlogManagement} />
              <Route path="/admin/blog-posts/:id/edit" component={BlogPostEdit} />
              <Route path="/admin/social-media" component={SocialMediaAutomation} />
              <Route path="/admin/content-calendar" component={ContentCalendar} />
              <Route component={NotFound} />
            </Switch>
          </AppShell>
        </WorkspaceProvider>
      </>
    );
  }

  return (
    <>
      <SEOHead path={location} />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/home" component={HomePage} />
        <Route path="/features" component={FeaturesPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/blog/:slug" component={BlogPostPage} />
        <Route path="/about-us" component={AboutUsPage} />
        <Route path="/terms-of-service" component={TermsOfServicePage} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/pricing" component={() => <Pricing onSelectPlan={() => {}} />} />
        <Route path="/generate" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
        <Route path="/upscale" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
        <Route path="/template-mockups" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
        <Route path="/auth" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
        <Route path="/login" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
        <Route path="/register" component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/terms" component={TermsOfServicePage} />
        <Route path="/privacy" component={PrivacyPolicyPage} />
        <Route component={() => <Auth onLogin={(result) => login(result.user, result.token)} />} />
      </Switch>
    </>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

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





