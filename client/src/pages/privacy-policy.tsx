import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { PublicNavigation } from "@/components/navigation-public";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: June 26, 2024</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 1 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Information We Collect</h3>
              <p className="text-base leading-relaxed">
                We collect information that you provide directly to us, such as when you create an account, subscribe to our 
                newsletter, or otherwise communicate with us. This may include your name, email address, and payment information.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">2. How We Use Your Information</h3>
              <p className="text-base leading-relaxed">
                We use the information we collect to provide, maintain, and improve our services, including to process 
                transactions, develop new features, and provide customer support.
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">3. How We Share Your Information</h3>
              <p className="text-base leading-relaxed">
                We do not share your personal information with third parties except as described in this Privacy Policy. 
                We may share information with vendors, consultants, and other service providers who need access to such 
                information to carry out work on our behalf.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">4. Data Security</h3>
              <p className="text-base leading-relaxed">
                We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized 
                access, disclosure, alteration, and destruction.
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">5. Your Choices</h3>
              <p className="text-base leading-relaxed">
                You may update, correct or delete information about you at any time by logging into your online account. 
                If you wish to delete your account, please email us at info@imageupscaler.app, but note that we may retain 
                certain information as required by law or for legitimate business purposes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Related Links */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Related Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/terms-of-service">
                <Button variant="outline" className="w-full justify-start" data-testid="link-terms">
                  Terms of Service
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full justify-start" data-testid="link-contact">
                  Contact Us
                </Button>
              </Link>
              <Link href="/about-us">
                <Button variant="outline" className="w-full justify-start" data-testid="link-about">
                  About Us
                </Button>
              </Link>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/auth">
                <Button className="w-full" data-testid="button-get-started">
                  Get Started with Image Upscaler Pro
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}