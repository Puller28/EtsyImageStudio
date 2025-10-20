import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Copy, Download, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedBlogPost {
  title: string;
  slug: string;
  metaDescription: string;
  content: string;
  keywords: string[];
  readingTime: number;
  seoScore: number;
  suggestions: string[];
}

export default function BlogGenerator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [generatedPost, setGeneratedPost] = useState<GeneratedBlogPost | null>(null);
  const [copied, setCopied] = useState(false);

  const generateBlogPost = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a blog post topic",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          topic,
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
          tone,
          length,
          targetAudience: "Etsy sellers and print-on-demand entrepreneurs"
        })
      });

      if (!response.ok) throw new Error("Failed to generate blog post");

      const post = await response.json();
      setGeneratedPost(post);
      
      toast({
        title: "Blog post generated!",
        description: `${post.readingTime} min read • SEO Score: ${post.seoScore}/100`
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate blog post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedPost) return;
    
    const fullContent = `# ${generatedPost.title}\n\n${generatedPost.metaDescription}\n\n${generatedPost.content}`;
    navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied!",
      description: "Blog post copied to clipboard"
    });
  };

  const downloadMarkdown = () => {
    if (!generatedPost) return;
    
    const fullContent = `# ${generatedPost.title}\n\n${generatedPost.metaDescription}\n\n${generatedPost.content}`;
    const blob = new Blob([fullContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedPost.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Blog post saved as markdown file"
    });
  };

  const saveDraft = async () => {
    if (!generatedPost) return;

    try {
      const response = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: generatedPost.title,
          slug: generatedPost.slug,
          metaDescription: generatedPost.metaDescription,
          content: generatedPost.content,
          keywords: generatedPost.keywords,
          readingTime: generatedPost.readingTime,
          seoScore: generatedPost.seoScore,
        })
      });

      if (!response.ok) throw new Error("Failed to save draft");

      toast({
        title: "Draft saved!",
        description: "Blog post saved as draft. You can publish it later."
      });

      // Navigate to blog management
      setTimeout(() => setLocation("/admin/blog-posts"), 1500);
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save blog post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const publishNow = async () => {
    if (!generatedPost) return;

    try {
      // First save as draft
      const saveResponse = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: generatedPost.title,
          slug: generatedPost.slug,
          metaDescription: generatedPost.metaDescription,
          content: generatedPost.content,
          keywords: generatedPost.keywords,
          readingTime: generatedPost.readingTime,
          seoScore: generatedPost.seoScore,
        })
      });

      if (!saveResponse.ok) throw new Error("Failed to save post");

      const savedPost = await saveResponse.json();

      // Then publish it
      const publishResponse = await fetch(`/api/admin/blog/posts/${savedPost.id}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!publishResponse.ok) throw new Error("Failed to publish post");

      toast({
        title: "Published!",
        description: "Blog post is now live on your website."
      });

      // Navigate to blog management
      setTimeout(() => setLocation("/admin/blog-posts"), 1500);
    } catch (error) {
      toast({
        title: "Publish failed",
        description: "Failed to publish blog post. Please try again.",
        variant: "destructive"
      });
    }
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
            <h1 className="text-3xl font-bold text-gray-900">AI Blog Generator</h1>
            <p className="text-gray-600">Create SEO-optimized blog posts in seconds</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Blog Post Settings</CardTitle>
              <CardDescription>Configure your blog post parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., 10 Etsy SEO Tips for 2025"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  placeholder="etsy seo, etsy tips, etsy selling"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
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
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="length">Length</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (~500 words)</SelectItem>
                    <SelectItem value="medium">Medium (~1000 words)</SelectItem>
                    <SelectItem value="long">Long (~2000 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={generateBlogPost}
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
                    Generate Blog Post
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Content */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>
                {generatedPost ? "Your AI-generated blog post is ready!" : "Generate a blog post to see results"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedPost ? (
                <div className="space-y-4">
                  {/* SEO Score */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">SEO Score</span>
                    <Badge variant={generatedPost.seoScore >= 80 ? "default" : "secondary"}>
                      {generatedPost.seoScore}/100
                    </Badge>
                  </div>

                  {/* Reading Time */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Reading Time</span>
                    <span className="text-sm">{generatedPost.readingTime} min</span>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Keywords</span>
                    <div className="flex flex-wrap gap-2">
                      {generatedPost.keywords.map((keyword) => (
                        <Badge key={keyword} variant="outline">{keyword}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions */}
                  {generatedPost.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Suggestions</span>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {generatedPost.suggestions.map((suggestion, i) => (
                          <li key={i}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button onClick={downloadMarkdown} variant="outline" className="flex-1">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveDraft} variant="secondary" className="flex-1">
                        Save Draft
                      </Button>
                      <Button onClick={publishNow} className="flex-1">
                        Publish Now
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No content generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {generatedPost && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your blog post will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <h1>{generatedPost.title}</h1>
                <p className="text-gray-600 italic">{generatedPost.metaDescription}</p>
                <div 
                  className="mt-4"
                  dangerouslySetInnerHTML={{ 
                    __html: generatedPost.content.replace(/\n/g, '<br />') 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
