import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, Eye, EyeOff, Plus, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  readingTime: number;
  seoScore: number;
  publishedAt: string | null;
  createdAt: string;
}

export default function BlogManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingPins, setGeneratingPins] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/blog/posts", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to load posts");

      const data = await response.json();
      setPosts(data);
    } catch (error) {
      toast({
        title: "Failed to load posts",
        description: "Could not load blog posts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const publishPost = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/blog/posts/${id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to publish");

      toast({
        title: "Published!",
        description: "Blog post is now live."
      });

      loadPosts();
    } catch (error) {
      toast({
        title: "Publish failed",
        description: "Failed to publish post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const unpublishPost = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/blog/posts/${id}/unpublish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to unpublish");

      toast({
        title: "Unpublished",
        description: "Blog post moved to drafts."
      });

      loadPosts();
    } catch (error) {
      toast({
        title: "Unpublish failed",
        description: "Failed to unpublish post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deletePost = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/admin/blog/posts/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast({
        title: "Deleted",
        description: "Blog post has been deleted."
      });

      setDeleteId(null);
      loadPosts();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generatePinterestPins = async (postId: string) => {
    try {
      setGeneratingPins(postId);
      const response = await fetch(`/api/admin/blog/posts/${postId}/generate-pinterest-pins`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to generate pins");

      const result = await response.json();

      toast({
        title: "Pinterest Pins Generated!",
        description: `${result.pinsCreated || 3} pins have been sent to Make.com for posting.`
      });
    } catch (error) {
      toast({
        title: "Pin generation failed",
        description: "Failed to generate Pinterest pins. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPins(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      published: "default",
      draft: "secondary",
      archived: "outline"
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
              <p className="text-gray-600">Manage your blog content</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open("/blog", "_blank")}>
              <Eye className="mr-2 h-4 w-4" />
              View Blog
            </Button>
            <Button onClick={() => setLocation("/admin/blog-generator")}>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{posts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {posts.filter(p => p.status === "published").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {posts.filter(p => p.status === "draft").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
            <CardDescription>View and manage your blog posts</CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="mb-4">No blog posts yet</p>
                <Button onClick={() => setLocation("/admin/blog-generator")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Post
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SEO Score</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{post.title}</div>
                          <div className="text-sm text-gray-500">/{post.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(post.status)}</TableCell>
                      <TableCell>
                        <Badge variant={post.seoScore >= 80 ? "default" : "secondary"}>
                          {post.seoScore}/100
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(post.publishedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(post.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/admin/blog-posts/${post.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => generatePinterestPins(post.id)}
                            disabled={generatingPins === post.id}
                            title="Generate Pinterest Pins"
                          >
                            <Share2 className={`h-4 w-4 text-pink-600 ${generatingPins === post.id ? 'animate-spin' : ''}`} />
                          </Button>
                          {post.status === "published" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => unpublishPost(post.id)}
                              title="Unpublish"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => publishPost(post.id)}
                              title="Publish"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(post.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePost} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
