import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  usdPrice: number;
  zarPrice: number;
  description: string;
  type: 'one-time';
}

interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  usdPrice: number;
  zarPrice: number;
  interval: string;
  description: string;
  type: 'subscription' | 'free';
  features: string[];
  paystackPlanCode?: string;
}

export default function BuyCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  const { data: allPlans, isLoading } = useQuery<{
    creditPackages: CreditPackage[];
    subscriptionPlans: SubscriptionPlan[];
  }>({
    queryKey: ["/api/all-plans", "v2"], // Cache bust
    staleTime: 0,
    gcTime: 0,
  });

  const packages = allPlans?.creditPackages || [];
  const subscriptions = allPlans?.subscriptionPlans || [];
  
  // Force refresh on component mount to avoid cache issues
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/all-plans"] });
  }, []);

  const purchaseMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'one-time' | 'subscription' | 'free' }) => {
      if (type === 'free') {
        throw new Error('Free plan is already active');
      }
      const endpoint = type === 'subscription' ? '/api/subscribe' : '/api/purchase-credits';
      const payload = type === 'subscription' ? { planId: id } : { packageId: id };
      
      console.log('🔍 About to make API request:', { endpoint, payload, type });
      
      const response = await apiRequest("POST", endpoint, payload);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🔗 Payment response:', data);
      if (data.authorization_url) {
        console.log('🔗 Redirecting to Paystack:', data.authorization_url);
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url;
      } else {
        console.error('❌ No authorization_url in response:', data);
        toast({
          title: "Payment Error",
          description: "Invalid payment response from server",
          variant: "destructive",
        });
        setProcessingPackage(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setProcessingPackage(null);
    },
  });

  const handlePurchase = (id: string, type: 'one-time' | 'subscription' | 'free') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase credits",
        variant: "destructive",
      });
      return;
    }

    if (type === 'free') {
      toast({
        title: "Free Plan Active",
        description: "You're already on the free plan with 100 monthly credits",
        variant: "default",
      });
      return;
    }

    console.log('🛒 Starting subscription for plan:', id, 'ID:', id);
    setProcessingPackage(id);
    purchaseMutation.mutate({ id, type });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getPopularBadge = (credits: number) => {
    return credits === 100 ? (
      <Badge className="absolute -top-2 -right-2 bg-orange-500 hover:bg-orange-600">
        Most Popular
      </Badge>
    ) : null;
  };

  const getBestValueBadge = (credits: number) => {
    return credits === 250 ? (
      <Badge className="absolute -top-2 -right-2 bg-green-500 hover:bg-green-600">
        Best Value
      </Badge>
    ) : null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Buy Credits & Subscriptions</h1>
          <p className="text-muted-foreground mb-2">
            Choose a subscription plan or buy credit top-ups for your AI art generation
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              Current balance: <span className="font-medium text-primary">{user.credits} credits</span>
            </p>
          )}
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-2">Monthly Subscriptions</h2>
        <p className="text-muted-foreground text-center mb-6">
          Get credits automatically every month with our subscription plans
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
          {subscriptions.map((plan) => (
            <Card key={plan.id} className={`relative flex flex-col ${
              plan.type === 'free' ? 'border-2 border-gray-200' : 'border-2 border-primary/20'
            }`}>
              {plan.name === 'Pro Plan' && (
                <Badge className="absolute -top-2 -right-2 bg-primary">
                  Most Popular
                </Badge>
              )}
              {plan.name === 'Business Plan' && (
                <Badge className="absolute -top-2 -right-2 bg-green-500">
                  Best Value
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 text-center">
                <div className="mb-6">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {plan.usdPrice === 0 ? 'Free' : `$${plan.usdPrice}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plan.usdPrice === 0 ? 'Always free' : 'per month'}
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(plan.id, plan.type as 'subscription' | 'free')}
                  disabled={processingPackage === plan.id}
                  variant={plan.type === 'free' ? 'outline' : 'default'}
                  data-testid={`button-subscribe-${plan.id}`}
                >
                  {plan.type === 'free' ? (
                    'Current Plan'
                  ) : processingPackage === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Credit Top-ups */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-center mb-2">Credit Top-ups</h2>
        <p className="text-muted-foreground text-center mb-6">
          Need extra credits? Purchase one-time credit packages
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="relative flex flex-col">
              {getPopularBadge(pkg.credits)}
              {getBestValueBadge(pkg.credits)}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {pkg.name}
                </CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 text-center">
                <div className="mb-4">
                  <div className="text-3xl font-bold text-primary mb-1">
                    ${pkg.usdPrice}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {pkg.credits} Credits
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {Math.floor(pkg.credits / 2)} AI Generations
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {pkg.credits} Upscaling Operations
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(pkg.id, 'one-time')}
                  disabled={processingPackage === pkg.id}
                  data-testid={`button-buy-${pkg.id}`}
                >
                  {processingPackage === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Buy ${pkg.credits} Credits`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Credit Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <strong>AI Art Generation:</strong> 2 credits per image
          </div>
          <div>
            <strong>Image Upscaling:</strong> 1 credit per operation
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Secure payments powered by Paystack. All transactions are encrypted and protected.
        </p>
      </div>
    </div>
  );
}