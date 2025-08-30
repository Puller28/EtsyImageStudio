import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Users, Target } from "lucide-react";
import { PublicNavigation } from "@/components/navigation-public";
import { Footer } from "@/components/footer";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
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
                We believe in empowering creativity through technology, making high-quality image processing and generation 
                accessible to everyone.
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
                preparing images for print. It has since grown into a powerful platform with AI-driven features, serving a 
                global community of creators.
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
                  <Button data-testid="button-contact-us">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Related Links */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Explore More</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/features">
                  <Button variant="outline" className="w-full justify-start" data-testid="link-features">
                    Our Features
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full justify-start" data-testid="link-pricing">
                    View Pricing
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button variant="outline" className="w-full justify-start" data-testid="link-blog">
                    Read Our Blog
                  </Button>
                </Link>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Link href="/auth">
                  <Button className="w-full" data-testid="button-get-started">
                    Start Creating Today
                  </Button>
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