import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Digital Art Helper</h3>
            <p className="text-sm text-muted-foreground">
              Empowering creativity through AI-powered image processing and generation tools.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-medium">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto">
                  Dashboard
                </Button>
              </Link>
              <Link href="/template-mockups">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto">
                  Template Mockups
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto">
                  Pricing
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto">
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="font-medium">Company</h4>
            <div className="space-y-2">
              <Link href="/about-us">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto" data-testid="footer-about-us">
                  About Us
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto" data-testid="footer-contact">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="font-medium">Legal</h4>
            <div className="space-y-2">
              <Link href="/terms-of-service">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto" data-testid="footer-terms">
                  Terms of Service
                </Button>
              </Link>
              <Link href="/privacy-policy">
                <Button variant="ghost" size="sm" className="justify-start p-0 h-auto" data-testid="footer-privacy">
                  Privacy Policy
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 Digital Art Helper. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <p>20 Boschendal Street, Cape Town, South Africa, 7530</p>
            <p>info@imageupscaler.app</p>
          </div>
        </div>
      </div>
    </footer>
  );
}