import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Zap, Palette, RotateCcw, FileText, Package, Upload, Download, CheckCircle, Star } from "lucide-react";
import { Footer } from "@/components/footer";
import { PublicNavigation } from "@/components/navigation-public";
import { SEOHead } from "@/components/seo-head";

export default function FeaturesPage() {
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
              Complete Feature Set
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">AI-Powered Digital Art Tools</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional-grade image processing, mockup generation, and content creation tools designed specifically for digital artists and Etsy sellers.
              Learn more in our <Link href="/blog/ai-art-etsy-success-2025" className="text-primary hover:underline">AI art success guide</Link> and explore our 
              <Link href="/pricing" className="text-primary hover:underline">flexible pricing plans</Link>.
            </p>
          </div>
        </div>

        {/* Core Features Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* AI Art Generation */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">AI Art Generation</CardTitle>
                <CardDescription>Create stunning digital artwork with Google's Imagen 3</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Custom prompt-based generation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Multiple art styles and themes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    High-resolution 1024x1024 output
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Commercial usage rights
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Image Upscaling */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">AI Image Upscaling</CardTitle>
                <CardDescription>Enhance quality with Real-ESRGAN AI models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Up to 4x resolution enhancement
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Real-ESRGAN AI technology
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Preserves image quality and details
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Print-ready 4K output
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Template Mockups */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Palette className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Professional Mockups</CardTitle>
                <CardDescription>5 room templates for stunning presentations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Living room, bedroom, study settings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Gallery and kitchen templates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Multiple variations per template
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Professional lighting and staging
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Print Formats */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Print-Ready Formats</CardTitle>
                <CardDescription>5 standard sizes optimized for print-on-demand</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    8x10, 11x14, 16x20 inch formats
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    A4 and A3 international sizes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    300 DPI print resolution
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Etsy and POD service ready
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Content Generation */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">SEO Content Creation</CardTitle>
                <CardDescription>AI-powered Etsy listing optimization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    SEO-optimized titles and descriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Relevant keyword integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Etsy best practices compliance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Ready-to-copy listing content
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Asset Packaging */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Complete Asset Packages</CardTitle>
                <CardDescription>Everything bundled for immediate use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    ZIP file with all assets
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Organized folder structure
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Listing content in text format
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Ready for immediate upload
                  </li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </section>

        {/* Workflow Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Streamlined Workflow</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our automated process takes you from raw artwork to marketplace-ready assets in just 4 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Upload or Generate</h3>
              <p className="text-sm text-muted-foreground">
                Start with your existing artwork or create new AI art using our Imagen 3 integration.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI Enhancement</h3>
              <p className="text-sm text-muted-foreground">
                Automatically upscale to 4K resolution and generate 5 print-ready format sizes.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Palette className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Create Mockups</h3>
              <p className="text-sm text-muted-foreground">
                Generate professional mockups in 5 different room settings with multiple variations.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Download className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Download & Sell</h3>
              <p className="text-sm text-muted-foreground">
                Get your complete asset package with SEO-optimized Etsy listings and start selling.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Specifications */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Technical Specifications</CardTitle>
                <CardDescription>Industry-standard output for professional results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Image Formats</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>JPEG (high quality)</li>
                      <li>PNG (transparency)</li>
                      <li>300 DPI resolution</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Print Sizes</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>8x10 inches</li>
                      <li>11x14 inches</li>
                      <li>16x20 inches</li>
                      <li>A4 & A3 formats</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">AI Models</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>Google Imagen 3</li>
                      <li>Real-ESRGAN upscaling</li>
                      <li>GPT-4o content</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Room Templates</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>Living room</li>
                      <li>Bedroom</li>
                      <li>Study & Gallery</li>
                      <li>Kitchen</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Perfect for Digital Artists</CardTitle>
                <CardDescription>Everything you need to succeed on Etsy and beyond</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Etsy Optimization</h4>
                      <p className="text-sm text-muted-foreground">SEO-optimized listings that rank higher in search results</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Print-on-Demand Ready</h4>
                      <p className="text-sm text-muted-foreground">Compatible with all major POD services and platforms</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Commercial License</h4>
                      <p className="text-sm text-muted-foreground">Full commercial usage rights for all generated content</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold">Time Savings</h4>
                      <p className="text-sm text-muted-foreground">Complete workflow automation saves 3-4 hours per artwork</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-8">
          <h2 className="text-3xl font-bold">Ready to Transform Your Digital Art Business?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of digital artists who have automated their workflow and scaled their Etsy stores. 
            Read our <Link href="/blog/automate-digital-art-business-workflow" className="text-primary hover:underline">automation guide</Link> and 
            learn about <Link href="/blog/room-mockup-templates-etsy-sales" className="text-primary hover:underline">mockup templates that boost sales</Link>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="px-8 py-6 text-lg" data-testid="button-get-started">
                Get Started Free
                <Sparkles className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg" data-testid="button-view-pricing">
                View Pricing
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}