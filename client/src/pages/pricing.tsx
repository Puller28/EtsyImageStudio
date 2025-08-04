import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Star, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "Free",
    credits: 100,
    features: [
      "100 credits included",
      "Image upscaling (2x & 4x)",
      "5 print formats",
      "Basic mockups",
      "AI-powered Etsy listings",
      "ZIP downloads"
    ],
    icon: Zap,
    buttonText: "Get Started Free",
    buttonVariant: "outline"
  },
  {
    name: "Pro",
    price: "$29",
    credits: 500,
    features: [
      "500 credits per month",
      "Premium mockup templates",
      "Advanced print formats",
      "Priority processing",
      "Bulk operations",
      "Email support"
    ],
    popular: true,
    icon: Star,
    buttonText: "Go Pro"
  },
  {
    name: "Business",
    price: "$79",
    credits: 1500,
    features: [
      "1,500 credits per month",
      "All Pro features",
      "Custom mockup templates",
      "API access",
      "White-label options",
      "Priority support"
    ],
    icon: Crown,
    buttonText: "Scale Business"
  }
];

interface PricingProps {
  onSelectPlan?: (plan: string) => void;
}

export default function Pricing({ onSelectPlan }: PricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    
    if (planName === "Starter") {
      toast({
        title: "Welcome to EtsyArt Pro!",
        description: "Your free credits are ready to use. Start creating amazing artwork!",
      });
    } else {
      toast({
        title: "Payment Coming Soon",
        description: `${planName} plan selected. Payment integration will be available soon!`,
      });
    }
    
    onSelectPlan?.(planName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12 px-4">
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {pricingTiers.map((tier) => {
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
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={tier.buttonVariant || "default"}
                    onClick={() => handleSelectPlan(tier.name)}
                    disabled={selectedPlan === tier.name}
                    data-testid={`button-plan-${tier.name.toLowerCase()}`}
                  >
                    {selectedPlan === tier.name ? "Selected" : tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Credit System Explanation */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">How Credits Work</CardTitle>
            <CardDescription className="text-center">
              Understanding our simple, transparent pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Credit Usage</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• <strong>1 credit</strong> = 1 image processed</li>
                  <li>• Includes upscaling + print formats + mockups</li>
                  <li>• AI listing generation included</li>
                  <li>• Unlimited downloads of your assets</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">What You Get</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• High-resolution upscaled image</li>
                  <li>• 5 print-ready formats</li>
                  <li>• Professional mockups</li>
                  <li>• SEO-optimized Etsy listing</li>
                  <li>• Complete ZIP package</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}