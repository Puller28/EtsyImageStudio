import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock, ArrowRight, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { Footer } from "@/components/footer";
import { PublicNavigation } from "@/components/navigation-public";
import { SEOHead } from "@/components/seo-head";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Blog post interface for TypeScript
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  tags: string[];
  status: string;
  featured: boolean;
  read_time: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export default function BlogPage() {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

  // Fetch blog posts from API
  const { data: blogData, isLoading, error } = useQuery({
    queryKey: ['/api/blog/posts'],
    queryFn: async () => {
      const response = await fetch('/api/blog/posts?status=published');
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      return response.json();
    },
  });

  // Static blog posts that already exist (to preserve existing content)
  const staticBlogPosts = [
    {
      id: "static-ai-art-etsy-success-2025",
      slug: "ai-art-etsy-success-2025",
      title: "AI Art Etsy Success Guide 2025",
      excerpt: "Master AI art generation and turn your creativity into a profitable Etsy business with proven strategies and tools.",
      author: "Digital Art Team",
      category: "AI Art",
      tags: ["ai art", "etsy", "business"],
      status: "published",
      featured: true,
      read_time: "12 min read",
      published_at: "2025-01-01T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z"
    },
    {
      id: "static-best-print-sizes-digital-art-etsy",
      slug: "best-print-sizes-digital-art-etsy",
      title: "Best Print Sizes for Digital Art",
      excerpt: "Discover the most profitable print sizes and formats for your digital art on Etsy and other print-on-demand platforms.",
      author: "Digital Art Team",
      category: "Digital Tools",
      tags: ["print sizes", "digital art", "etsy"],
      status: "published",
      featured: false,
      read_time: "8 min read",
      published_at: "2025-01-02T00:00:00Z",
      created_at: "2025-01-02T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z"
    },
    {
      id: "static-ai-image-upscaling-print-on-demand",
      slug: "ai-image-upscaling-print-on-demand",
      title: "AI Image Upscaling for Print-on-Demand",
      excerpt: "Transform low-resolution AI art into high-quality prints with advanced upscaling techniques and tools.",
      author: "Digital Art Team",
      category: "Digital Tools",
      tags: ["ai upscaling", "print on demand", "image quality"],
      status: "published",
      featured: false,
      read_time: "10 min read",
      published_at: "2025-01-03T00:00:00Z",
      created_at: "2025-01-03T00:00:00Z",
      updated_at: "2025-01-03T00:00:00Z"
    },
    {
      id: "static-room-mockup-templates-etsy-sales",
      slug: "room-mockup-templates-etsy-sales",
      title: "Room Mockup Templates That Boost Sales",
      excerpt: "Learn how professional room mockups can increase your Etsy conversion rates and sales performance.",
      author: "Digital Art Team",
      category: "Business",
      tags: ["mockups", "etsy sales", "templates"],
      status: "published",
      featured: false,
      read_time: "7 min read",
      published_at: "2025-01-04T00:00:00Z",
      created_at: "2025-01-04T00:00:00Z",
      updated_at: "2025-01-04T00:00:00Z"
    },
    {
      id: "static-etsy-seo-ai-listing-optimization",
      slug: "etsy-seo-ai-listing-optimization",
      title: "Etsy SEO & AI Listing Optimization",
      excerpt: "Use AI-powered tools to optimize your Etsy listings for better search rankings and increased visibility.",
      author: "Digital Art Team",
      category: "SEO",
      tags: ["etsy seo", "ai optimization", "listings"],
      status: "published",
      featured: true,
      read_time: "15 min read",
      published_at: "2025-01-05T00:00:00Z",
      created_at: "2025-01-05T00:00:00Z",
      updated_at: "2025-01-05T00:00:00Z"
    },
    {
      id: "static-mockup-generation-digital-art",
      slug: "mockup-generation-digital-art",
      title: "Mockup Generation for Digital Art",
      excerpt: "Create stunning room mockups that showcase your digital art in realistic settings to boost customer confidence.",
      author: "Digital Art Team",
      category: "Digital Tools",
      tags: ["mockups", "digital art", "room settings"],
      status: "published",
      featured: false,
      read_time: "9 min read",
      published_at: "2025-01-06T00:00:00Z",
      created_at: "2025-01-06T00:00:00Z",
      updated_at: "2025-01-06T00:00:00Z"
    },
    {
      id: "static-automate-digital-art-business-workflow",
      slug: "automate-digital-art-business-workflow",
      title: "Automate Your Digital Art Workflow",
      excerpt: "Streamline your digital art business with automation tools and workflows that save time and increase productivity.",
      author: "Digital Art Team",
      category: "Business",
      tags: ["automation", "workflow", "digital art business"],
      status: "published",
      featured: false,
      read_time: "11 min read",
      published_at: "2025-01-07T00:00:00Z",
      created_at: "2025-01-07T00:00:00Z",
      updated_at: "2025-01-07T00:00:00Z"
    }
  ];

  // Combine API posts with static posts, API posts first (most recent)
  const apiPosts: BlogPost[] = blogData?.posts || [];
  const allBlogPosts = [...apiPosts, ...staticBlogPosts];
  const featuredPosts = allBlogPosts.filter(post => post.featured);
  const regularPosts = allBlogPosts.filter(post => !post.featured);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Test toast to verify it's working
    console.log("About to show toast test");

    setIsSubscribing(true);
    
    try {
      const response = await apiRequest("POST", "/api/newsletter/subscribe", { email, source: "blog" });
      const data = await response.json();
      console.log("Newsletter API response:", data);

      if (data.success) {
        console.log("Showing success toast");
        toast({
          title: "🎉 Successfully subscribed!",
          description: "Welcome to our newsletter! You'll receive weekly insights on digital art trends and AI tools.",
          variant: "default",
          duration: 5000, // Show for 5 seconds
        });
        setEmail("");
      } else {
        throw new Error(data.message || "Subscription failed");
      }
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      
      // Handle 409 Conflict status (already subscribed)
      if (error.status === 409 || error.message?.includes("already subscribed")) {
        toast({
          title: "Already subscribed",
          description: "This email is already subscribed to our newsletter.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription failed",
          description: "Please try again later or contact support.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead />
      <PublicNavigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-6" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Digital Art Insights
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">AI Art & Etsy Success Blog</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Expert guides, tutorials, and strategies for growing your digital art business with AI-powered tools and Etsy optimization.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <section className="mb-16">
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading blog posts...</div>
            </div>
          </section>
        )}

        {/* Error State */}
        {error && (
          <section className="mb-16">
            <div className="flex items-center justify-center py-12">
              <div className="text-destructive">Failed to load blog posts. Please try again later.</div>
            </div>
          </section>
        )}

        {/* Featured Posts */}
        {!isLoading && !error && featuredPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <Card key={post.id} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{post.category}</Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{post.author}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {post.read_time}
                        </div>
                      </div>
                      <Link href={`/blog/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="group-hover:bg-primary/10" data-testid={`button-read-${post.id}`}>
                          Read More
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Recent Posts */}
        {!isLoading && !error && regularPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Recent Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">{post.category}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {post.read_time}
                      </div>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <Link href={`/blog/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" data-testid={`button-read-${post.id}`}>
                          Read More
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Show all posts in one section if no featured posts */}
        {!isLoading && !error && featuredPosts.length === 0 && allBlogPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {allBlogPosts.map((post) => (
                <Card key={post.id} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{post.category}</Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{post.author}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {post.read_time}
                        </div>
                      </div>
                      <Link href={`/blog/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="group-hover:bg-primary/10" data-testid={`button-read-${post.id}`}>
                          Read More
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Categories - Dynamic based on actual blog posts */}
        {!isLoading && !error && allBlogPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* AI Art Category */}
              {allBlogPosts.some(post => post.category === "AI Art") && (
                <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors">AI Art</h3>
                    <p className="text-sm text-muted-foreground">Generation & Tools</p>
                  </CardContent>
                </Card>
              )}

              {/* Business Category */}
              {allBlogPosts.some(post => post.category === "Business") && (
                <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors">Business Growth</h3>
                    <p className="text-sm text-muted-foreground">Scaling Strategies</p>
                  </CardContent>
                </Card>
              )}

              {/* SEO Category */}
              {allBlogPosts.some(post => post.category === "SEO") && (
                <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <Zap className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors">SEO & Marketing</h3>
                    <p className="text-sm text-muted-foreground">Optimization Tips</p>
                  </CardContent>
                </Card>
              )}

              {/* General Tools Category */}
              <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Digital Tools</h3>
                  <p className="text-sm text-muted-foreground">Enhancement & Processing</p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Newsletter Signup */}
        <section className="text-center bg-muted/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Stay Updated with Digital Art Trends</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get weekly insights on AI art generation, Etsy optimization, and digital marketing strategies delivered straight to your inbox. Ready to start? <Link href="/"><span className="text-primary hover:underline cursor-pointer">Try our AI-powered tools</span></Link> and transform your digital art workflow.
          </p>
          <form onSubmit={handleNewsletterSubscribe} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4" data-testid="form-newsletter-signup">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubscribing}
              className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              data-testid="input-newsletter-email"
            />
            <Button 
              type="submit" 
              size="lg" 
              className="px-8" 
              disabled={isSubscribing}
              data-testid="button-newsletter-subscribe"
            >
              {isSubscribing ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4">
            No spam, unsubscribe anytime. We respect your privacy.
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
}