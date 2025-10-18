import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight, Sparkles, Zap, Shield, Users, Star, CheckCircle, Upload, RotateCcw, Palette, Download, HelpCircle, Scissors, Clock, DollarSign } from "lucide-react";
import { Footer } from "@/components/footer";
import { PublicNavigation } from "@/components/navigation-public";
import { SEOHead } from "@/components/seo-head";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead />
      <PublicNavigation />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Complete Digital Art Workflow Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              <span className="text-primary">Complete Digital Art Studio</span> for Etsy Sellers
              <span className="block text-3xl md:text-4xl mt-4 text-muted-foreground font-normal">
                From AI Art to Etsy Sale in Minutes - All-in-One Platform
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Stop juggling multiple tools. Create, upscale, remove backgrounds, generate mockups, and list your digital art - all in one place. 
              Professional AI-powered workflow automation for Etsy sellers and digital artists. Read our <Link href="/blog/best-print-sizes-digital-art-etsy"><span className="text-primary hover:underline">essential print sizes guide</span></Link> and learn about <Link href="/blog/mockup-generation-digital-art"><span className="text-primary hover:underline">mockup generation strategies</span></Link>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="px-8 py-6 text-lg bg-primary text-white hover:bg-primary/90" data-testid="button-get-started">
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
              8 Powerful Tools, One Complete Workflow
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Replace 5+ separate tools with our all-in-one platform. Save time, save money, and focus on what matters - creating and selling.
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
                  Create stunning digital artwork using Google's Imagen 3 AI model with custom prompts and styles. <Link href="/blog/ai-art-etsy-success-2025"><span className="text-primary hover:underline">Learn AI art strategies</span></Link>.
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
                  Enhance image quality up to 4x resolution using Real-ESRGAN AI models for crystal-clear prints. <Link href="/blog/ai-image-upscaling-print-on-demand"><span className="text-primary hover:underline">Read our upscaling guide</span></Link>.
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
                  Generate professional mockups in bedrooms, living rooms, galleries, studies, and kids' rooms. <Link href="/blog/room-mockup-templates-etsy-sales"><span className="text-primary hover:underline">See templates that boost sales</span></Link>.
                </p>
              </CardContent>
            </Card>

            {/* Background Removal */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Scissors className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Background Removal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  AI-powered background removal for product photos, portraits, and mockups. Get transparent PNGs in seconds.
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
                  Automatically generate 5 standard print sizes optimized for Etsy and print-on-demand services. <Link href="/blog/best-print-sizes-digital-art-etsy"><span className="text-primary hover:underline">Learn about essential print sizes</span></Link>.
                </p>
              </CardContent>
            </Card>

            {/* Etsy Optimization */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Etsy SEO & Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Automated listing creation with SEO-optimized titles, tags, and descriptions for maximum visibility.
                </p>
              </CardContent>
            </Card>

            {/* Workflow Automation */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">One-Click Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Automate your entire process from AI generation to final ZIP package with customizable workflows.
                </p>
              </CardContent>
            </Card>

            {/* ZIP Downloads */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">ZIP Package Export</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Download complete packages with all formats, mockups, and listings ready to upload to Etsy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Section - NEW */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Why Choose an All-in-One Platform?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop paying for multiple subscriptions. Save time and money with our complete solution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Traditional Approach */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl text-center">Traditional Approach</CardTitle>
                <CardDescription className="text-center">Using Multiple Tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">MidJourney - $10/month</p>
                      <p className="text-muted-foreground">AI art generation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Topaz Gigapixel - $99 one-time</p>
                      <p className="text-muted-foreground">Image upscaling</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">remove.bg - $9/month</p>
                      <p className="text-muted-foreground">Background removal</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Canva Pro - $13/month</p>
                      <p className="text-muted-foreground">Mockups and design</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Photoshop - $10/month</p>
                      <p className="text-muted-foreground">Resizing and formats</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">2-3 hours per listing</p>
                      <p className="text-muted-foreground">Manual work and switching tools</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-center font-bold text-lg text-red-600">
                    Total: $42/month + $99 + Hours of Work
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Our Platform */}
            <Card className="border-2 border-primary shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-center text-primary">Our Platform</CardTitle>
                <CardDescription className="text-center">All-in-One Solution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">AI Art Generation</p>
                      <p className="text-muted-foreground">Google Imagen 3 included</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">4x AI Upscaling</p>
                      <p className="text-muted-foreground">Real-ESRGAN included</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Background Removal</p>
                      <p className="text-muted-foreground">AI-powered included</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Mockup Generation</p>
                      <p className="text-muted-foreground">5 room templates included</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Print Formats & Listings</p>
                      <p className="text-muted-foreground">Automated included</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">5 minutes per listing</p>
                      <p className="text-muted-foreground">One-click workflow automation</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-center font-bold text-lg text-green-600">
                    Starting at $19/month
                  </p>
                  <p className="text-center text-sm text-muted-foreground mt-1">
                    Save $23/month + Hours of Time
                  </p>
                </div>
                <Link href="/auth">
                  <Button className="w-full" size="lg">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Blog Articles Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Learn from Expert Digital Art Guides
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover proven strategies, tips, and techniques from successful Etsy sellers and digital artists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Featured Article 1 */}
            <Card className="hover:shadow-lg transition-shadow group">
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-2">AI Art</Badge>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  <Link href="/blog/ai-art-etsy-success-2025">
                    How AI Art Generation is Revolutionizing Etsy Success
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Discover how digital artists are using AI tools like Imagen 3 to create profitable Etsy stores.
                </p>
                <Link href="/blog/ai-art-etsy-success-2025">
                  <Button variant="ghost" size="sm">
                    Read More
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Featured Article 2 */}
            <Card className="hover:shadow-lg transition-shadow group">
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-2">Print Business</Badge>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  <Link href="/blog/best-print-sizes-digital-art-etsy">
                    Essential Print Sizes for Digital Art: What Sells Best
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Comprehensive guide to the 5 most profitable print sizes for digital art on Etsy.
                </p>
                <Link href="/blog/best-print-sizes-digital-art-etsy">
                  <Button variant="ghost" size="sm">
                    Read More
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Featured Article 3 */}
            <Card className="hover:shadow-lg transition-shadow group">
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-2">Image Processing</Badge>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  <Link href="/blog/ai-image-upscaling-print-on-demand">
                    The Complete Guide to AI Image Upscaling
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn how Real-ESRGAN AI upscaling transforms low-resolution artwork into stunning prints.
                </p>
                <Link href="/blog/ai-image-upscaling-print-on-demand">
                  <Button variant="ghost" size="sm">
                    Read More
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Additional SEO Links - Prevents Orphan Pages */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-sm p-4 border rounded-lg">
              <Link href="/blog/minimalist-digital-art-guide" className="text-primary hover:underline font-medium">
                Minimalist Digital Art Guide
              </Link>
              <p className="text-muted-foreground mt-1">Clean, modern designs that sell consistently.</p>
            </div>
            <div className="text-sm p-4 border rounded-lg">
              <Link href="/blog/cottagecore-art-prints-guide" className="text-primary hover:underline font-medium">
                Cottagecore Art Prints Guide
              </Link>
              <p className="text-muted-foreground mt-1">Capture the $1.2B cottagecore market.</p>
            </div>
            <div className="text-sm p-4 border rounded-lg">
              <Link href="/blog/boho-digital-art-trends-2025" className="text-primary hover:underline font-medium">
                Boho Digital Art Trends 2025
              </Link>
              <p className="text-muted-foreground mt-1">$2M trend taking over Etsy.</p>
            </div>
            <div className="text-sm p-4 border rounded-lg">
              <Link href="/blog/printable-wall-art-sizes-guide" className="text-primary hover:underline font-medium">
                Printable Wall Art Sizes Guide
              </Link>
              <p className="text-muted-foreground mt-1">Essential 5 print sizes for maximum sales.</p>
            </div>
            <div className="text-sm p-4 border rounded-lg">
              <Link href="/blog/300-dpi-digital-downloads-guide" className="text-primary hover:underline font-medium">
                300 DPI Digital Downloads Guide
              </Link>
              <p className="text-muted-foreground mt-1">Make-or-break factor for digital art success.</p>
            </div>
            <div className="text-sm p-4 border rounded-lg">
              <Link href="/blog/ai-generated-art-vs-traditional" className="text-primary hover:underline font-medium">
                AI vs Traditional Digital Art
              </Link>
              <p className="text-muted-foreground mt-1">Quality analysis for commercial success.</p>
            </div>
          </div>

          {/* Simple SEO Links - Visible to Crawlers */}
          <div className="mt-8 text-center text-sm space-y-1">
            <p className="text-muted-foreground mb-3">More digital art guides:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/blog/christmas-digital-downloads-strategy" className="text-primary hover:underline">Christmas Downloads Strategy</Link>
              <Link href="/blog/instagram-digital-art-marketing" className="text-primary hover:underline">Instagram Marketing</Link>
              <Link href="/blog/etsy-shop-branding-design" className="text-primary hover:underline">Etsy Shop Branding</Link>
              <Link href="/blog/competitor-analysis-etsy-success" className="text-primary hover:underline">Competitor Analysis</Link>
              <Link href="/blog/digital-art-color-psychology" className="text-primary hover:underline">Color Psychology</Link>
              <Link href="/blog/typography-digital-art-trends" className="text-primary hover:underline">Typography Trends</Link>
            </div>
          </div>

          <div className="text-center mt-8 space-y-4">
            <Link href="/blog">
              <Button variant="outline" size="lg">
                View All Articles
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <div>
              <a href="/internal-links" className="text-sm text-muted-foreground hover:text-primary underline">
                Complete Guide Index
              </a>
            </div>
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
                Upload your artwork or <Link href="/generate" className="text-primary hover:underline">create new AI art</Link> using Imagen 3 with custom prompts.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">2. AI Enhancement</h3>
              <p className="text-sm text-muted-foreground">
                Automatically <Link href="/upscale" className="text-primary hover:underline">upscale images</Link> (2x for free, up to 4x for Pro+) and <Link href="/resize" className="text-primary hover:underline">generate print-ready format sizes</Link>.
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
                    <p className="text-muted-foreground">AI-powered <Link href="/upscale" className="text-primary hover:underline">upscaling</Link> (2x-4x depending on plan) and <Link href="/resize" className="text-primary hover:underline">format resizing</Link> ensures crisp, print-ready artwork every time.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Multiple Room Templates</h3>
                    <p className="text-muted-foreground">Choose from professional room settings: bedroom, living room, study, gallery, and kids' room.</p>
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
                    <span className="text-sm">AI Image Upscaling</span>
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

      {/* FAQ Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="secondary" className="px-4 py-2">
              <HelpCircle className="h-4 w-4 mr-2" />
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Common Questions About AI Image Upscaling
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about upscaling images for Etsy and print-on-demand
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How does AI image upscaling work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Our AI upscaler uses Real-ESRGAN technology to intelligently enhance image resolution up to 4x. 
                Unlike simple resizing that stretches pixels, AI upscaling analyzes patterns and adds realistic 
                detail to create crisp, print-ready images. Perfect for transforming low-resolution artwork into 
                high-quality Etsy listings and print-on-demand products.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                What file formats do you support?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We support all common image formats including JPG, JPEG, PNG, and WEBP. Your upscaled images are 
                exported as high-quality PNG files at 300 DPI, which is the industry standard for print. We also 
                automatically generate 5 standard print sizes (8x10", 11x14", 16x20", 18x24", 24x36") optimized 
                for Etsy digital downloads and print-on-demand services.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Can I use upscaled images commercially on Etsy?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! All images you upscale through our platform are yours to use commercially. Whether you're 
                selling digital downloads, print-on-demand products, or physical prints on Etsy, you retain full 
                commercial rights. For AI-generated art created with our tool, you also have full commercial usage 
                rights as specified in our terms of service.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                What's the difference between 2x and 4x upscaling?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                2x upscaling doubles your image dimensions (e.g., 500x500 becomes 1000x1000) and is included in 
                our free plan. 4x upscaling quadruples dimensions (500x500 becomes 2000x2000) and is available on 
                Pro and Pro+ plans. For Etsy listings, 2x is usually sufficient for digital downloads, while 4x 
                is recommended for large format prints (24x36" and above) or when you need maximum detail.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                How long does it take to upscale an image?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Most images are upscaled in 30-60 seconds depending on size and complexity. Our automated workflow 
                then generates mockups and print formats in an additional 2-3 minutes. The entire process from 
                upload to download-ready ZIP file typically takes under 5 minutes. You can process multiple images 
                simultaneously on Pro and Pro+ plans.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Do I need design experience to use this tool?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No design experience required! Our platform is built for Etsy sellers and digital artists of all 
                skill levels. Simply upload your artwork (or generate new art with AI), and our automated workflow 
                handles upscaling, mockup generation, print format creation, and even Etsy SEO optimization. 
                Everything is point-and-click simple with no technical knowledge needed.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                What makes your mockups better than free alternatives?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Our mockups are professionally designed with realistic lighting, shadows, and room settings 
                (bedroom, living room, gallery, study, kids' room). Unlike free mockup generators that often look 
                artificial, our templates use high-resolution photography and advanced perspective matching. Plus, 
                they're automatically generated as part of your workflow - no manual editing required. This saves 
                hours compared to creating mockups in Photoshop or Canva.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Can I cancel my subscription anytime?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes, you can cancel your subscription at any time with no penalties or fees. Your access continues 
                until the end of your current billing period. We also offer a free tier with 10 credits per month, 
                so you can always downgrade instead of canceling completely. No credit card required for the free plan.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* FAQ Schema Markup */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How does AI image upscaling work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our AI upscaler uses Real-ESRGAN technology to intelligently enhance image resolution up to 4x. Unlike simple resizing that stretches pixels, AI upscaling analyzes patterns and adds realistic detail to create crisp, print-ready images."
                }
              },
              {
                "@type": "Question",
                "name": "What file formats do you support?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We support all common image formats including JPG, JPEG, PNG, and WEBP. Your upscaled images are exported as high-quality PNG files at 300 DPI, which is the industry standard for print."
                }
              },
              {
                "@type": "Question",
                "name": "Can I use upscaled images commercially on Etsy?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! All images you upscale through our platform are yours to use commercially. Whether you're selling digital downloads, print-on-demand products, or physical prints on Etsy, you retain full commercial rights."
                }
              },
              {
                "@type": "Question",
                "name": "What's the difference between 2x and 4x upscaling?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "2x upscaling doubles your image dimensions and is included in our free plan. 4x upscaling quadruples dimensions and is available on Pro and Pro+ plans. For Etsy listings, 2x is usually sufficient for digital downloads, while 4x is recommended for large format prints."
                }
              },
              {
                "@type": "Question",
                "name": "How long does it take to upscale an image?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Most images are upscaled in 30-60 seconds depending on size and complexity. The entire process from upload to download-ready ZIP file typically takes under 5 minutes."
                }
              },
              {
                "@type": "Question",
                "name": "Do I need design experience to use this tool?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No design experience required! Our platform is built for Etsy sellers and digital artists of all skill levels. Simply upload your artwork and our automated workflow handles everything."
                }
              },
              {
                "@type": "Question",
                "name": "What makes your mockups better than free alternatives?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our mockups are professionally designed with realistic lighting, shadows, and room settings. They're automatically generated as part of your workflow - no manual editing required."
                }
              },
              {
                "@type": "Question",
                "name": "Can I cancel my subscription anytime?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, you can cancel your subscription at any time with no penalties or fees. Your access continues until the end of your current billing period."
                }
              }
            ]
          })}} />
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