import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, TrendingUp, DollarSign, FileText, Share2, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MarketingMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  conversionRate: number;
  averageCreditsUsed: number;
  userJourney: Array<{
    stage: string;
    count: number;
    dropoffRate: number;
  }>;
  revenueMetrics: {
    totalRevenue: number;
    averageRevenuePerUser: number;
    subscriptions: {
      active: number;
      cancelled: number;
      trial: number;
    };
  };
}

interface ConversionFunnel {
  stage: string;
  users: number;
  dropoff: number;
  conversionRate: number;
}

interface FeatureUsage {
  feature: string;
  usage: number;
  users: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnel[]>([]);
  const [features, setFeatures] = useState<FeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (!user?.isAdmin) {
      navigate("/");
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [metricsRes, funnelRes, featuresRes] = await Promise.all([
        fetch("/api/admin/marketing/metrics", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }),
        fetch("/api/admin/marketing/funnel", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }),
        fetch("/api/admin/marketing/features", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (funnelRes.ok) setFunnel(await funnelRes.json());
      if (featuresRes.ok) setFeatures(await featuresRes.json());
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Marketing Dashboard</h1>
            <p className="text-gray-600 mt-2">Track performance and automate your marketing</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            Back to App
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3" />
                  {metrics?.newUsers || 0} new this week
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Users who used credits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics?.revenueMetrics.totalRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.revenueMetrics.subscriptions.active || 0} active subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="features">Feature Usage</TabsTrigger>
            <TabsTrigger value="tools">Marketing Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Breakdown</CardTitle>
                  <CardDescription>Current subscription status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active</span>
                    <span className="font-bold text-green-600">
                      {metrics?.revenueMetrics.subscriptions.active || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Trial</span>
                    <span className="font-bold text-blue-600">
                      {metrics?.revenueMetrics.subscriptions.trial || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cancelled</span>
                    <span className="font-bold text-red-600">
                      {metrics?.revenueMetrics.subscriptions.cancelled || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Metrics</CardTitle>
                  <CardDescription>Per user statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Credits Used</span>
                    <span className="font-bold">
                      {metrics?.averageCreditsUsed.toFixed(1) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Revenue per User</span>
                    <span className="font-bold">
                      ${metrics?.revenueMetrics.averageRevenuePerUser.toFixed(2) || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Journey Funnel</CardTitle>
                <CardDescription>See where users drop off in the conversion process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnel.map((stage, index) => (
                    <div key={stage.stage} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-sm text-gray-600">
                          {stage.users} users ({stage.conversionRate.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
                          style={{ width: `${stage.conversionRate}%` }}
                        ></div>
                      </div>
                      {stage.dropoff > 0 && (
                        <p className="text-xs text-red-600 flex items-center">
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          {stage.dropoff} users dropped off
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>Most popular features by usage count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {features.map((feature) => (
                    <div key={feature.feature} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{feature.feature}</span>
                        <span className="text-sm text-gray-600">
                          {feature.usage} uses by {feature.users} users
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                          style={{ 
                            width: `${Math.min((feature.usage / Math.max(...features.map(f => f.usage))) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/blog-generator")}>
                <CardHeader>
                  <FileText className="h-8 w-8 text-purple-600 mb-2" />
                  <CardTitle>Blog Generator</CardTitle>
                  <CardDescription>Create SEO-optimized blog posts with AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Generate Blog Post
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/social-media")}>
                <CardHeader>
                  <Share2 className="h-8 w-8 text-pink-600 mb-2" />
                  <CardTitle>Social Media</CardTitle>
                  <CardDescription>Automate social media posts across platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Create Posts
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>Deep dive into user behavior and metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" onClick={loadData}>
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
