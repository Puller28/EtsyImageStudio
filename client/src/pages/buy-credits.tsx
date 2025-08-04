import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  usdPrice: number;
  zarPrice: number;
  description: string;
}

export default function BuyCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  const { data: packages = [], isLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest("POST", "/api/purchase-credits", { packageId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url;
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

  const handlePurchase = (packageId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase credits",
        variant: "destructive",
      });
      return;
    }

    setProcessingPackage(packageId);
    purchaseMutation.mutate(packageId);
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
          <h1 className="text-3xl font-bold mb-2">Buy Credits</h1>
          <p className="text-muted-foreground mb-2">
            Choose a credit package to power your AI art generation
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              Current balance: <span className="font-medium text-primary">{user.credits} credits</span>
            </p>
          )}
        </div>
      </div>

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
                <div className="text-sm text-muted-foreground">
                  (R{(pkg.zarPrice / 100).toFixed(2)} ZAR)
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
                onClick={() => handlePurchase(pkg.id)}
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