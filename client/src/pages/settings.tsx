import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

import Navigation from "@/components/navigation";
import CreditTransactionHistory from "@/components/credit-transaction-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User as UserIcon, CreditCard, Shield, AlertCircle } from "lucide-react";

export default function Settings() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const currentUser = user || authUser;
  const subscriptionStatus = currentUser?.subscriptionStatus || "free";
  const subscriptionEndDate = currentUser?.subscriptionEndDate
    ? new Date(currentUser.subscriptionEndDate)
    : null;
  const isPaidPlan = Boolean(currentUser?.subscriptionPlan && currentUser.subscriptionPlan !== "free");
  const isCancellationScheduled = subscriptionStatus === "cancelled" && subscriptionEndDate;

  // Initialize form data when user data loads
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
      });
    }
  }, [currentUser]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      return await apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cancel-subscription");
    },
    onSuccess: async (response) => {
      let description = "Your subscription has been scheduled for cancellation.";
      try {
        const payload = await response.json();
        if (payload?.message) {
          description = payload.message;
        }
      } catch {
        // ignore json errors
      }
      toast({
        title: "Subscription updated",
        description,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: async (error: any) => {
      let description = "Failed to cancel subscription. Please try again later.";
      if (error instanceof Response) {
        try {
          const text = await error.text();
          description = text || description;
        } catch {
          // ignore
        }
      } else if (error instanceof Error) {
        description = error.message;
      }
      toast({
        title: "Cancellation failed",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={currentUser ? {
        name: currentUser.name,
        avatar: currentUser.avatar || undefined,
        credits: currentUser.credits
      } : undefined} />
      
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="w-6 h-6 mr-2 text-primary" />
            Account
          </h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <a
                    href="#profile"
                    className="flex items-center px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md"
                    data-testid="nav-profile"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                  </a>
                  <a
                    href="#billing"
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                    data-testid="nav-billing"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Billing & Credits
                  </a>

                  <a
                    href="#security"
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                    data-testid="nav-security"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Security
                  </a>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Plan */}
            <Card id="subscription">
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Your current subscription plan and usage details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Plan Type</Label>
                    <div className="mt-1 text-sm font-medium text-gray-900 capitalize">
                      {currentUser?.subscriptionPlan ? (
                        currentUser.subscriptionPlan === 'pro_monthly' ? 'Pro Plan' :
                        currentUser.subscriptionPlan === 'business_monthly' ? 'Business Plan' :
                        currentUser.subscriptionPlan
                      ) : 'Free Plan'}
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subscriptionStatus === "active"
                            ? "bg-green-100 text-green-800"
                            : subscriptionStatus === "cancelled"
                            ? "bg-amber-100 text-amber-800"
                            : subscriptionStatus === "free"
                            ? "bg-slate-100 text-slate-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {subscriptionStatus === "active"
                          ? "Active"
                          : subscriptionStatus === "cancelled"
                          ? "Cancelling"
                          : subscriptionStatus === "free"
                          ? "Free"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                {isCancellationScheduled && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">Subscription will end soon</p>
                      <p className="text-xs text-amber-700">
                        Your current plan remains active until{" "}
                        {subscriptionEndDate?.toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        . No further charges will occur.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Available Credits</p>
                      <p className="text-sm text-gray-600">{currentUser?.credits || 0} credits remaining</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" asChild>
                        <a href="/pricing">Upgrade Plan</a>
                      </Button>
                      {subscriptionStatus === "active" && isPaidPlan && (
                        <Button
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700"
                          disabled={cancelSubscriptionMutation.isPending}
                          onClick={() => cancelSubscriptionMutation.mutate()}
                        >
                          {cancelSubscriptionMutation.isPending ? "Cancelling…" : "Cancel subscription"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Settings */}
            <Card id="profile">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account profile information and email address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end space-x-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Billing & Credits */}
            <Card id="billing">
              <CardHeader>
                <CardTitle>Billing & Credits</CardTitle>
                <CardDescription>
                  Manage your credits and billing information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Current Credits</h3>
                      <p className="text-gray-600">Available for AI generation and processing</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-primary" data-testid="text-credits">
                        {currentUser?.credits || 0}
                      </span>
                      <p className="text-sm text-gray-500">credits</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <p>• AI image generation: 2 credits per image</p>
                  <p>• Image upscaling (2x): 1 credit per operation</p>
                  <p>• Image upscaling (4x): 2 credits per operation</p>
                  <p>• Etsy listing generation: 2 credits per listing</p>
                  <p>• Mockup generation: 1 credit per template</p>
                </div>

                <Separator />

                <Button 
                  variant="outline" 
                  className="w-full" 
                  data-testid="button-buy-credits"
                  onClick={() => window.location.href = '/pricing'}
                >
                  Buy More Credits
                </Button>
              </CardContent>
            </Card>

            {/* Credit Transaction History */}
            <CreditTransactionHistory />



            {/* Security */}
            <Card id="security">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and data preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Account ID</h4>
                      <p className="text-sm text-gray-600 font-mono">{currentUser?.id}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="destructive" size="sm" data-testid="button-delete">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
