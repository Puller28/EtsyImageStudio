import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PublicNavigation } from "@/components/navigation-public";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <AlertCircle className="h-24 w-24 text-primary" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">404</h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
              Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The page you're looking for doesn't exist. It might have been moved, deleted, 
              or you entered the wrong URL. Don't worry, let's get you back on track!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="px-8 py-6 text-lg" data-testid="button-home">
                <Home className="h-5 w-5 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link href="/features">
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg" data-testid="button-features">
                <Search className="h-5 w-5 mr-2" />
                Explore Features
              </Button>
            </Link>
          </div>
        </div>

        {/* Helpful Links Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="text-xl text-center">Popular Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/auth">
                <Button variant="outline" className="w-full justify-start" data-testid="link-get-started">
                  Get Started
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="w-full justify-start" data-testid="link-pricing">
                  View Pricing
                </Button>
              </Link>
              <Link href="/about-us">
                <Button variant="outline" className="w-full justify-start" data-testid="link-about">
                  About Us
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full justify-start" data-testid="link-contact">
                  Contact
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* SEO Content */}
        <div className="mt-12 text-center text-muted-foreground">
          <p className="text-sm">
            Looking for AI-powered image upscaling, mockup generation, or digital art tools? 
            Visit our <Link href="/features" className="text-primary hover:underline">features page</Link> to 
            discover how Etsy Art & Image Upscaler Pro can transform your creative workflow.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
