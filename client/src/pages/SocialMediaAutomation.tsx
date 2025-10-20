import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Copy, Check, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedPost {
  platform: string;
  content: string;
  hashtags: string[];
  characterCount: number;
  optimalPostTime: string;
  suggestions: string[];
}

export default function SocialMediaAutomation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("casual");
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [copied, setCopied] = useState(false);

  const generateSmartPost = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/social/generate-smart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ platform })
      });

      if (!response.ok) throw new Error("Failed to generate post");

      const data = await response.json();
      setGeneratedPost({
        platform,
        content: data.content,
        hashtags: data.hashtags.split(' '),
        characterCount: data.content.length,
        optimalPostTime: "9:00 AM",
        suggestions: [`Keyword: ${data.keyword}`, `Theme: ${data.theme}`]
      });
      
      toast({
        title: "Smart post generated!",
        description: `Targeting: ${data.keyword}`
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePost = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a post topic",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/social/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          platform,
          topic,
          tone,
          includeHashtags: true,
          includeEmojis: true,
          callToAction: "Try it free today!"
        })
      });

      if (!response.ok) throw new Error("Failed to generate post");

      const post = await response.json();
      setGeneratedPost(post);
      
      toast({
        title: "Post generated!",
        description: `${post.characterCount} characters • ${post.hashtags.length} hashtags`
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedPost) return;
    
    navigator.clipboard.writeText(generatedPost.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied!",
      description: "Post copied to clipboard"
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
      facebook: "bg-blue-600",
      twitter: "bg-sky-500",
      pinterest: "bg-red-600",
      linkedin: "bg-blue-700"
    };
    return colors[platform] || "bg-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Social Media Automation</h1>
            <p className="text-gray-600">Generate platform-optimized posts with AI</p>
          </div>
        </div>

        <Tabs defaultValue="single" className="space-y-4">
          <TabsList>
            <TabsTrigger value="single">Single Post</TabsTrigger>
            <TabsTrigger value="calendar">Weekly Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Post Settings</CardTitle>
                  <CardDescription>Configure your social media post</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="pinterest">Pinterest</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic *</Label>
                    <Textarea
                      id="topic"
                      placeholder="e.g., Announcing our new AI art feature"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                        <SelectItem value="educational">Educational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={generateSmartPost}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Smart Generate (AI Picks Topic)
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full" 
                      onClick={generatePost}
                      disabled={loading}
                    >
                      Generate with Custom Topic
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Post</CardTitle>
                  <CardDescription>
                    {generatedPost ? "Your post is ready!" : "Generate a post to see results"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedPost ? (
                    <div className="space-y-4">
                      {/* Platform Badge */}
                      <div className={`${getPlatformColor(generatedPost.platform)} text-white px-4 py-2 rounded-lg text-center font-medium capitalize`}>
                        {generatedPost.platform}
                      </div>

                      {/* Post Content */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="whitespace-pre-wrap text-sm">{generatedPost.content}</p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-600">Characters</span>
                          <p className="text-lg font-bold">{generatedPost.characterCount}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-600">Hashtags</span>
                          <p className="text-lg font-bold">{generatedPost.hashtags.length}</p>
                        </div>
                      </div>

                      {/* Optimal Time */}
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <div>
                          <span className="text-xs text-blue-600 font-medium">Best time to post</span>
                          <p className="text-sm">{generatedPost.optimalPostTime}</p>
                        </div>
                      </div>

                      {/* Suggestions */}
                      {generatedPost.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Suggestions</span>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {generatedPost.suggestions.map((suggestion, i) => (
                              <li key={i}>• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Copy Button */}
                      <Button onClick={copyToClipboard} variant="outline" className="w-full">
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? "Copied!" : "Copy to Clipboard"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-12">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No post generated yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Content Calendar</CardTitle>
                <CardDescription>Generate a week's worth of content for multiple platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Coming soon: Generate 7 days of content across all platforms</p>
                  <Button disabled>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Weekly Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
