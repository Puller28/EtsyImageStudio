import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight, Sparkles, Zap, Shield, Users, Star, CheckCircle, Upload, RotateCcw, Palette, Download } from "lucide-react";
import { Footer } from "@/components/footer";
import { PublicNavigation } from "@/components/navigation-public";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Digital Art Tools
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Transform Your Digital Art with{" "}
              <span className="text-primary">AI-Powered Processing</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional image upscaling, print-ready formats, stunning mockups, and automated Etsy listings. 
              Everything digital artists need to scale their business in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="px-8 py-6 text-lg" data-testid="button-get-started">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg" data-testid="button-learn-more">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Everything You Need for Digital Art Success
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI art generation to professional mockups, streamline your entire workflow with our comprehensive suite of tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* AI Art Generation */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">AI Art Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Create stunning digital artwork using Google's Imagen 3 AI model with custom prompts and styles.
                </p>
              </CardContent>
            </Card>

            {/* Image Upscaling */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">AI Image Upscaling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Enhance image quality up to 4x resolution using Real-ESRGAN AI models for crystal-clear prints.
                </p>
              </CardContent>
            </Card>

            {/* Template Mockups */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Template Mockups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Generate professional mockups in living rooms, bedrooms, galleries, and more with 5 room templates.
                </p>
              </CardContent>
            </Card>

            {/* Print Formats */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Print-Ready Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Automatically generate 5 standard print sizes optimized for Etsy and print-on-demand services.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Simple 4-Step Process
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From upload to marketplace-ready assets in minutes, not hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">1. Upload or Generate</h3>
              <p className="text-sm text-muted-foreground">
                Upload your artwork or create new AI art using Imagen 3 with custom prompts.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">2. AI Enhancement</h3>
              <p className="text-sm text-muted-foreground">
                Automatically upscale to 4K resolution and generate 5 print-ready format sizes.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">3. Create Mockups</h3>
              <p className="text-sm text-muted-foreground">
                Generate professional mockups in bedrooms, living rooms, galleries, and more.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">4. Download & Sell</h3>
              <p className="text-sm text-muted-foreground">
                Get your complete asset package with Etsy-optimized listings and start selling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  Why Digital Artists Choose Our Platform
                </h2>
                <p className="text-lg text-muted-foreground">
                  Save hours of manual work while producing higher quality results for your Etsy store.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Professional Quality Output</h3>
                    <p className="text-muted-foreground">AI-powered upscaling to 4K resolution ensures crisp, print-ready artwork every time.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Multiple Room Templates</h3>
                    <p className="text-muted-foreground">Choose from 5 professional room settings: living room, bedroom, study, gallery, and kitchen.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Complete Asset Packages</h3>
                    <p className="text-muted-foreground">Get upscaled images, 5 print formats, mockups, and Etsy listing content in one download.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Automated Workflow</h3>
                    <p className="text-muted-foreground">From upload to marketplace-ready assets in under 5 minutes with zero manual effort.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:pl-12">
              <Card className="border-2">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Perfect for Etsy Sellers</CardTitle>
                  <CardDescription>Everything you need to scale your digital art business</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AI Art Generation</span>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">4K Image Upscaling</span>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">5 Print Format Sizes</span>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Professional Mockups</span>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SEO Listing Content</span>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ZIP Package Download</span>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Transform Your Digital Art Business?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join hundreds of digital artists who have automated their workflow and scaled their Etsy stores with our AI-powered platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="px-8 py-6 text-lg" data-testid="button-start-free-trial">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg" data-testid="button-view-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}