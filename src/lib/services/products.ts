import { supabase } from '@/lib/supabase';
import type { ProductWithCategory, ProductColor, ProductVariant } from '@/types';

// The full catalogue is re-read on every shop/category navigation, so keep a
// short-lived in-memory copy. Without it each category switch re-runs the
// whole fetch and the page sits on a spinner.
const CATALOGUE_TTL_MS = 5 * 60 * 1000;
let catalogueCache: { data: ProductWithCategory[]; at: number } | null = null;
let catalogueInFlight: Promise<ProductWithCategory[]> | null = null;

export function invalidateProductsCache(): void {
  catalogueCache = null;
  catalogueInFlight = null;
}

async function fetchProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const products = (data || []) as ProductWithCategory[];

  // Batch colors/variants for every variant product into two queries rather
  // than two sequential round-trips per product.
  const variantProductIds = products.filter((p) => p.has_variants).map((p) => p.id);
  if (variantProductIds.length > 0) {
    const [colorsRes, variantsRes] = await Promise.all([
      supabase
        .from('product_colors')
        .select('*')
        .in('product_id', variantProductIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('product_variants')
        .select('*, color:product_colors(*)')
        .in('product_id', variantProductIds)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
    ]);
    if (colorsRes.error) throw colorsRes.error;
    if (variantsRes.error) throw variantsRes.error;

    const colorsByProduct = new Map<string, ProductColor[]>();
    for (const c of (colorsRes.data || []) as ProductColor[]) {
      const list = colorsByProduct.get(c.product_id) || [];
      list.push(c);
      colorsByProduct.set(c.product_id, list);
    }
    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const v of (variantsRes.data || []) as ProductVariant[]) {
      const list = variantsByProduct.get(v.product_id) || [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }
    for (const product of products) {
      if (!product.has_variants) continue;
      product.colors = colorsByProduct.get(product.id) || [];
      product.variants = variantsByProduct.get(product.id) || [];
    }
  }
  return products;
}

export async function getProducts(): Promise<ProductWithCategory[]> {
  if (catalogueCache && Date.now() - catalogueCache.at < CATALOGUE_TTL_MS) {
    return catalogueCache.data;
  }
  // De-dupe concurrent callers onto one request
  if (!catalogueInFlight) {
    catalogueInFlight = fetchProducts()
      .then((data) => {
        catalogueCache = { data, at: Date.now() };
        return data;
      })
      .finally(() => { catalogueInFlight = null; });
  }
  return catalogueInFlight;
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  
  const product = data as ProductWithCategory;
  if (product.has_variants) {
    product.colors = await getProductColors(product.id);
    product.variants = await getProductVariants(product.id);
  }
  return product;
}

export async function getProductColors(productId: string): Promise<ProductColor[]> {
  const { data, error } = await supabase
    .from('product_colors')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ProductColor[];
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*, color:product_colors(*)')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ProductVariant[];
}

export async function getVariantById(variantId: string): Promise<ProductVariant | null> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*, color:product_colors(*)')
    .eq('id', variantId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as ProductVariant) || null;
}

export async function getFeaturedProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('is_featured', true)
    .eq('is_active', true)
    .limit(8);
  if (error) throw error;
  return (data || []) as ProductWithCategory[];
}

export async function getBestSellingProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('is_best_seller', true)
    .eq('is_active', true)
    .limit(8);
  if (error) throw error;
  return (data || []) as ProductWithCategory[];
}

async function sortByOrderThenViews(products: ProductWithCategory[]): Promise<ProductWithCategory[]> {
  if (products.length === 0) return products;
  const { data: views } = await supabase
    .from('product_views')
    .select('product_id')
    .in('product_id', products.map((p) => p.id));
  const counts: Record<string, number> = {};
  (views || []).forEach((v) => { counts[v.product_id] = (counts[v.product_id] || 0) + 1; });
  return [...products].sort((a, b) => {
    const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (counts[b.id] || 0) - (counts[a.id] || 0);
  });
}

export async function getProductsByCategory(categoryId: string): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('category_id', categoryId)
    .eq('is_active', true);
  if (error) throw error;
  const products = (data || []) as ProductWithCategory[];
  for (const product of products) {
    if (product.has_variants) {
      product.colors = await getProductColors(product.id);
      product.variants = await getProductVariants(product.id);
    }
  }
  return sortByOrderThenViews(products);
}

export async function getProductsByCategorySlug(slug: string): Promise<ProductWithCategory[]> {
  const normalized = decodeURIComponent(slug).trim().toLowerCase();
  let category: { id: string } | null = null;
  const { data: exact } = await supabase.from('categories').select('id').eq('slug', normalized).single();
  if (exact) {
    category = exact;
  } else {
    const { data: all } = await supabase.from('categories').select('id, slug');
    category = (all || []).find(c => c.slug.trim().toLowerCase() === normalized) || null;
  }
  if (!category) return [];
  return getProductsByCategory(category.id);
}

export async function getRelatedProducts(product: ProductWithCategory, limit = 4): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(limit);
  if (error) throw error;
  return (data || []) as ProductWithCategory[];
}

export async function recordProductView(productId: string): Promise<void> {
  let sessionId: string | null = null;
  try {
    sessionId = sessionStorage.getItem('kv_session');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('kv_session', sessionId);
    }
  } catch {
    // sessionStorage may not be available
  }
  await supabase.from('product_views').insert({
    product_id: productId,
    session_id: sessionId,
  });
}

// Create new product with optional colors and variants
export async function createProduct(
  product: Record<string, unknown>
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      slug: product.slug,
      description: product.description,
      long_description: product.long_description,
      price: product.price,
      compare_price: product.compare_price,
      category_id: product.category_id,
      material: product.material,
      image_url: product.image_url,
      images: product.images,
      is_featured: product.is_featured,
      is_best_seller: product.is_best_seller,
      is_active: product.is_active,
      has_variants: product.has_variants,
      stock_quantity: product.stock_quantity,
      in_stock: product.in_stock,
      care_instructions: product.care_instructions,
      colours: product.colours,
      sizes: product.sizes,
      display_order: product.display_order,
      weight: product.weight,
      length: product.length,
      breadth: product.breadth,
      height: product.height,
    })
    .select('id')
    .single();
  
  if (error) throw error;
  if (!data) throw new Error('Failed to create product');
  
  const productId = data.id;
  
  // Save colors and variants if has_variants is true
  if (product.has_variants && Array.isArray(product.colors)) {
    const colorMap = new Map<string, string>(); // maps index to actual color_id
    
    // First, create all colors
    for (let i = 0; i < product.colors.length; i++) {
      const color = product.colors[i] as Record<string, unknown>;
      const { data: colorData, error: colorError } = await supabase
        .from('product_colors')
        .insert({
          product_id: productId,
          name: color.name,
          hex_code: color.hex_code,
          images: color.images,
          sort_order: i,
        })
        .select('id')
        .single();
      
      if (colorError) throw colorError;
      colorMap.set(i.toString(), colorData!.id);
    }
    
    // Then, create all variants with the correct color_ids
    if (Array.isArray(product.variants)) {
      for (const variant of product.variants as Record<string, unknown>[]) {
        // Find the color index that matches this variant's color_id
        // For new products, color_id might be a temporary reference (index)
        // We need to look up the actual color_id from the map
        const colorIndex = (product.colors as Record<string, unknown>[]).findIndex(
          c => c.name === variant.color_name || c.id === variant.color_id
        );
        
        // Find by matching color to get actual ID
        const actualColorId = colorIndex >= 0 ? colorMap.get(colorIndex.toString()) : null;
        
        if (actualColorId) {
          const { error: variantError } = await supabase
            .from('product_variants')
            .insert({
              product_id: productId,
              color_id: actualColorId,
              size: variant.size,
              sku: variant.sku,
              stock_quantity: variant.stock_quantity,
              price_adjustment: variant.price_adjustment || 0,
              is_active: variant.is_active !== false,
            });
          
          if (variantError) throw variantError;
        }
      }
    }
  }
  
  return { id: productId };
}

// Update existing product with colors and variants
export async function updateProduct(
  id: string,
  product: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: product.name,
      slug: product.slug,
      description: product.description,
      long_description: product.long_description,
      price: product.price,
      compare_price: product.compare_price,
      category_id: product.category_id,
      material: product.material,
      image_url: product.image_url,
      images: product.images,
      is_featured: product.is_featured,
      is_best_seller: product.is_best_seller,
      is_active: product.is_active,
      has_variants: product.has_variants,
      stock_quantity: product.stock_quantity,
      in_stock: product.in_stock,
      care_instructions: product.care_instructions,
      colours: product.colours,
      sizes: product.sizes,
      display_order: product.display_order,
      weight: product.weight,
      length: product.length,
      breadth: product.breadth,
      height: product.height,
    })
    .eq('id', id);
  
  if (error) throw error;
  
  // Handle colors and variants
  if (product.has_variants) {
    // Get existing colors to determine what to delete
    const existingColors = await getProductColors(id);
    const existingColorIds = new Set(existingColors.map(c => c.id));
    const updatedColorIds = new Set<string>();
    const colorIdMap = new Map<string, string>(); // Maps color index/name to actual ID
    
    // Upsert colors
    if (Array.isArray(product.colors)) {
      for (let i = 0; i < product.colors.length; i++) {
        const color = product.colors[i] as Record<string, unknown>;
        
        if (color.id && existingColorIds.has(color.id as string)) {
          // Update existing color
          const { error: updateError } = await supabase
            .from('product_colors')
            .update({
              name: color.name,
              hex_code: color.hex_code,
              images: color.images,
              sort_order: i,
            })
            .eq('id', color.id);
          
          if (updateError) throw updateError;
          updatedColorIds.add(color.id as string);
          colorIdMap.set(color.name as string, color.id as string);
          colorIdMap.set(i.toString(), color.id as string);
        } else {
          // Create new color
          const { data: newColor, error: insertError } = await supabase
            .from('product_colors')
            .insert({
              product_id: id,
              name: color.name,
              hex_code: color.hex_code,
              images: color.images,
              sort_order: i,
            })
            .select('id')
            .single();
          
          if (insertError) throw insertError;
          updatedColorIds.add(newColor!.id);
          colorIdMap.set(color.name as string, newColor!.id);
          colorIdMap.set(i.toString(), newColor!.id);
        }
      }
      
      // Delete colors that are no longer present
      const colorsToDelete = Array.from(existingColorIds).filter(cid => !updatedColorIds.has(cid));
      if (colorsToDelete.length > 0) {
        await supabase.from('product_variants').delete().in('color_id', colorsToDelete);
        await supabase.from('product_colors').delete().in('id', colorsToDelete);
      }
    }
    
    // Get existing variants
    const existingVariants = await supabase
      .from('product_variants')
      .select('id, color_id, size')
      .eq('product_id', id)
      .then(r => r.data || []);
    
    const variantKeys = new Set(existingVariants.map((v: {id: string, color_id: string, size: string}) => 
      `${v.color_id}:${v.size}`));
    const updatedVariantKeys = new Set<string>();
    
    // Upsert variants
    if (Array.isArray(product.variants)) {
      for (const variant of product.variants as Record<string, unknown>[]) {
        // Find the color ID
        let colorId = variant.color_id as string;
        if (!colorId) {
          // Try to find by color name in the product colors
          const matchingColor = (product.colors as Record<string, unknown>[])
            ?.find(c => c.name === variant.color_name || c.name === (variant as Record<string, string>)['color']);
          if (matchingColor) {
            colorId = matchingColor.id as string || colorIdMap.get(matchingColor.name as string) || '';
          }
        } else if (!existingColorIds.has(colorId) && colorIdMap.has(colorId)) {
          // colorId might be a temporary index reference
          colorId = colorIdMap.get(colorId) || colorId;
        }
        
        if (!colorId) continue; // Skip if we can't find the color
        
        const variantKey = `${colorId}:${variant.size}`;
        updatedVariantKeys.add(variantKey);
        
        // Check if this variant exists
        const existingVariant = existingVariants.find((v: {color_id: string, size: string, id: string}) => 
          v.color_id === colorId && v.size === variant.size);
        
        if (existingVariant) {
          // Update existing variant
          const { error: updateError } = await supabase
            .from('product_variants')
            .update({
              sku: variant.sku,
              stock_quantity: variant.stock_quantity,
              price_adjustment: variant.price_adjustment || 0,
              is_active: variant.is_active !== false,
            })
            .eq('id', existingVariant.id);
          
          if (updateError) throw updateError;
        } else {
          // Create new variant
          const { error: insertError } = await supabase
            .from('product_variants')
            .insert({
              product_id: id,
              color_id: colorId,
              size: variant.size,
              sku: variant.sku,
              stock_quantity: variant.stock_quantity,
              price_adjustment: variant.price_adjustment || 0,
              is_active: variant.is_active !== false,
            });
          
          if (insertError) throw insertError;
        }
      }
    }
    
    // Delete variants that are no longer present
    const variantsToDelete = existingVariants.filter((v: {color_id: string, size: string, id: string}) => 
      !updatedVariantKeys.has(`${v.color_id}:${v.size}`));
    if (variantsToDelete.length > 0) {
      await supabase.from('product_variants').delete().in('id', variantsToDelete.map((v: {id: string}) => v.id));
    }
  } else {
    // No variants - clean up any existing colors and variants
    await supabase.from('product_variants').delete().eq('product_id', id);
    await supabase.from('product_colors').delete().eq('product_id', id);
  }
}
