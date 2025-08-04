import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Home } from "lucide-react";
import { Link } from "wouter";

export default function PaymentCallback() {
  const [, params] = useRoute("/payment-callback/:reference");
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    credits?: number;
    error?: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/verify-payment", params?.reference],
    enabled: !!params?.reference,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setVerificationResult(data as {
        success: boolean;
        credits?: number;
        error?: string;
      });
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!verificationResult) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Payment Error</h2>
              <p className="text-muted-foreground mb-4">
                Unable to verify your payment. Please contact support if you believe this is an error.
              </p>
              <Link href="/">
                <Button>
                  <Home className="mr-2 h-4 w-4" />
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {verificationResult.success ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Payment Successful
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                Payment Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center">
          {verificationResult.success ? (
            <>
              <p className="text-muted-foreground mb-4">
                Your payment has been processed successfully!
              </p>
              {verificationResult.credits && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    +{verificationResult.credits} credits added to your account
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                You can now use your credits to generate and enhance AI artwork.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                {verificationResult.error || "Your payment could not be processed."}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                No charges have been made to your account. Please try again or contact support.
              </p>
            </>
          )}
          
          <div className="space-y-2">
            <Link href="/" className="block">
              <Button className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </Link>
            
            {!verificationResult.success && (
              <Link href="/buy-credits" className="block">
                <Button variant="outline" className="w-full">
                  Try Again
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}