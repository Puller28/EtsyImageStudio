// Reliable HTTP-based database access using Supabase REST API
// This bypasses connection timeout issues completely

const SUPABASE_URL = 'https://kkdzbtopouozsniuzghf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

interface SupabaseProject {
  id: string;
  user_id: string;
  title: string;
  original_image_url: string;
  upscaled_image_url: string | null;
  mockup_image_url: string | null;
  mockup_images: any;
  resized_images: any;
  etsy_listing: any;
  mockup_template: string | null;
  upscale_option: string;
  status: string;
  zip_url: string | null;
  thumbnail_url: string | null;
  ai_prompt: string | null;
  metadata: any;
  created_at: string;
}

export async function getProjectsByUserIdRest(userId: string): Promise<any[]> {
  try {
    console.log(`🌐 Using REST API to fetch projects for user ${userId}...`);
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${userId}&order=created_at.desc&limit=50`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Supabase REST API error ${response.status}: ${errorText}`);
      throw new Error(`Supabase REST API error: ${response.status} - ${errorText}`);
    }

    const projects: SupabaseProject[] = await response.json();
    console.log(`✅ REST API returned ${projects.length} projects`);

    // Convert to internal format
    return projects.map(project => ({
      id: project.id,
      userId: project.user_id,
      title: project.title,
      originalImageUrl: project.original_image_url,
      upscaledImageUrl: project.upscaled_image_url,
      mockupImageUrl: project.mockup_image_url,
      mockupImages: typeof project.mockup_images === 'string' ? JSON.parse(project.mockup_images) : (project.mockup_images || {}),
      resizedImages: typeof project.resized_images === 'string' ? JSON.parse(project.resized_images) : (project.resized_images || []),
      etsyListing: typeof project.etsy_listing === 'string' ? JSON.parse(project.etsy_listing) : project.etsy_listing,
      mockupTemplate: project.mockup_template,
      upscaleOption: project.upscale_option || '2x',
      status: project.status || 'uploading',
      zipUrl: project.zip_url,
      thumbnailUrl: project.thumbnail_url,
      aiPrompt: project.ai_prompt,
      metadata: typeof project.metadata === 'string' ? JSON.parse(project.metadata) : (project.metadata || {}),
      createdAt: new Date(project.created_at)
    }));

  } catch (error) {
    console.error(`❌ REST API failed for user ${userId}:`, error);
    return [];
  }
}

export async function getUserByIdRest(userId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) return null;

    const users = await response.json();
    if (users.length === 0) return null;

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      avatar: user.avatar,
      credits: user.credits || 0,
      subscriptionStatus: user.subscription_status || 'free',
      subscriptionPlan: user.subscription_plan,
      subscriptionId: user.subscription_id,
      subscriptionStartDate: user.subscription_start_date,
      subscriptionEndDate: user.subscription_end_date,
      createdAt: new Date(user.created_at)
    };

  } catch (error) {
    console.error(`❌ REST API failed to get user ${userId}:`, error);
    return null;
  }
}