import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="bg-background border-t mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/">
              <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors cursor-pointer">
                Etsy Art Studio
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed pr-4">
              The ultimate AI-powered platform for digital artists and Etsy sellers. Professional image upscaling, mockups, and automated listings.
            </p>
            <div>
              <Link href="/">
                <Button variant="outline" size="sm" className="text-xs">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>

          {/* Features & Tools */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Features & Tools</h4>
            <div className="space-y-2">
              <div>
                <Link href="/features">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    All Features
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/template-mockups">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Template Mockups
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/pricing">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Pricing
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Blog & Guides
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Popular Articles */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Popular Articles</h4>
            <div className="space-y-2">
              <div>
                <Link href="/blog/best-print-sizes-digital-art-etsy">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Best Print Sizes for Digital Art
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/ai-image-upscaling-print-on-demand">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    AI Image Upscaling Guide
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/automate-digital-art-business-workflow">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Automate Your Digital Art Business
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/etsy-seo-ai-listing-optimization">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Etsy SEO Optimization
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/minimalist-digital-art-guide">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Minimalist Digital Art Guide
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/cottagecore-art-prints-guide">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Cottagecore Art Prints Guide
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/boho-digital-art-trends-2025">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Boho Digital Art Trends
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/printable-wall-art-sizes-guide">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Printable Wall Art Sizes
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/300-dpi-digital-downloads-guide">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    300 DPI Digital Downloads Guide
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/blog/ai-generated-art-vs-traditional">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    AI vs Traditional Art
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Company</h4>
            <div className="space-y-2">
              <div>
                <Link href="/about-us">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="footer-about-us">
                    About Us
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/contact">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="footer-contact">
                    Contact Us
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Legal</h4>
            <div className="space-y-2">
              <div>
                <Link href="/terms-of-service">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="footer-terms">
                    Terms of Service
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/privacy-policy">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="footer-privacy">
                    Privacy Policy
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Etsy Trademark Disclaimer - Required by Etsy API Terms */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm text-muted-foreground">
          <div>
            <p>© 2025 Digital Art Helper. All rights reserved.</p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <p>20 Boschendal Street, Cape Town, South Africa, 7530</p>
            <p>info@imageupscaler.app</p>
          </div>
        </div>
      </div>
    </footer>
  );
}