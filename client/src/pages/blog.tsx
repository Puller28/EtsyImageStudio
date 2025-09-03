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

const blogPosts = [
  {
    id: "minimalist-digital-art-guide",
    title: "Minimalist Digital Art: Complete Guide to Clean, Modern Designs",
    excerpt: "Master minimalist art that sells consistently. Learn color palettes, composition principles, and marketing strategies for maximum conversions.",
    author: "Digital Art Team",
    date: "2025-09-03",
    readTime: "9 min read",
    category: "Design Trends",
    featured: true,
    slug: "minimalist-digital-art-guide"
  },
  {
    id: "cottagecore-art-prints-guide",
    title: "Cottagecore Art Prints: Pastoral Digital Downloads That Sell",
    excerpt: "Capture the $1.2B cottagecore market with authentic pastoral designs. Complete guide to colors, motifs, and marketing strategies.",
    author: "Digital Art Team",
    date: "2025-09-04",
    readTime: "8 min read",
    category: "Design Trends",
    featured: true,
    slug: "cottagecore-art-prints-guide"
  },
  {
    id: "etsy-digital-art-pricing-guide",
    title: "Etsy Digital Art Pricing Strategy: How Much to Charge in 2025",
    excerpt: "Master digital art pricing from $2 to $65 per download. Real market data, psychology-based strategies, and profit optimization techniques.",
    author: "Digital Art Team",
    date: "2025-09-05",
    readTime: "12 min read",
    category: "Business Strategy",
    featured: true,
    slug: "etsy-digital-art-pricing-guide"
  },
  {
    id: "ai-art-etsy-success",
    title: "How AI Art Generation is Revolutionizing Etsy Success in 2025",
    excerpt: "Discover how digital artists are using AI tools like Imagen 3 to create profitable Etsy stores, including real case studies and proven strategies.",
    author: "Digital Art Team",
    date: "2025-01-15",
    readTime: "8 min read",
    category: "AI Art",
    featured: false,
    slug: "ai-art-etsy-success-2025"
  },
  {
    id: "tshirt-mockup-bella-canvas-guide",
    title: "T-Shirt Mockup Photography: Bella Canvas 3001 Setup Guide",
    excerpt: "Master professional Bella Canvas 3001 mockups that increase conversions by 340%. Complete photography setup and design placement guide.",
    author: "Digital Art Team",
    date: "2025-09-06",
    readTime: "10 min read",
    category: "Mockup Design",
    featured: true,
    slug: "tshirt-mockup-bella-canvas-guide"
  },
  {
    id: "ai-prompt-to-etsy-sale-workflow",
    title: "From AI Prompt to Etsy Sale: Complete Digital Art Workflow",
    excerpt: "Step-by-step blueprint from AI prompt to profitable Etsy sales. Real case studies showing $0 to $5K/month in 90 days.",
    author: "Digital Art Team",
    date: "2025-09-07",
    readTime: "13 min read",
    category: "AI Art",
    featured: true,
    slug: "ai-prompt-to-etsy-sale-workflow"
  },
  {
    id: "halloween-digital-art-collection",
    title: "Digital Halloween Art Collection: Spooky Prints That Sell Fast",
    excerpt: "Capture $15K revenue in 60 days with Halloween digital art. Complete seasonal strategy for maximum Halloween sales.",
    author: "Digital Art Team",
    date: "2025-09-08",
    readTime: "9 min read",
    category: "Seasonal Marketing",
    featured: true,
    slug: "halloween-digital-art-collection"
  },
  {
    id: "printable-wall-art-sizes-guide",
    title: "Complete Guide to Printable Wall Art Sizes: 8x10, 16x20, 24x36 for Etsy Success",
    excerpt: "Master the essential 5 print sizes that drive maximum sales. Psychology-based sizing strategy and profit optimization guide.",
    author: "Digital Art Team",
    date: "2025-01-16",
    readTime: "9 min read",
    category: "Print Business",
    featured: false,
    slug: "printable-wall-art-sizes-guide"
  },
  {
    id: "ai-generated-art-vs-traditional",
    title: "AI Generated Art vs Traditional Digital Art: Quality Comparison 2025",
    excerpt: "Comprehensive quality analysis reveals the truth about AI vs traditional art for commercial success and customer satisfaction.",
    author: "Digital Art Team",
    date: "2025-01-17",
    readTime: "11 min read",
    category: "AI Art",
    featured: false,
    slug: "ai-generated-art-vs-traditional"
  },
  {
    id: "300-dpi-digital-downloads-guide",
    title: "300 DPI Digital Downloads: Why Print Quality Matters for Etsy Sales",
    excerpt: "300 DPI is the make-or-break factor for digital art success. Complete technical guide to print quality and customer satisfaction.",
    author: "Digital Art Team",
    date: "2025-01-18",
    readTime: "8 min read",
    category: "Print Business",
    featured: false,
    slug: "300-dpi-digital-downloads-guide"
  },
  {
    id: "boho-digital-art-trends-2025",
    title: "Boho Digital Art Trends 2025: Creating Best-Selling Printable Decor",
    excerpt: "Boho style is the $2M trend taking over Etsy. Complete guide to colors, patterns, and marketing strategies that convert.",
    author: "Digital Art Team",
    date: "2025-01-19",
    readTime: "10 min read",
    category: "Design Trends",
    featured: false,
    slug: "boho-digital-art-trends-2025"
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

            <Link href="/blog/automate-digital-art-business-workflow">
              <Card className="text-center hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Business Growth</h3>
                  <p className="text-sm text-muted-foreground">Scaling Strategies</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

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