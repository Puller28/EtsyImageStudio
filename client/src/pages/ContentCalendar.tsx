import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Sparkles, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentItem {
  id: string;
  date: Date;
  platform: string;
  keyword: string;
  theme: string;
  content: string;
  status: 'scheduled' | 'published' | 'draft';
}

export default function ContentCalendar() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [calendar, setCalendar] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const generateCalendar = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content-calendar/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!response.ok) throw new Error("Failed to generate calendar");

      const data = await response.json();
      setCalendar(data.calendar.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      })));

      toast({
        title: "Calendar Generated!",
        description: `Created ${data.calendar.length} posts for the week.`
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate content calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      twitter: "bg-blue-500",
      linkedin: "bg-blue-700",
      facebook: "bg-blue-600"
    };
    return colors[platform] || "bg-gray-500";
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      twitter: "𝕏",
      linkedin: "in",
      facebook: "f"
    };
    return icons[platform] || "?";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Calendar</h1>
              <p className="text-gray-600">AI-powered weekly content planning</p>
            </div>
          </div>
          <Button onClick={generateCalendar} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Week
              </>
            )}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Smart Content Generation
            </CardTitle>
            <CardDescription className="text-purple-100">
              Automatically creates 7 days of targeted content using your SEO keywords. 
              Each post is optimized for its platform and designed to drive engagement.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Calendar Grid */}
        {calendar.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendar.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${getPlatformColor(item.platform)} flex items-center justify-center text-white font-bold text-sm`}>
                        {getPlatformIcon(item.platform)}
                      </div>
                      <div>
                        <CardTitle className="text-sm capitalize">{item.platform}</CardTitle>
                        <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.theme}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Target Keyword:</p>
                    <Badge variant="outline" className="text-xs">
                      {item.keyword}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Content:</p>
                    <p className="text-sm text-gray-700 line-clamp-4">
                      {item.content}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Edit
                    </Button>
                    <Button size="sm" className="flex-1">
                      Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Calendar className="h-16 w-16 mx-auto text-gray-300" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">No Content Yet</h3>
                  <p className="text-gray-600">
                    Click "Generate Week" to create your automated content calendar
                  </p>
                </div>
                <Button onClick={generateCalendar} disabled={loading}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Content Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🎯 SEO-Optimized</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Every post targets your key SEO keywords to improve search rankings
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🤖 Platform-Aware</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Content is tailored to each platform's tone, length, and best practices
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">⚡ One-Click Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Generate a full week of content in seconds - no manual input needed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
