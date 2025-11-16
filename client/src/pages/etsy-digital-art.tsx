import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Shield, Sparkles, Star } from "lucide-react";

const socialProofBrands = ["Midnight Studio", "Luna Print Co.", "North & Pine", "Vivid Wall"];
const listingBenefits = [
  "Convert low-res designs into print-quality images",
  "Create lifestyle mockups in seconds",
  "Generate all Etsy ratios automatically",
  "Fix backgrounds & shadows",
  "Build full listing sets from a single upload",
];

const includedItems = [
  {
    title: "AI Upscaling & Enhancement",
    copy: "Turn blurry or small images into crisp, print-ready art.",
  },
  {
    title: "Automatic Etsy Ratios",
    copy: "2:3, 3:4, 4:5, 1:1, 11x14 plus A sizes delivered instantly.",
  },
  {
    title: "Lifestyle Mockups",
    copy: "Living rooms, bedrooms, minimalist walls, Scandinavian interiors and more.",
  },
  {
    title: "Background Removal",
    copy: "Clean product shots for framed art, posters, and printable packs.",
  },
  {
    title: "Listing Builder",
    copy: "Enter keywords once – get enhanced images, mockups, ratios, and copy in one workflow.",
  },
];

const testimonials = [
  {
    quote: "I used to spend hours creating mockups. Now I upload once and get everything I need for my listing.",
    author: "Sarah, Wall Art Seller",
  },
  {
    quote: "The ratios and mockups are exactly what Etsy needs. Huge time saver.",
    author: "Emily, Digital Prints",
  },
  {
    quote: "I redid all my listings in a weekend. My shop finally looks consistent.",
    author: "Jess, Printable Art Shop",
  },
];

type Plan = {
  name: string;
  price: string;
  subtitle: string;
  features: string[];
  accent: string;
  popular?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    subtitle: "10 images/month",
    features: ["Upscale", "Mockups", "Etsy ratios"],
    accent: "from-slate-800 via-slate-900 to-slate-950",
  },
  {
    name: "Pro",
    price: "$19.95",
    subtitle: "100 images/month",
    features: ["Everything in Free", "Listing bundles", "Advanced mockups", "Higher-resolution downloads"],
    accent: "from-indigo-500 via-indigo-600 to-indigo-700",
    popular: true,
  },
  {
    name: "Business",
    price: "$49.95",
    subtitle: "500 images/month",
    features: ["Team access", "Priority processing", "Unlimited mockup packs"],
    accent: "from-amber-500 via-amber-600 to-amber-700",
  },
];

const faqs = [
  {
    q: "Does this work for all types of digital art?",
    a: "Yes — wall art, printables, posters, photo-based art and more.",
  },
  {
    q: "Do I need design software?",
    a: "No. Everything runs in your browser — upload, generate, download.",
  },
  {
    q: "Can I use this for my entire Etsy shop?",
    a: "Absolutely. Many sellers batch-create dozens of listings each session with our workflow.",
  },
];

const workflowSteps = [
  {
    title: "Upload Your Artwork",
    body: "PNG or JPG — even low resolution. We enhance it automatically.",
  },
  {
    title: "Choose Your Listing Bundle",
    body: "Mockups, ratios (2:3, 3:4, 4:5, 1:1, 11x14, A sizes), close-ups, enhancements.",
  },
  {
    title: "Download & Publish to Etsy",
    body: "Your full image set is Etsy-ready — no Photoshop needed.",
  },
];

const heroMockups = [
  {
    title: "Modern Frame",
    caption: "Living room scene",
    image: "https://kkdzbtopouozsniuzghf.supabase.co/storage/v1/object/public/mockup-templates/previews/frame-05.jpg",
  },
  {
    title: "Gallery Wall",
    caption: "Minimal wall",
    image: "https://kkdzbtopouozsniuzghf.supabase.co/storage/v1/object/public/mockup-templates/previews/frame-06.jpg",
  },
  {
    title: "Bedroom Set",
    caption: "Cozy neutral",
    image: "https://kkdzbtopouozsniuzghf.supabase.co/storage/v1/object/public/mockup-templates/previews/frame-03.jpg",
  },
  {
    title: "Studio Desk",
    caption: "Artist workspace",
    image: "https://kkdzbtopouozsniuzghf.supabase.co/storage/v1/object/public/mockup-templates/previews/frame-04.jpg",
  },
];

const landingPricingPlans = [
  {
    name: "Free",
    price: "Free",
    subtitle: "100 credits included",
    badge: "",
    features: [
      "100 credits per month",
      "AI art generation",
      "Image upscaling (2x only)",
      "Print format resizing",
      "Basic Etsy listing generation",
      "Limited mockup generation (5 sets max)",
      "Basic AI tools",
    ],
    buttonText: "Get Started Free",
    buttonVariant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$19.95",
    subtitle: "300 credits included",
    badge: "Most Popular",
    features: [
      "300 credits per month",
      "All Free plan features",
      "Unlimited mockup generation",
      "Image upscaling (2x and 4x)",
      "Complete Etsy listing with tags",
    ],
    buttonText: "Go Pro",
  },
  {
    name: "Business",
    price: "$49",
    subtitle: "800 credits included",
    badge: "",
    features: [
      "800 credits per month",
      "All Pro plan features",
      "Unlimited mockup generation",
      "Commercial usage rights",
      "Bulk processing capabilities",
      "Best value per credit",
    ],
    buttonText: "Scale Business",
  },
];

export default function EtsyDigitalArtPage() {
  const handleStartFree = () => (window.location.href = "/register");
  const handleUpload = () => (window.location.href = "/auth");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      <main className="px-4 sm:px-6 lg:px-12 xl:px-20 py-12 lg:py-20 space-y-24">
        <HeroSection onStartFree={handleStartFree} onUpload={handleUpload} />
        <BuiltForEtsy />
        <HowItWorks onStartFree={handleStartFree} />
        <WhatsIncluded />
        <TestimonialsSection />
        <PricingSection onStartFree={handleStartFree} />
        <PrivacySection />
        <FAQSection />
        <FinalCTA onStartFree={handleStartFree} onUpload={handleUpload} />
      </main>
    </div>
  );
}

function HeroSection({ onStartFree, onUpload }: { onStartFree: () => void; onUpload: () => void }) {
  return (
    <section className="grid lg:grid-cols-2 gap-10 items-center">
      <div className="space-y-6">
        <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-400/30">New guided workflow</Badge>
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            ✨ Create Etsy Listing Images in Minutes — Not Hours ✨
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Upload your artwork once. Get a full set of listing-ready mockups, enhanced images and Etsy ratios instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button
            size="lg"
            className="bg-white text-slate-900 hover:bg-white/90 shadow-xl shadow-indigo-500/30"
            onClick={onStartFree}
          >
            👉 Start Free (No Card Required)
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/70 text-white hover:bg-white/10 bg-white/5"
            onClick={onUpload}
          >
            � Upload Your First Artwork
          </Button>
        </div>
        <div className="text-sm text-slate-400">
          <p className="font-medium text-slate-200">Trusted by Etsy wall-art and digital-download sellers.</p>
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
            {socialProofBrands.map((brand) => (
              <span key={brand}>{brand}</span>
            ))}
          </div>
        </div>
      </div>

      <MockupGrid />
    </section>
  );
}

function MockupGrid() {
  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 border border-white/5 shadow-2xl">
      <div className="grid grid-cols-2 gap-4">
        {heroMockups.map((mockup) => (
          <figure
            key={mockup.title}
            className="group aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
          >
            <img src={mockup.image} alt={mockup.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-xs text-white">
              <p className="text-sm font-semibold">{mockup.title}</p>
              <p className="text-[11px] text-white/80">{mockup.caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 rounded-2xl bg-white text-slate-900 shadow-xl px-4 py-3 w-44">
        <p className="text-xs font-medium text-slate-500">Before</p>
        <p className="text-sm font-semibold">Low-res upload</p>
      </div>
      <div className="absolute -right-6 bottom-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xl px-4 py-3 w-48">
        <p className="text-xs uppercase tracking-[0.2em] text-white/80">After</p>
        <p className="text-sm font-semibold">Upscaled + mockups + ratios</p>
      </div>
    </div>
  );
}

function BuiltForEtsy() {
  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-amber-300" />
        <p className="text-sm uppercase tracking-[0.3em] text-amber-200">Built for Etsy Digital Art Sellers</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold">Not a generic AI tool.</h2>
          <p className="text-slate-300">
            ImageUpscaler is built specifically for Etsy sellers who need fast, high-quality listing images that convert.
          </p>
          <p className="text-slate-400">You run your shop — we handle the busywork.</p>
        </div>
        <ul className="space-y-3 text-slate-200">
          {listingBenefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section className="space-y-6">
      <p className="text-sm uppercase tracking-[0.3em] text-indigo-200">⚡ How It Works</p>
      <div className="grid md:grid-cols-3 gap-6">
        {workflowSteps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-white/5 bg-slate-900/70 p-6 space-y-3">
            <Badge className="bg-white/10 text-white border border-white/30">{index + 1}</Badge>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-slate-300 text-sm">{step.body}</p>
          </div>
        ))}
      </div>
      <Button size="lg" className="bg-indigo-500 hover:bg-indigo-400" onClick={onStartFree}>
        Try it free
      </Button>
    </section>
  );
}

function WhatsIncluded() {
  return (
    <section className="space-y-8">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">🏆 What’s Included</p>
      <div className="grid lg:grid-cols-2 gap-6">
        {includedItems.map((item) => (
          <Card key={item.title} className="bg-slate-900/50 border border-white/5">
            <CardContent className="p-6 space-y-2">
              <p className="font-semibold text-lg">✔ {item.title}</p>
              <p className="text-slate-300 text-sm">{item.copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="space-y-6">
      <p className="text-sm uppercase tracking-[0.3em] text-pink-200">💬 What Etsy Sellers Are Saying</p>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((item) => (
          <div key={item.author} className="rounded-2xl border border-white/5 bg-slate-900/70 p-6 space-y-4">
            <p className="text-slate-100 text-sm">“{item.quote}”</p>
            <p className="text-xs text-slate-400 uppercase tracking-[0.2em]">{item.author}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section className="space-y-10">
      <div className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-200">💸 Choose Your Perfect Plan</p>
        <h2 className="text-3xl font-semibold">Scale your Etsy business with predictable pricing.</h2>
        <p className="text-slate-300">Start free, upgrade when you need more credits and automation.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {landingPricingPlans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl border bg-slate-900/60 p-6 space-y-4 relative ${
              plan.badge ? "border-indigo-400 shadow-lg shadow-indigo-500/30" : "border-white/5"
            }`}
          >
            {plan.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white">{plan.badge}</Badge>
            )}
            <div className="text-center space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">{plan.name}</p>
              <p className="text-4xl font-bold">{plan.price}</p>
              <p className="text-sm text-white/70">{plan.subtitle}</p>
            </div>
            <ul className="space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className={plan.buttonVariant === "outline" ? "bg-white text-slate-900 hover:bg-white/90" : "bg-indigo-500 hover:bg-indigo-400"}
              variant={plan.buttonVariant}
              onClick={onStartFree}
            >
              {plan.buttonText}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/70 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-emerald-300" />
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">🔒 Privacy & Security</p>
      </div>
      <ul className="space-y-2 text-slate-300 text-sm">
        <li>ISO 27001 hosting</li>
        <li>No data retained after session (unless you choose)</li>
        <li>Secure Azure-based architecture</li>
        <li>Your art remains yours — never used for training</li>
      </ul>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="space-y-6">
      <p className="text-sm uppercase tracking-[0.3em] text-sky-200">🧠 FAQ</p>
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.q} className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
            <p className="font-semibold">{faq.q}</p>
            <p className="text-sm text-slate-300 mt-2">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA({ onStartFree, onUpload }: { onStartFree: () => void; onUpload: () => void }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center space-y-6">
      <h2 className="text-3xl font-semibold text-white">Get Your First Etsy Listing Images in Minutes</h2>
      <p className="text-slate-200 text-lg max-w-2xl mx-auto">
        Upload your artwork, choose a listing bundle, and download every mockup, ratio, and enhanced file in a single click.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90" onClick={onStartFree}>
          👉 Start Free
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="border border-white/30 text-white hover:bg-white/10"
          onClick={onUpload}
        >
          👉 Upload Your First Artwork
        </Button>
      </div>
    </section>
  );
}
