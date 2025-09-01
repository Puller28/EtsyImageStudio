import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { ArrowLeft, Calendar, Clock, CheckCircle, Sparkles, Star } from "lucide-react";
import { Footer } from "@/components/footer";
import { PublicNavigation } from "@/components/navigation-public";
import { SEOHead } from "@/components/seo-head";
import { useQuery } from "@tanstack/react-query";

// Blog post interface for TypeScript
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  status: string;
  featured: boolean;
  read_time: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug;

  // Fetch the specific blog post
  const { data: blogPost, isLoading, error } = useQuery({
    queryKey: ['/api/blog/posts', slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/${slug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blog post');
      }
      return response.json();
    },
    enabled: !!slug,
  });

  // Fetch related posts
  const { data: relatedData } = useQuery({
    queryKey: ['/api/blog/posts', 'related'],
    queryFn: async () => {
      const response = await fetch('/api/blog/posts?status=published&limit=3');
      if (!response.ok) {
        throw new Error('Failed to fetch related posts');
      }
      return response.json();
    },
  });

  const relatedPosts = relatedData?.posts?.filter((post: BlogPost) => post.slug !== slug)?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-muted rounded w-3/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-4/5"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !blogPost) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The blog post you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${blogPost.title} - Digital Art Blog | Image Upscaler Pro`}
        description={blogPost.excerpt}
        path={`/blog/${slug}`}
      />
      <PublicNavigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/blog">
            <Button variant="outline" size="sm" className="mb-6" data-testid="button-back-blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{blogPost.category}</Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(blogPost.published_at || blogPost.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {blogPost.read_time}
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {blogPost.title}
            </h1>
            
            <p className="text-muted-foreground">By {blogPost.author}</p>
          </div>
        </div>

        <article className="prose prose-lg max-w-none">
          <div className="whitespace-pre-line text-foreground leading-relaxed">
            {blogPost.content.split('\n').map((line: string, index: number) => {
              // Handle headers
              if (line.startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-bold mt-8 mb-4 text-foreground">{line.substring(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-semibold mt-6 mb-3 text-foreground">{line.substring(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-semibold mt-4 mb-2 text-foreground">{line.substring(4)}</h3>;
              }
              
              // Handle bullet points
              if (line.startsWith('- **') && line.includes(':**')) {
                const match = line.match(/- \*\*(.*?)\*\*:?\s*(.*)/);
                if (match) {
                  const [, boldText, rest] = match;
                  return (
                    <div key={index} className="flex items-start gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span><strong>{boldText}:</strong> {rest}</span>
                    </div>
                  );
                }
              }
              if (line.startsWith('- ')) {
                return (
                  <div key={index} className="flex items-start gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <span>{line.substring(2)}</span>
                  </div>
                );
              }
              
              // Handle bold text and italics
              if (line.includes('**') && line.trim()) {
                const parts = line.split('**');
                return (
                  <p key={index} className="mb-4 text-foreground">
                    {parts.map((part, i) => 
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )}
                  </p>
                );
              }
              
              // Handle regular paragraphs
              if (line.trim()) {
                return <p key={index} className="mb-4 text-foreground leading-relaxed">{line}</p>;
              }
              
              // Empty lines
              return <div key={index} className="mb-2"></div>;
            })}
          </div>
        </article>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-primary" />
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((article: BlogPost) => (
                <Card key={article.slug} className="hover:shadow-md transition-all duration-200 hover:border-primary/20 group">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-3">
                      <Link href={`/blog/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{article.category}</Badge>
                      <Link href={`/blog/${article.slug}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Read More
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="mt-16 pt-8 border-t bg-muted/20 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Ready to Transform Your Digital Art?</h2>
          </div>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Put these insights into action with our AI-powered upscaling and optimization tools. 
            Transform your artwork into professional-quality prints that sell.
          </p>
          <Link href="/">
            <Button size="lg" className="px-8">
              Try Our AI Tools
            </Button>
          </Link>
        </section>
      </div>

      <Footer />
    </div>
  );
}