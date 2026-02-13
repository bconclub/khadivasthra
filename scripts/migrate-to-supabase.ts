/**
 * Migration script: Seeds existing JSON data into Supabase tables.
 *
 * Prerequisites:
 *   1. Create Supabase project and run supabase/schema.sql in the SQL editor
 *   2. Fill in .env.local with your Supabase URL and service role key
 *
 * Run with:
 *   npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Environment variables should be loaded via:
//   npx tsx --env-file=.env.local scripts/migrate-to-supabase.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load JSON data
const productsPath = path.join(__dirname, '..', 'src', 'data', 'products.json');
const categoriesPath = path.join(__dirname, '..', 'public', 'data', 'categories.json');

const productsJson = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const categoriesJson = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));

async function migrate() {
  console.log('=== Khadi Vasthra: Migrating to Supabase ===\n');

  // 1. Insert categories
  console.log('--- Inserting categories ---');
  const categoryMap = new Map<string, string>(); // old category name -> new UUID
  const categories = categoriesJson.categories || categoriesJson;

  for (const cat of categories) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        image_url: cat.image || null,
        display_order: cat.displayOrder || 0,
        is_active: cat.isActive !== false,
      })
      .select('id, name')
      .single();

    if (error) {
      // If duplicate slug, try to fetch existing
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('categories')
          .select('id, name')
          .eq('slug', cat.slug)
          .single();
        if (existing) {
          categoryMap.set(cat.name, existing.id);
          console.log(`  [exists] ${cat.name} -> ${existing.id}`);
          continue;
        }
      }
      console.error(`  [error] Failed to insert category "${cat.name}":`, error.message);
      continue;
    }
    categoryMap.set(data.name, data.id);
    console.log(`  [ok] ${data.name} -> ${data.id}`);
  }

  console.log(`\nInserted ${categoryMap.size} categories.\n`);

  // 2. Insert products
  console.log('--- Inserting products ---');
  let insertedCount = 0;

  for (const prod of productsJson) {
    const categoryId = categoryMap.get(prod.category);
    if (!categoryId) {
      console.error(`  [skip] No category found for product "${prod.name}" (category: "${prod.category}")`);
      continue;
    }

    const careInstructions = Array.isArray(prod.careInstructions)
      ? prod.careInstructions
      : typeof prod.careInstructions === 'string' && prod.careInstructions
        ? [prod.careInstructions]
        : [];

    const { error } = await supabase.from('products').insert({
      name: prod.name,
      slug: prod.slug,
      category_id: categoryId,
      price: prod.price,
      compare_price: prod.comparePrice || null,
      description: prod.description || '',
      long_description: prod.longDescription || null,
      image_url: prod.image || null,
      images: prod.images || [],
      material: prod.material || prod.details?.material || null,
      care_instructions: careInstructions,
      details: prod.details || null,
      in_stock: prod.inStock !== false,
      is_featured: prod.isFeatured === true,
      is_new: prod.isNew === true,
      is_best_seller: prod.isBestSeller === true,
    });

    if (error) {
      if (error.code === '23505') {
        console.log(`  [exists] ${prod.name} (slug: ${prod.slug})`);
      } else {
        console.error(`  [error] Failed to insert product "${prod.name}":`, error.message);
      }
      continue;
    }
    insertedCount++;
    console.log(`  [ok] ${prod.name}`);
  }

  console.log(`\nInserted ${insertedCount} products.\n`);
  console.log('=== Migration complete! ===');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
