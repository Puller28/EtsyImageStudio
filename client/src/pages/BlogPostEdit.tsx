import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  content: string;
  keywords: string[];
  status: string;
  readingTime: number;
  seoScore: number;
}

export default function BlogPostEdit() {
  const [, params] = useRoute("/admin/blog-posts/:id/edit");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    if (params?.id) {
      loadPost(params.id);
    }
  }, [params?.id]);

  const loadPost = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/blog/posts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      if (!response.ok) throw new Error("Failed to load post");

      const data = await response.json();
      setPost(data);
    } catch (error) {
      toast({
        title: "Failed to load post",
        description: "Could not load blog post. Please try again.",
        variant: "destructive"
      });
      setLocation("/admin/blog-posts");
    } finally {
      setLoading(false);
    }
  };

  const savePost = async () => {
    if (!post) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: post.title,
          slug: post.slug,
          metaDescription: post.metaDescription,
          content: post.content,
          keywords: post.keywords,
          readingTime: post.readingTime,
          seoScore: post.seoScore,
        })
      });

      if (!response.ok) throw new Error("Failed to save");

      toast({
        title: "Saved!",
        description: "Blog post has been updated."
      });

      setLocation("/admin/blog-posts");
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const publishPost = async () => {
    if (!post) return;

    try {
      // First save changes
      await savePost();

      // Then publish if it's a draft
      if (post.status === "draft") {
        const response = await fetch(`/api/admin/blog/posts/${post.id}/publish`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });

        if (!response.ok) throw new Error("Failed to publish");

        toast({
          title: "Published!",
          description: "Blog post is now live."
        });
      }

      setLocation("/admin/blog-posts");
    } catch (error) {
      toast({
        title: "Publish failed",
        description: "Failed to publish post. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/blog-posts")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Blog Post</h1>
              <p className="text-gray-600">Make changes to your blog post</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={savePost} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            {post.status === "draft" && (
              <Button onClick={publishPost} disabled={saving}>
                <Eye className="mr-2 h-4 w-4" />
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <Badge variant={post.status === "published" ? "default" : "secondary"} className="capitalize">
            {post.status}
          </Badge>
        </div>

        {/* Edit Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardDescription>Edit your blog post content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={post.title}
                    onChange={(e) => setPost({ ...post, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={post.slug}
                    onChange={(e) => setPost({ ...post, slug: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">URL: /blog/{post.slug}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={post.metaDescription}
                    onChange={(e) => setPost({ ...post, metaDescription: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">{post.metaDescription.length}/160 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={post.content}
                    onChange={(e) => setPost({ ...post, content: e.target.value })}
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
                <CardDescription>Search engine optimization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">SEO Score</Label>
                  <div className="mt-1">
                    <Badge variant={post.seoScore >= 80 ? "default" : "secondary"}>
                      {post.seoScore}/100
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Reading Time</Label>
                  <p className="mt-1 text-sm">{post.readingTime} min</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    value={post.keywords.join(", ")}
                    onChange={(e) => setPost({ 
                      ...post, 
                      keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                    })}
                    placeholder="keyword1, keyword2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {post.keywords.map((keyword, i) => (
                    <Badge key={i} variant="outline">{keyword}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
