import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Zap, Star, Crown, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  usdPrice: number;
  zarPrice: number;
  interval: string;
  description: string;
  type: string;
  features: string[];
  paystackPlanCode?: string;
}

interface PricingTier {
  name: string;
  price: string;
  credits: number;
  features: string[];
  popular?: boolean;
  icon: React.ComponentType<any>;
  buttonText: string;
  buttonVariant?: "default" | "outline";
}

// Dynamic pricing tiers from API - no hardcoded features
const getPricingTiersFromAPI = (subscriptionPlans: SubscriptionPlan[]): PricingTier[] => {
  return subscriptionPlans.map(plan => {
    const icons = { free: Zap, pro_monthly: Star, business_monthly: Crown };
    const planKey = plan.id as keyof typeof icons;
    
    return {
      name: plan.name.replace(' Plan', ''),
      price: plan.usdPrice === 0 ? 'Free' : `$${plan.usdPrice}`,
      credits: plan.credits,
      features: plan.features,
      popular: plan.id === 'pro_monthly',
      icon: icons[planKey] || Zap,
      buttonText: plan.id === 'free' ? 'Get Started Free' : 
                  plan.id === 'pro_monthly' ? 'Go Pro' : 'Scale Business',
      buttonVariant: plan.id === 'free' ? 'outline' : undefined
    };
  });
};

interface PricingProps {
  onSelectPlan?: (plan: string) => void;
}

export default function Pricing({ onSelectPlan }: PricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Fetch subscription plans from API
  const { data: allPlans } = useQuery<{
    creditPackages: any[];
    subscriptionPlans: SubscriptionPlan[];
  }>({
    queryKey: ["/api/all-plans", "v2"],
    queryFn: () => fetch("/api/all-plans").then(res => res.json()),
  });

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: isLoadingSubscription, refetch: refetchSubscription } = useQuery<{
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    nextBillingDate?: string;
    isActive: boolean;
  }>({
    queryKey: ["/api/subscription-status"],
    enabled: !!user,
    staleTime: 0, // Always refetch to get latest status
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subscription-status");
      return response.json();
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You'll maintain access until the end of your billing period.",
      });
      refetchSubscription();
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentUser = user || authUser;

  // Debug logging
  console.log("🔍 All Plans Data:", allPlans);
  console.log("🔍 Credit Packages:", allPlans?.creditPackages);
  console.log("🔍 Subscription Status:", subscriptionStatus);
  console.log("🔍 Is Loading Subscription:", isLoadingSubscription);

  const handleSelectPlan = async (planName: string) => {
    setSelectedPlan(planName);
    
    // For free plan, redirect to registration if not logged in
    if (planName === "Free" || planName === "Starter") {
      if (!currentUser) {
        // Redirect to auth page for free plan signup
        window.location.href = '/auth';
        return;
      }
      
      toast({
        title: "Welcome to Etsy Art & Image Upscaler Pro!",
        description: "Your free credits are ready to use. Start creating amazing artwork!",
      });
      onSelectPlan?.(planName);
      return;
    }

    // For paid plans, require login
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please log in to select a plan.",
        variant: "destructive",
      });
      return;
    }

    // Find matching subscription plan - handle exact matching
    let subscriptionPlan = allPlans?.subscriptionPlans.find(plan => 
      plan.name.toLowerCase().includes(planName.toLowerCase())
    );

    // If not found, try alternative matching
    if (!subscriptionPlan) {
      if (planName === "Pro") {
        subscriptionPlan = allPlans?.subscriptionPlans.find(plan => plan.id === "pro_monthly");
      } else if (planName === "Business") {
        subscriptionPlan = allPlans?.subscriptionPlans.find(plan => plan.id === "business_monthly");
      }
    }

    if (!subscriptionPlan) {
      console.error("❌ Plan not found. Available plans:", allPlans?.subscriptionPlans?.map(p => ({name: p.name, id: p.id})));
      toast({
        title: "Plan Not Found",
        description: `Unable to find subscription plan for "${planName}". Please try again.`,
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan(planName);

    try {
      console.log("🛒 Starting subscription for plan:", subscriptionPlan.name, "ID:", subscriptionPlan.id);
      
      // Use apiRequest instead of direct fetch to ensure Authorization header is included
      const response = await apiRequest("POST", "/api/subscribe", {
        planId: subscriptionPlan.id,
      });

      const data = await response.json();
      console.log("🔗 Subscription response:", data);

      if (data?.authorization_url) {
        console.log("🔗 Redirecting to Paystack:", data.authorization_url);
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error: any) {
      console.error("❌ Subscription error:", error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Unable to start subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPlan(null);
    }
    
    onSelectPlan?.(planName);
  };

  const handleCreditPurchase = async (packageId: string) => {
    if (!currentUser) {
      toast({
        title: "Login Required", 
        description: "Please log in to purchase credits.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan(packageId);

    try {
      console.log("🛒 Starting credit purchase for package:", packageId);
      
      const response = await apiRequest("POST", "/api/purchase-credits", {
        packageId: packageId,
      });

      const data = await response.json();
      console.log("🔗 Purchase response:", data);

      if (data?.authorization_url) {
        console.log("🔗 Redirecting to Paystack:", data.authorization_url);
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error: any) {
      console.error("❌ Purchase error:", error);
      
      // Handle authentication errors specifically
      if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        toast({
          title: "Session Expired",
          description: "Please refresh the page and log in again to continue with your purchase.",
          variant: "destructive",
        });
        
        // Force page reload to clear invalid auth state
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast({
          title: "Purchase Failed",
          description: error.message || "Unable to start purchase. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={currentUser ? {
        name: currentUser.name,
        avatar: currentUser.avatar || undefined,
        credits: currentUser.credits
      } : undefined} />
      
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Scale your Etsy business with professional artwork processing. 
            Start free, upgrade when you're ready.
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscriptionStatus && subscriptionStatus.isActive && (
          <div className="mb-8">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Active Subscription:</strong> {subscriptionStatus.subscriptionPlan?.replace('_', ' ').toUpperCase() || 'Premium Plan'}
                    {subscriptionStatus.nextBillingDate && (
                      <span className="ml-2 text-sm">
                        (Next billing: {new Date(subscriptionStatus.nextBillingDate).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelSubscriptionMutation.mutate()}
                    disabled={cancelSubscriptionMutation.isPending}
                    className="ml-4"
                  >
                    {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {subscriptionStatus && subscriptionStatus.subscriptionStatus === 'cancelled' && subscriptionStatus.isActive && (
          <div className="mb-8">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Subscription Cancelled:</strong> Your plan remains active until the end of your billing period. No future charges will occur.
                {subscriptionStatus.nextBillingDate && (
                  <span className="ml-2 font-medium">
                    Access until: {new Date(subscriptionStatus.nextBillingDate).toLocaleDateString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {subscriptionStatus && subscriptionStatus.subscriptionStatus === 'expired' && (
          <div className="mb-8">
            <Alert className="border-red-200 bg-red-50">
              <X className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Subscription Expired:</strong> Your plan has ended. Choose a new plan below to continue with premium features.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {allPlans?.subscriptionPlans ? getPricingTiersFromAPI(allPlans.subscriptionPlans).map((tier: PricingTier) => {
            const Icon = tier.icon;
            return (
              <Card 
                key={tier.name}
                className={`relative ${tier.popular ? 'border-2 border-purple-500 shadow-lg scale-105' : 'border border-gray-200'}`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                    tier.popular ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                  <div className="text-4xl font-bold text-gray-900">
                    {tier.price}
                    {tier.price !== "Free" && <span className="text-lg text-gray-500">/month</span>}
                  </div>
                  <CardDescription>
                    {tier.credits.toLocaleString()} credits included
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {/* Show current plan status */}
                  {subscriptionStatus?.isActive && subscriptionStatus.subscriptionPlan?.includes(tier.name.toLowerCase()) ? (
                    <Button className="w-full" variant="outline" disabled>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      {subscriptionStatus.subscriptionStatus === 'cancelled' ? 'Current Plan (Expires Soon)' : 'Current Plan'}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={tier.buttonVariant || "default"}
                      onClick={() => handleSelectPlan(tier.name)}
                      disabled={selectedPlan === tier.name || processingPlan === tier.name}
                      data-testid={`button-plan-${tier.name.toLowerCase()}`}
                    >
                      {processingPlan === tier.name ? "Processing..." : 
                       selectedPlan === tier.name ? "Selected" : tier.buttonText}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          }) : <div className="col-span-3 text-center text-gray-500">Loading subscription plans...</div>}
        </div>

        {/* Credit Top-ups */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center mb-2">Credit Top-ups</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto text-center mb-8">
            Need extra credits? Purchase one-time credit packages
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {allPlans?.creditPackages && allPlans.creditPackages.length > 0 ? allPlans.creditPackages.map((pkg: any) => (
              <Card key={pkg.id} className="relative flex flex-col">
                {pkg.credits === 250 && (
                  <Badge className="absolute -top-2 -right-2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                {pkg.credits === 500 && (
                  <Badge className="absolute -top-2 -right-2 bg-green-500">
                    Best Value
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5 text-purple-600" />
                    {pkg.name}
                  </CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      ${pkg.usdPrice}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {pkg.credits} Credits
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {Math.floor(pkg.credits / 2)} AI Generations
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {pkg.credits} Upscaling Operations
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleCreditPurchase(pkg.id)}
                    disabled={processingPlan === pkg.id}
                    variant="outline"
                    data-testid={`button-buy-${pkg.id}`}
                  >
                    {processingPlan === pkg.id ? "Processing..." : `Buy ${pkg.credits} Credits`}
                  </Button>
                </CardFooter>
              </Card>
            )) : (
              <div className="col-span-full text-center text-gray-500">
                Loading credit packages...
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}