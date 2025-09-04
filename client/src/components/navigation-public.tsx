import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";

export function PublicNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="logo">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Etsy Art & Image Upscaler Pro</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Features
              </span>
            </Link>
            <Link href="/pricing">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Pricing
              </span>
            </Link>
            <Link href="/blog">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Blog
              </span>
            </Link>
            <Link href="/generate">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Generate
              </span>
            </Link>
            <Link href="/upscale">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Upscale
              </span>
            </Link>
            <Link href="/template-mockups">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Mockups
              </span>
            </Link>
            <Link href="/about-us">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                About
              </span>
            </Link>
            <Link href="/contact">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Contact
              </span>
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth">
              <Button variant="outline" data-testid="button-sign-in">
                Sign In
              </Button>
            </Link>
            <Link href="/auth">
              <Button data-testid="button-get-started">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t py-4">
            <div className="flex flex-col space-y-4">
              <Link href="/features">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer block py-2">
                  Features
                </span>
              </Link>
              <Link href="/pricing">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer block py-2">
                  Pricing
                </span>
              </Link>
              <Link href="/blog">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer block py-2">
                  Blog
                </span>
              </Link>
              <Link href="/template-mockups">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer block py-2">
                  Mockups
                </span>
              </Link>
              <Link href="/about-us">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer block py-2">
                  About
                </span>
              </Link>
              <Link href="/contact">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer block py-2">
                  Contact
                </span>
              </Link>
              <div className="pt-4 space-y-2">
                <Link href="/auth">
                  <Button variant="outline" className="w-full" data-testid="button-mobile-sign-in">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button className="w-full" data-testid="button-mobile-get-started">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}