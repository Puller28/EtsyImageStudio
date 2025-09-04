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
import { BLOG_POSTS } from "@shared/blog-data";

const allBlogPosts = BLOG_POSTS;

export default function BlogPage() {
  // Filter posts to only show published ones (current date or earlier)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const blogPosts = allBlogPosts.filter(post => {
    const postDate = new Date(post.date);
    postDate.setHours(0, 0, 0, 0); // Start of post date
    return postDate <= today; // Only show posts from today or earlier
  });

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
      const data = await response.json();

      if (data.success) {
        toast({
          title: "🎉 Successfully subscribed!",
          description: "Welcome to our newsletter! You'll receive weekly insights on digital art trends and AI tools.",
          variant: "default",
          duration: 5000,
        });
        setEmail("");
      } else {
        throw new Error(data.message || "Subscription failed");
      }
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      if (error.message?.includes('already subscribed')) {
        toast({
          title: "Already subscribed!",
          description: "You're already on our newsletter list. Thanks for being part of our community!",
          variant: "default",
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

        {/* All Articles Archive */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">All Articles</h2>
          <div className="space-y-4">
            {blogPosts.map((post) => (
              <div key={post.id} className="border-l-4 border-primary/20 pl-4 hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <Link href={`/blog/${post.slug}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer" data-testid={`link-article-${post.id}`}>
                        {post.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">{post.excerpt}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{post.category}</Badge>
                      <span>{post.readTime}</span>
                      <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <Link href={`/blog/${post.slug}`}>
                    <Button variant="outline" size="sm" data-testid={`button-read-full-${post.id}`}>
                      Read Article
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/blog/ai-art-etsy-success-2025">
              <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">AI Art</h3>
                  <p className="text-sm text-muted-foreground">Generation & Tools</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/blog/ai-image-upscaling-print-on-demand">
              <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <Zap className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Image Processing</h3>
                  <p className="text-sm text-muted-foreground">Upscaling & Enhancement</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/blog/etsy-seo-ai-listing-optimization">
              <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Etsy Marketing</h3>
                  <p className="text-sm text-muted-foreground">SEO & Sales Tips</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/blog/best-print-sizes-digital-art-etsy">
              <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Print Business</h3>
                  <p className="text-sm text-muted-foreground">Sizes & Formats</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Newsletter */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Stay Updated with Digital Art Trends</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Get weekly insights on AI art generation, Etsy strategies, and digital marketing tips delivered straight to your inbox.
              </p>
              <form onSubmit={handleNewsletterSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 px-4 py-2 border border-input rounded-md bg-background"
                  required
                  data-testid="input-newsletter-email"
                />
                <Button 
                  type="submit" 
                  disabled={isSubscribing}
                  data-testid="button-newsletter-subscribe"
                >
                  {isSubscribing ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* SEO Internal Links Section - Prevents Orphan Pages */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Complete Digital Art Guide Library</h2>
            <p className="text-muted-foreground">Explore our comprehensive collection of digital art guides and tutorials</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link href="/blog/minimalist-digital-art-guide" className="block">
                  <h3 className="font-medium text-primary hover:underline mb-2">Minimalist Digital Art Guide</h3>
                  <p className="text-sm text-muted-foreground">Master clean, modern designs that sell consistently on Etsy and other platforms.</p>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link href="/blog/cottagecore-art-prints-guide" className="block">
                  <h3 className="font-medium text-primary hover:underline mb-2">Cottagecore Art Prints Guide</h3>
                  <p className="text-sm text-muted-foreground">Capture the $1.2B cottagecore market with authentic, nature-inspired designs.</p>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link href="/blog/boho-digital-art-trends-2025" className="block">
                  <h3 className="font-medium text-primary hover:underline mb-2">Boho Digital Art Trends 2025</h3>
                  <p className="text-sm text-muted-foreground">Boho style is the $2M trend taking over Etsy - learn the essential elements.</p>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link href="/blog/printable-wall-art-sizes-guide" className="block">
                  <h3 className="font-medium text-primary hover:underline mb-2">Printable Wall Art Sizes Guide</h3>
                  <p className="text-sm text-muted-foreground">Master the essential 5 print sizes for maximum sales and customer satisfaction.</p>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link href="/blog/300-dpi-digital-downloads-guide" className="block">
                  <h3 className="font-medium text-primary hover:underline mb-2">300 DPI Digital Downloads Guide</h3>
                  <p className="text-sm text-muted-foreground">300 DPI is the make-or-break factor for digital art success - get it right.</p>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link href="/blog/ai-generated-art-vs-traditional" className="block">
                  <h3 className="font-medium text-primary hover:underline mb-2">AI Generated Art vs Traditional Digital Art</h3>
                  <p className="text-sm text-muted-foreground">Quality analysis reveals the truth about AI vs traditional art for commercial success.</p>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}