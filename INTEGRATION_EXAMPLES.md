# Blog API Integration Examples

## Python Script for Automated Content Creation

```python
#!/usr/bin/env python3
"""
Automated blog content creation and publishing script
Perfect for AI-generated content workflows
"""

import requests
import json
from datetime import datetime
import time

class BlogManager:
    def __init__(self, base_url, jwt_token):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        }
    
    def create_post(self, post_data):
        """Create a new blog post"""
        response = requests.post(
            f'{self.base_url}/api/blog/posts',
            headers=self.headers,
            json=post_data
        )
        return response
    
    def publish_post(self, slug):
        """Publish a draft post"""
        response = requests.post(
            f'{self.base_url}/api/blog/posts/{slug}/publish',
            headers=self.headers
        )
        return response
    
    def get_posts(self, status=None):
        """Get all posts or filter by status"""
        url = f'{self.base_url}/api/blog/posts'
        if status:
            url += f'?status={status}'
        
        response = requests.get(url)
        return response
    
    def update_post(self, slug, updates):
        """Update an existing post"""
        response = requests.put(
            f'{self.base_url}/api/blog/posts/{slug}',
            headers=self.headers,
            json=updates
        )
        return response

# Example usage
def automated_content_workflow():
    """Example automated content creation workflow"""
    
    # Initialize blog manager
    blog = BlogManager('https://imageupscaler.app', 'YOUR_JWT_TOKEN')
    
    # AI-generated content example
    ai_generated_posts = [
        {
            "slug": "digital-art-color-theory-2025",
            "title": "Color Theory for Digital Artists: 2025 Guide",
            "excerpt": "Master color harmony and psychology to create more engaging digital artwork that resonates with your audience.",
            "content": """# Color Theory for Digital Artists: 2025 Guide

## Understanding Color Fundamentals

Color theory is the foundation of compelling visual art...

[Full AI-generated content here]
""",
            "category": "Tutorial",
            "tags": ["color-theory", "digital-art", "tutorial", "design"],
            "status": "draft",
            "readTime": "7 min read",
            "seoTitle": "Digital Art Color Theory Guide 2025 - Master Color Harmony",
            "seoDescription": "Complete color theory guide for digital artists. Learn color harmony, psychology, and advanced techniques for engaging artwork."
        }
    ]
    
    # Create and publish posts
    for post_data in ai_generated_posts:
        # Create draft
        create_response = blog.create_post(post_data)
        
        if create_response.status_code == 201:
            print(f"✅ Created: {post_data['slug']}")
            
            # Optional: Review process here
            # time.sleep(5)  # Simulate review time
            
            # Publish
            publish_response = blog.publish_post(post_data['slug'])
            if publish_response.status_code == 200:
                print(f"🚀 Published: {post_data['slug']}")
                print("📈 Automatically submitted to search engines")
            else:
                print(f"❌ Failed to publish: {publish_response.json()}")
        else:
            print(f"❌ Failed to create: {create_response.json()}")

if __name__ == "__main__":
    automated_content_workflow()
```

## Node.js/JavaScript Integration

```javascript
// blog-automation.js
const fetch = require('node-fetch'); // or use built-in fetch in Node 18+

class BlogAPI {
    constructor(baseURL, jwtToken) {
        this.baseURL = baseURL.replace(/\/$/, '');
        this.headers = {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        };
    }
    
    async createPost(postData) {
        const response = await fetch(`${this.baseURL}/api/blog/posts`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(postData)
        });
        return response.json();
    }
    
    async publishPost(slug) {
        const response = await fetch(`${this.baseURL}/api/blog/posts/${slug}/publish`, {
            method: 'POST',
            headers: this.headers
        });
        return response.json();
    }
    
    async getAllPosts(status = null) {
        const url = status 
            ? `${this.baseURL}/api/blog/posts?status=${status}`
            : `${this.baseURL}/api/blog/posts`;
            
        const response = await fetch(url);
        return response.json();
    }
    
    async updatePost(slug, updates) {
        const response = await fetch(`${this.baseURL}/api/blog/posts/${slug}`, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(updates)
        });
        return response.json();
    }
    
    async deletePost(slug) {
        const response = await fetch(`${this.baseURL}/api/blog/posts/${slug}`, {
            method: 'DELETE',
            headers: this.headers
        });
        return response.json();
    }
}

// Content generation pipeline
async function contentPipeline() {
    const blog = new BlogAPI('https://imageupscaler.app', process.env.JWT_TOKEN);
    
    // Generate content with AI (pseudo-code)
    const aiContent = await generateAIContent({
        topic: "Digital Art Trends 2025",
        style: "professional guide",
        length: "long-form"
    });
    
    // Create blog post
    const postData = {
        slug: aiContent.slug,
        title: aiContent.title,
        excerpt: aiContent.excerpt,
        content: aiContent.content,
        category: aiContent.category,
        tags: aiContent.tags,
        status: "draft"
    };
    
    try {
        const result = await blog.createPost(postData);
        console.log('Post created:', result.blogPost.slug);
        
        // Auto-publish if quality score is high
        if (aiContent.qualityScore > 0.8) {
            await blog.publishPost(result.blogPost.slug);
            console.log('Auto-published high-quality content');
        }
    } catch (error) {
        console.error('Content creation failed:', error);
    }
}

module.exports = { BlogAPI, contentPipeline };
```

## Zapier/Webhook Integration

```javascript
// webhook-handler.js
// For integrating with external content management systems

const express = require('express');
const app = express();

app.use(express.json());

// Webhook endpoint for external content systems
app.post('/webhook/content-created', async (req, res) => {
    const { title, content, category, tags, author } = req.body;
    
    // Transform external format to our blog format
    const blogPost = {
        slug: generateSlug(title),
        title: title,
        excerpt: extractExcerpt(content),
        content: content,
        category: category,
        tags: tags || [],
        author: author || 'Digital Art Team',
        status: 'draft',
        readTime: estimateReadTime(content)
    };
    
    // Create in our blog system
    try {
        const response = await fetch('https://imageupscaler.app/api/blog/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.JWT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(blogPost)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Webhook: Created post', result.blogPost.slug);
            res.json({ success: true, slug: result.blogPost.slug });
        } else {
            throw new Error('Failed to create post');
        }
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

function generateSlug(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function extractExcerpt(content, maxLength = 300) {
    const text = content.replace(/[#*`]/g, '').substring(0, maxLength);
    return text.substring(0, text.lastIndexOf(' ')) + '...';
}

function estimateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
}

app.listen(3001, () => {
    console.log('Webhook handler running on port 3001');
});
```

## Batch Content Management

```bash
#!/bin/bash
# batch-blog-operations.sh
# Bulk operations for blog management

BASE_URL="https://imageupscaler.app"
JWT_TOKEN="your-jwt-token-here"

# Function to create multiple posts from CSV
bulk_create_posts() {
    local csv_file=$1
    
    while IFS=',' read -r slug title excerpt category tags
    do
        # Skip header row
        [[ "$slug" == "slug" ]] && continue
        
        # Create JSON payload
        json_payload=$(cat <<EOF
{
    "slug": "$slug",
    "title": "$title",
    "excerpt": "$excerpt",
    "content": "# $title\n\nContent for $title...",
    "category": "$category",
    "tags": [$(echo "$tags" | sed 's/;/","/g' | sed 's/^/"/' | sed 's/$/"/')],
    "status": "draft"
}
EOF
        )
        
        # Create post
        curl -X POST "$BASE_URL/api/blog/posts" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$json_payload"
        
        echo "Created: $slug"
        sleep 1  # Rate limiting
    done < "$csv_file"
}

# Function to publish all drafts
publish_all_drafts() {
    # Get all draft posts
    drafts=$(curl -s "$BASE_URL/api/blog/posts?status=draft" | jq -r '.posts[].slug')
    
    for slug in $drafts; do
        curl -X POST "$BASE_URL/api/blog/posts/$slug/publish" \
            -H "Authorization: Bearer $JWT_TOKEN"
        echo "Published: $slug"
        sleep 2  # Rate limiting for SEO submissions
    done
}

# Function to backup all posts
backup_posts() {
    local backup_file="blog-backup-$(date +%Y%m%d).json"
    curl -s "$BASE_URL/api/blog/posts" > "$backup_file"
    echo "Backup saved to: $backup_file"
}

# Usage examples:
# ./batch-blog-operations.sh create posts.csv
# ./batch-blog-operations.sh publish-drafts
# ./batch-blog-operations.sh backup

case "$1" in
    "create")
        bulk_create_posts "$2"
        ;;
    "publish-drafts")
        publish_all_drafts
        ;;
    "backup")
        backup_posts
        ;;
    *)
        echo "Usage: $0 {create|publish-drafts|backup} [csv-file]"
        exit 1
        ;;
esac
```

## Content Quality Assurance

```python
# content-qa.py
# Quality assurance checks before publishing

import requests
import re
from textstat import flesch_reading_ease
import spellchecker

class ContentQA:
    def __init__(self, api_base_url, jwt_token):
        self.api_base_url = api_base_url
        self.headers = {'Authorization': f'Bearer {jwt_token}'}
        self.spell = spellchecker.SpellChecker()
    
    def analyze_content(self, content):
        """Analyze content quality"""
        results = {
            'word_count': len(content.split()),
            'reading_ease': flesch_reading_ease(content),
            'has_headings': bool(re.search(r'^#+\s', content, re.MULTILINE)),
            'has_links': bool(re.search(r'\[.*?\]\(.*?\)', content)),
            'spelling_errors': self.check_spelling(content),
            'seo_score': self.calculate_seo_score(content)
        }
        return results
    
    def check_spelling(self, content):
        """Check for spelling errors"""
        words = re.findall(r'\b[a-zA-Z]+\b', content.lower())
        misspelled = self.spell.unknown(words)
        return list(misspelled)[:10]  # Limit to first 10
    
    def calculate_seo_score(self, content):
        """Calculate basic SEO score"""
        score = 0
        
        # Check for headings structure
        if re.search(r'^#+\s', content, re.MULTILINE):
            score += 20
        
        # Check for internal links
        if re.search(r'\[.*?\]\(/.*?\)', content):
            score += 15
        
        # Check for lists
        if re.search(r'^\s*[-*+]\s', content, re.MULTILINE):
            score += 10
        
        # Check length
        word_count = len(content.split())
        if 1000 <= word_count <= 3000:
            score += 25
        elif word_count > 500:
            score += 15
        
        # Check readability
        ease = flesch_reading_ease(content)
        if 60 <= ease <= 80:
            score += 30
        elif 40 <= ease <= 90:
            score += 20
        
        return min(score, 100)
    
    def review_draft(self, slug):
        """Review a draft post and provide recommendations"""
        response = requests.get(
            f'{self.api_base_url}/api/blog/posts/{slug}'
        )
        
        if response.status_code != 200:
            return {'error': 'Post not found'}
        
        post = response.json()
        analysis = self.analyze_content(post['content'])
        
        recommendations = []
        
        if analysis['word_count'] < 500:
            recommendations.append("Content is too short - aim for 500+ words")
        
        if analysis['reading_ease'] < 40:
            recommendations.append("Content is difficult to read - simplify language")
        
        if not analysis['has_headings']:
            recommendations.append("Add headings to improve structure")
        
        if not analysis['has_links']:
            recommendations.append("Add internal links to improve SEO")
        
        if analysis['spelling_errors']:
            recommendations.append(f"Fix spelling errors: {', '.join(analysis['spelling_errors'][:3])}")
        
        return {
            'analysis': analysis,
            'recommendations': recommendations,
            'ready_to_publish': len(recommendations) == 0 and analysis['seo_score'] > 70
        }

# Usage example
qa = ContentQA('https://imageupscaler.app', 'your-jwt-token')
review = qa.review_draft('my-draft-post')

if review['ready_to_publish']:
    print("✅ Post is ready to publish!")
else:
    print("📝 Recommendations:")
    for rec in review['recommendations']:
        print(f"  - {rec}")
```

## Monitoring and Analytics

```python
# blog-analytics.py
# Monitor blog performance and API usage

import requests
from datetime import datetime, timedelta
import json

class BlogAnalytics:
    def __init__(self, api_base_url):
        self.api_base_url = api_base_url
    
    def get_content_stats(self):
        """Get content statistics"""
        response = requests.get(f'{self.api_base_url}/api/blog/posts')
        posts = response.json()['posts']
        
        stats = {
            'total_posts': len(posts),
            'published': len([p for p in posts if p['status'] == 'published']),
            'drafts': len([p for p in posts if p['status'] == 'draft']),
            'featured': len([p for p in posts if p.get('featured', False)]),
            'categories': {},
            'tags': {},
            'recent_activity': []
        }
        
        for post in posts:
            # Category distribution
            category = post['category']
            stats['categories'][category] = stats['categories'].get(category, 0) + 1
            
            # Tag frequency
            for tag in post.get('tags', []):
                stats['tags'][tag] = stats['tags'].get(tag, 0) + 1
            
            # Recent activity (last 7 days)
            created_date = datetime.fromisoformat(post['created_at'].replace('Z', '+00:00'))
            if created_date > datetime.now().astimezone() - timedelta(days=7):
                stats['recent_activity'].append({
                    'slug': post['slug'],
                    'title': post['title'],
                    'created': post['created_at'],
                    'status': post['status']
                })
        
        return stats
    
    def generate_report(self):
        """Generate analytics report"""
        stats = self.get_content_stats()
        
        report = f"""
# Blog Analytics Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Content Overview
- Total Posts: {stats['total_posts']}
- Published: {stats['published']}
- Drafts: {stats['drafts']}
- Featured Posts: {stats['featured']}

## Top Categories
"""
        
        # Sort categories by count
        top_categories = sorted(stats['categories'].items(), key=lambda x: x[1], reverse=True)[:5]
        for category, count in top_categories:
            report += f"- {category}: {count} posts\n"
        
        report += "\n## Popular Tags\n"
        
        # Sort tags by frequency
        top_tags = sorted(stats['tags'].items(), key=lambda x: x[1], reverse=True)[:10]
        for tag, count in top_tags:
            report += f"- {tag}: {count} uses\n"
        
        report += f"\n## Recent Activity (Last 7 Days)\n"
        for activity in stats['recent_activity'][:10]:
            report += f"- {activity['title']} ({activity['status']}) - {activity['created'][:10]}\n"
        
        return report

# Usage
analytics = BlogAnalytics('https://imageupscaler.app')
report = analytics.generate_report()
print(report)

# Save report
with open(f"blog-report-{datetime.now().strftime('%Y%m%d')}.md", 'w') as f:
    f.write(report)
```

These integration examples show how to:

1. **Automate content creation** with AI-generated posts
2. **Integrate with external systems** via webhooks
3. **Perform bulk operations** for efficiency
4. **Ensure content quality** before publishing
5. **Monitor performance** and generate reports

The blog API is designed to be flexible and powerful enough to support any content workflow you need!