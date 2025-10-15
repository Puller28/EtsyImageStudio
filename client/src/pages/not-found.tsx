import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PublicNavigation } from "@/components/navigation-public";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (isAuthenticated) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-900/95 px-6 py-16 text-slate-100">
        <div className="max-w-lg text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/80">
            <AlertCircle className="h-8 w-8 text-indigo-300" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Page not found</h1>
            <p className="text-sm text-slate-400">
              We couldn&apos;t find that workspace page. It may have been moved or renamed.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              className="bg-indigo-500 hover:bg-indigo-600"
              onClick={() => navigate("/workspace")}
            >
              <Home className="mr-2 h-4 w-4" />
              Back to workspace
            </Button>
            <Button
              variant="secondary"
              className="bg-slate-800 text-slate-200 hover:bg-slate-700"
              onClick={() => navigate("/workspace/projects")}
            >
              View projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
