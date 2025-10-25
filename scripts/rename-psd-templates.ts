import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Rename PSD templates with clean, consistent naming
 */
async function renamePSDTemplates() {
  console.log('🏷️  Renaming PSD Templates\n');
  console.log('='.repeat(80));
  
  try {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Connected to Supabase\n');
    
    // Fetch all PSD templates
    const { data: templates, error } = await supabase
      .from('psd_templates')
      .select('*')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    if (!templates || templates.length === 0) {
      console.log('❌ No templates found');
      return;
    }
    
    console.log(`📦 Found ${templates.length} PSD templates\n`);
    
    // Group by category for better naming
    const categoryCounts: Record<string, number> = {};
    
    for (const template of templates) {
      const category = template.category || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      // Generate clean name based on category
      const categoryLabel = category === 'living-room' ? 'Living Room' : 
                           category === 'other' ? 'Frame' : 
                           category.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      const number = categoryCounts[category];
      const newName = `${categoryLabel} Mockup ${number}`;
      
      // Update template name
      const { error: updateError } = await supabase
        .from('psd_templates')
        .update({ name: newName })
        .eq('id', template.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${template.filename}:`, updateError);
      } else {
        console.log(`✅ ${template.filename.padEnd(30)} → ${newName}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Renaming complete!');
    console.log(`\n📊 Templates by category:`);
    for (const [category, count] of Object.entries(categoryCounts)) {
      console.log(`   ${category}: ${count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

renamePSDTemplates();
