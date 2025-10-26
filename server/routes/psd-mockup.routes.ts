import { Router } from 'express';
import { psdMockupService } from '../services/psd-mockup-service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const router = Router();

// Lazy initialization
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  
  // Try multiple sources for URL
  let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  // If no URL but we have SUPABASE_PROJECT_ASSETS_URL, derive it
  if (!supabaseUrl && process.env.SUPABASE_PROJECT_ASSETS_URL) {
    supabaseUrl = process.env.SUPABASE_PROJECT_ASSETS_URL.replace(/\/storage\/v1$/, '');
  }
  
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  _supabase = createClient(supabaseUrl, supabaseServiceKey);
  return _supabase;
}

/**
 * GET /api/psd-templates
 * Get all active PSD templates
 */
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = getSupabase()
      .from('psd_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({ templates: data });
    
  } catch (error) {
    console.error('Error fetching PSD templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/psd-templates/categories
 * Get all template categories
 */
router.get('/templates/categories', async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('psd_templates')
      .select('category')
      .eq('is_active', true);
    
    if (error) {
      throw error;
    }
    
    // Get unique categories
    const categorySet = new Set(data.map((t: any) => t.category));
    const categories = Array.from(categorySet);
    
    res.json({ categories });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/psd-mockup/generate
 * Generate a mockup from a PSD template
 */
router.post('/generate', async (req, res) => {
  try {
    const { templateId, artworkUrl } = req.body;
    
    if (!templateId || !artworkUrl) {
      return res.status(400).json({ error: 'Missing templateId or artworkUrl' });
    }
    
    // 1. Get template from database
    const { data: template, error: templateError } = await getSupabase()
      .from('psd_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // 2. Download PSD file
    console.log('📥 Downloading PSD:', template.psd_url);
    const psdResponse = await fetch(template.psd_url);
    if (!psdResponse.ok) {
      throw new Error('Failed to download PSD');
    }
    const psdBuffer = Buffer.from(await psdResponse.arrayBuffer());
    
    // 3. Download artwork
    console.log('📥 Downloading artwork:', artworkUrl);
    const artworkResponse = await fetch(artworkUrl);
    if (!artworkResponse.ok) {
      throw new Error('Failed to download artwork');
    }
    const artworkBuffer = Buffer.from(await artworkResponse.arrayBuffer());
    
    // 4. Generate mockup - use ag-psd for "Change Poster" templates
    console.log('🎨 Generating mockup...');
    const useAgPsd = template.smart_object_layer === 'Change Poster';
    
    let mockupBuffer;
    if (useAgPsd) {
      const { agPsdMockupService } = await import('../services/agpsd-mockup-service.js');
      mockupBuffer = await agPsdMockupService.generateMockup(
        psdBuffer,
        artworkBuffer,
        template.smart_object_layer
      );
    } else {
      mockupBuffer = await psdMockupService.generateMockup(
        psdBuffer,
        artworkBuffer,
        template.smart_object_layer
      );
    }
    
    // 5. Upload result to Supabase Storage
    const timestamp = Date.now();
    const outputPath = `generated-mockups/${templateId}-${timestamp}.png`;
    
    console.log('📤 Uploading result...');
    const { error: uploadError } = await getSupabase().storage
      .from('mockup-templates')
      .upload(outputPath, mockupBuffer, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // 6. Get public URL
    const { data: urlData } = getSupabase().storage
      .from('mockup-templates')
      .getPublicUrl(outputPath);
    
    console.log('✅ Mockup generated successfully');
    
    res.json({
      success: true,
      mockupUrl: urlData.publicUrl,
      template: {
        id: template.id,
        name: template.name,
        category: template.category
      }
    });
    
  } catch (error) {
    console.error('Error generating mockup:', error);
    res.status(500).json({ 
      error: 'Failed to generate mockup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/psd-mockup/generate-from-file
 * Generate mockup from uploaded PSD file (for testing)
 */
router.post('/generate-from-file', async (req, res) => {
  try {
    // This would handle file uploads via multipart/form-data
    // For now, just a placeholder
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate mockup' });
  }
});

export default router;
