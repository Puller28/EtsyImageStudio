import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Users, Target } from "lucide-react";
import { PublicNavigation } from "@/components/navigation-public";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead />
      <PublicNavigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">About Us</h1>
          <p className="text-muted-foreground">Learn more about Digital Art Helper and our mission</p>
        </div>

        <div className="space-y-6">
          {/* Our Mission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">
                Our mission is to provide artists and creators with the best tools to bring their digital creations to life. 
                We believe in empowering creativity through technology, making high-quality <Link href="/features" className="text-primary hover:underline">image processing and generation features</Link> 
                accessible to everyone. Learn more about our <Link href="/blog/ai-art-etsy-success-2025" className="text-primary hover:underline">AI art strategies</Link> and discover 
                <Link href="/blog/automate-digital-art-business-workflow" className="text-primary hover:underline">how to automate your digital art workflow</Link>.
              </p>
            </CardContent>
          </Card>

          {/* Our Story */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Our Story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">
                Digital Art Helper started as a small project to solve a common problem for digital artists: resizing and 
                preparing images for print. It has since grown into a powerful platform with <Link href="/blog/ai-image-upscaling-print-on-demand" className="text-primary hover:underline">AI-driven upscaling features</Link>, 
                <Link href="/template-mockups" className="text-primary hover:underline">professional mockup generation</Link>, and automated workflows, serving a 
                global community of creators. Check out our <Link href="/pricing" className="text-primary hover:underline">flexible pricing plans</Link> and explore our 
                <Link href="/blog" className="text-primary hover:underline">comprehensive guides and tutorials</Link>.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Get in Touch</CardTitle>
              <CardDescription>Ready to learn more about our services?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Business Address</h4>
                <p className="text-muted-foreground">
                  20 Boschendal Street, Cape Town, South Africa, 7530
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Email Address</h4>
                <p className="text-muted-foreground">
                  info@imageupscaler.app
                </p>
              </div>
              <div className="pt-4">
                <Link href="/contact">
                  <Button className="w-full">
                    Contact Us
                  </Button>
                </Link>
              </div>
              <div className="pt-2">
                <Link href="/auth">
                  <Button variant="outline" className="w-full">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Resources & Learning */}
          <Card>
            <CardHeader>
              <CardTitle>Learn More About Digital Art</CardTitle>
              <CardDescription>Explore our comprehensive guides and resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/blog/best-print-sizes-digital-art-etsy">
                  <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <h4 className="font-medium text-sm">Essential Print Sizes</h4>
                    <p className="text-xs text-muted-foreground">Learn about the best print sizes for Etsy</p>
                  </div>
                </Link>
                <Link href="/blog/room-mockup-templates-etsy-sales">
                  <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <h4 className="font-medium text-sm">Mockup Templates</h4>
                    <p className="text-xs text-muted-foreground">Templates that boost sales by 300%</p>
                  </div>
                </Link>
                <Link href="/blog/etsy-seo-ai-listing-optimization">
                  <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <h4 className="font-medium text-sm">Etsy SEO Guide</h4>
                    <p className="text-xs text-muted-foreground">AI-powered listing optimization</p>
                  </div>
                </Link>
                <Link href="/features">
                  <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <h4 className="font-medium text-sm">All Features</h4>
                    <p className="text-xs text-muted-foreground">Complete suite of AI tools</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}