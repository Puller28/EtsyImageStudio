import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { PublicNavigation } from "@/components/navigation-public";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: June 26, 2024. Check our <Link href="/pricing" className="text-primary hover:underline">pricing plans</Link> and <Link href="/contact" className="text-primary hover:underline">contact us</Link> with questions.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms and Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section 1 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
              <p className="text-base leading-relaxed">
                Welcome to Digital Art Helper. These Terms of Service govern your use of our website and services. 
                By accessing or using our service, you agree to be bound by these terms.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">2. User Accounts</h3>
              <p className="text-base leading-relaxed">
                When you create an account with us, you must provide information that is accurate, complete, and current 
                at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination 
                of your account on our service.
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">3. Subscriptions</h3>
              <p className="text-base leading-relaxed">
                Some parts of the service are billed on a subscription basis. You will be billed in advance on a recurring 
                and periodic basis (such as monthly or annually), depending on the type of subscription plan you select when 
                purchasing the subscription.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">4. Content</h3>
              <p className="text-base leading-relaxed">
                Our service allows you to post, link, store, share and otherwise make available certain information, text, 
                graphics, videos, or other material. You are responsible for the content that you post on or through the 
                service, including its legality, reliability, and appropriateness.
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">5. Limitation of Liability</h3>
              <p className="text-base leading-relaxed">
                In no event shall Digital Art Helper, nor its directors, employees, partners, agents, suppliers, or affiliates, 
                be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, 
                loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or 
                inability to access or use the service.
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">6. Governing Law</h3>
              <p className="text-base leading-relaxed">
                These Terms shall be governed and construed in accordance with the laws of South Africa, without regard to 
                its conflict of law provisions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Related Links Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Related Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/privacy-policy">
                <Button variant="outline" className="w-full justify-start" data-testid="link-privacy-policy">
                  Privacy Policy
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full justify-start" data-testid="link-contact">
                  Contact Us
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="w-full justify-start" data-testid="link-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/auth">
                <Button className="w-full" data-testid="button-get-started">
                  Get Started with Etsy Art & Image Upscaler Pro
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