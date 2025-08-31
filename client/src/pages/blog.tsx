import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock, ArrowRight, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { Footer } from "@/components/footer";
import { PublicNavigation } from "@/components/navigation-public";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const blogPosts = [
  {
    id: "ai-art-etsy-success",
    title: "How AI Art Generation is Revolutionizing Etsy Success in 2025",
    excerpt: "Discover how digital artists are using AI tools like Imagen 3 to create profitable Etsy stores, including real case studies and proven strategies.",
    author: "Digital Art Team",
    date: "2025-01-15",
    readTime: "8 min read",
    category: "AI Art",
    featured: true,
    slug: "ai-art-etsy-success-2025"
  },
  {
    id: "image-upscaling-guide",
    title: "The Complete Guide to AI Image Upscaling for Print-on-Demand",
    excerpt: "Learn how Real-ESRGAN AI upscaling can transform low-resolution artwork into stunning 4K prints that sell on Etsy, Amazon, and other platforms.",
    author: "Digital Art Team",
    date: "2025-01-10",
    readTime: "12 min read",
    category: "Image Processing",
    featured: true,
    slug: "ai-image-upscaling-print-on-demand"
  },
  {
    id: "mockup-templates-etsy",
    title: "5 Room Mockup Templates That Boost Etsy Sales by 300%",
    excerpt: "Professional room mockups are essential for Etsy success. Learn which room settings perform best and how to create compelling product presentations.",
    author: "Digital Art Team",
    date: "2025-01-05",
    readTime: "6 min read",
    category: "Mockup Design",
    featured: false,
    slug: "room-mockup-templates-etsy-sales"
  },
  {
    id: "etsy-seo-optimization",
    title: "Etsy SEO Optimization: AI-Powered Listing Content That Converts",
    excerpt: "Master Etsy SEO with AI-generated titles, tags, and descriptions. Includes keyword research tools and optimization strategies that increase visibility.",
    author: "Digital Art Team",
    date: "2024-12-28",
    readTime: "10 min read",
    category: "Etsy Marketing",
    featured: false,
    slug: "etsy-seo-ai-listing-optimization"
  },
  {
    id: "print-format-sizes",
    title: "Essential Print Sizes for Digital Art: What Sells Best on Etsy",
    excerpt: "Comprehensive guide to the 5 most profitable print sizes for digital art, including customer preferences and platform-specific requirements.",
    author: "Digital Art Team",
    date: "2024-12-20",
    readTime: "7 min read",
    category: "Print Business",
    featured: false,
    slug: "best-print-sizes-digital-art-etsy"
  },
  {
    id: "digital-art-automation",
    title: "Automating Your Digital Art Business: From Upload to Sale",
    excerpt: "Step-by-step guide to automating your entire digital art workflow, from AI generation to Etsy listing, saving 20+ hours per week.",
    author: "Digital Art Team",
    date: "2024-12-15",
    readTime: "15 min read",
    category: "Automation",
    featured: false,
    slug: "automate-digital-art-business-workflow"
  }
];

export default function BlogPage() {
  const featuredPosts = blogPosts.filter(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

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

    setIsSubscribing(true);
    
    try {
      const response = await apiRequest("POST", "/api/newsletter/subscribe", { email, source: "blog" });

      if (response.success) {
        toast({
          title: "Successfully subscribed!",
          description: "Welcome to our newsletter! You'll receive weekly insights on digital art trends and AI tools.",
          variant: "default",
        });
        setEmail("");
      }
    } catch (error: any) {
      if (error.message?.includes("already subscribed")) {
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

        {/* Featured Posts */}
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
                      {new Date(post.date).toLocaleDateString('en-US', { 
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
                        {post.readTime}
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

        {/* Recent Posts */}
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
                      {post.readTime}
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
                      {new Date(post.date).toLocaleDateString('en-US', { 
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

        {/* Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">AI Art</h3>
                <p className="text-sm text-muted-foreground">Generation & Tools</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Image Processing</h3>
                <p className="text-sm text-muted-foreground">Upscaling & Enhancement</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Etsy Marketing</h3>
                <p className="text-sm text-muted-foreground">SEO & Sales Tips</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Business Growth</h3>
                <p className="text-sm text-muted-foreground">Scaling Strategies</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="text-center bg-muted/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Stay Updated with Digital Art Trends</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get weekly insights on AI art generation, Etsy optimization, and digital marketing strategies delivered straight to your inbox.
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