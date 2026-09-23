/** Build Google Merchant Center XML and Meta Commerce Manager CSV from public catalog. */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildItems, googleXml, metaCsv, type FeedColor, type FeedProduct, type FeedVariant } from './catalog-feed';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing public Supabase URL or anon key');
const db = createClient(url, key);

async function allRows<T>(table: string, select: string, active = false): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = db.from(table).select(select).order('id').range(offset, offset + 499);
    if (active) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data as T[]));
    if (!data || data.length < 500) return rows;
  }
}

async function main() {
  const [products, colors, variants] = await Promise.all([
    allRows<FeedProduct>('products', 'id,name,slug,price,compare_price,description,image_url,images,material,colours,in_stock,stock_quantity,is_active,is_wholesale,has_variants,category:categories(name,is_active)', true),
    allRows<FeedColor>('product_colors', 'id,product_id,name,images'),
    allRows<FeedVariant>('product_variants', 'id,product_id,color_id,size,sku,stock_quantity,price_adjustment,is_active', true),
  ]);
  if (products.length === 0) throw new Error('Catalog query returned zero active products; refusing empty feed');
  const { items, skipped } = buildItems(products, colors, variants);
  if (items.length === 0) throw new Error('No valid retail items; refusing empty feed');
  const publicDir = join(__dirname, '..', 'public');
  writeFileSync(join(publicDir, 'feed.xml'), googleXml(items));
  writeFileSync(join(publicDir, 'meta-feed.csv'), metaCsv(items));
  console.log(`Marketplace feeds: ${items.length} items, ${skipped.length} skipped`);
  skipped.forEach(reason => console.warn(`  skipped ${reason}`));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
