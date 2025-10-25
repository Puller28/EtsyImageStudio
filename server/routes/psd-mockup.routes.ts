import { Router } from 'express';
import { psdMockupService } from '../services/psd-mockup-service';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/psd-templates
 * Get all active PSD templates
 */
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = supabase
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
    const { data, error } = await supabase
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
    const { data: template, error: templateError } = await supabase
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
    
    // 4. Generate mockup
    console.log('🎨 Generating mockup...');
    const mockupBuffer = await psdMockupService.generateMockup(
      psdBuffer,
      artworkBuffer,
      template.smart_object_layer
    );
    
    // 5. Upload result to Supabase Storage
    const timestamp = Date.now();
    const outputPath = `generated-mockups/${templateId}-${timestamp}.png`;
    
    console.log('📤 Uploading result...');
    const { error: uploadError } = await supabase.storage
      .from('mockup-templates')
      .upload(outputPath, mockupBuffer, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // 6. Get public URL
    const { data: urlData } = supabase.storage
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
