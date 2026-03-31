import { supabase } from '@/lib/supabase';
import type { Product, Category, Banner, ProductFormData, CategoryFormData, BannerFormData, ProductWithCategory, ProductColor, ProductVariant } from '@/types';

// Admin: get ALL products (including hidden) with category data
export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  
  const products = (data || []) as ProductWithCategory[];
  // Fetch colors and variants for each product
  for (const product of products) {
    if (product.has_variants) {
      product.colors = await getAdminProductColors(product.id);
      product.variants = await getAdminProductVariants(product.id);
    }
  }
  return products;
}

async function getAdminProductColors(productId: string): Promise<ProductColor[]> {
  const { data, error } = await supabase
    .from('product_colors')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as ProductColor[];
}

async function getAdminProductVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*, color:product_colors(*)')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ProductVariant[];
}

// Products CRUD
export async function createProduct(
  data: ProductFormData & { colors?: (Omit<ProductColor, 'id' | 'created_at' | 'updated_at'> & { id?: string })[]; variants?: (Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'> & { id?: string })[] }
): Promise<Product> {
  const { colors, variants, ...productData } = data;
  
  // Check if slug already exists; if so, append a number to make it unique
  let slug = productData.slug;
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug);
  if (count && count > 0) {
    let suffix = 2;
    while (true) {
      const candidate = `${slug}-${suffix}`;
      const { count: c } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('slug', candidate);
      if (!c || c === 0) { slug = candidate; break; }
      suffix++;
    }
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({ ...productData, slug })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(`A product with this slug already exists. Please use a different name.`);
    throw new Error(error.message || error.details || JSON.stringify(error));
  }

  // Create colors first, then variants
  if (colors && colors.length > 0 && product) {
    const colorMap = new Map<string, string>(); // Maps color index/name -> real id
    
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const { data: colorData, error: colorError } = await supabase
        .from('product_colors')
        .insert({ ...color, product_id: product.id })
        .select()
        .single();
      if (colorError) throw new Error(colorError.message);
      // Store mapping by name and by index
      colorMap.set(color.name, colorData.id);
      colorMap.set(i.toString(), colorData.id);
    }

    // Create variants with correct color_ids
    if (variants && variants.length > 0) {
      const variantsWithIds = variants.map((v, index) => {
        // Resolve color_id - it might be a name or index
        let colorId = v.color_id;
        if (!colorId || !colorId.includes('-')) {
          // color_id is likely a temp reference - try to resolve it
          colorId = colorMap.get(colorId || '') || colorMap.get(index.toString()) || '';
        }
        // Also try matching by color name if available
        const vWithName = v as { color_name?: string };
        if (!colorId && vWithName.color_name) {
          colorId = colorMap.get(vWithName.color_name) || '';
        }
        
        const { id, color, ...variantWithoutId } = v as Record<string, unknown>;
        return {
          ...variantWithoutId,
          product_id: product.id,
          color_id: colorId,
        };
      }).filter(v => v.color_id); // Only include variants with valid color_ids
      
      if (variantsWithIds.length > 0) {
        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantsWithIds);
        if (variantError) throw new Error(variantError.message);
      }
    }
  }

  return product;
}

export async function updateProduct(
  id: string,
  data: Partial<ProductFormData> & { colors?: ProductColor[]; variants?: ProductVariant[] }
): Promise<Product> {
  const { colors, variants, ...productData } = data;

  const { data: product, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));

  // Handle colors if provided
  if (colors !== undefined) {
    // Get existing colors
    const { data: existingColors } = await supabase
      .from('product_colors')
      .select('id')
      .eq('product_id', id);
    const existingColorIds = new Set((existingColors || []).map((c) => c.id));
    const colorIdMap = new Map<string, string>(); // Maps temp references to real ids
    
    // Delete removed colors (cascades to variants)
    const incomingColorIds = new Set(colors.filter((c) => c.id).map((c) => c.id));
    const toDelete = Array.from(existingColorIds).filter((eid) => !incomingColorIds.has(eid));
    if (toDelete.length > 0) {
      await supabase.from('product_colors').delete().in('id', toDelete);
    }

    // Upsert colors and build mapping
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      if (color.id && existingColorIds.has(color.id)) {
        // Update existing color
        await supabase.from('product_colors').update({
          name: color.name,
          hex_code: color.hex_code,
          images: color.images,
          sort_order: i,
        }).eq('id', color.id);
        colorIdMap.set(color.name, color.id);
        colorIdMap.set(i.toString(), color.id);
      } else {
        // Create new color
        const { data: newColor } = await supabase
          .from('product_colors')
          .insert({ 
            product_id: id,
            name: color.name,
            hex_code: color.hex_code,
            images: color.images,
            sort_order: i,
          })
          .select()
          .single();
        if (newColor) {
          colorIdMap.set(color.name, newColor.id);
          colorIdMap.set(i.toString(), newColor.id);
        }
      }
    }
    
    // Handle variants if provided
    if (variants !== undefined) {
      const { data: existingVariants } = await supabase
        .from('product_variants')
        .select('id, color_id, size')
        .eq('product_id', id);
      const existingVariantKeys = new Set((existingVariants || []).map((v) => `${v.color_id}:${v.size}`));
      
      // Build list of variants to keep
      const variantsToKeep = new Set<string>();
      
      for (const variant of variants) {
        // Resolve color_id
        let colorId = variant.color_id;
        if (!colorId || !existingColorIds.has(colorId)) {
          colorId = colorIdMap.get(colorId || '') || colorIdMap.get(variant.color?.name || '') || '';
        }
        
        if (!colorId) continue;
        
        const variantKey = `${colorId}:${variant.size}`;
        variantsToKeep.add(variantKey);
        
        const variantData = {
          product_id: id,
          color_id: colorId,
          size: variant.size,
          sku: variant.sku,
          stock_quantity: variant.stock_quantity,
          price_adjustment: variant.price_adjustment,
          is_active: variant.is_active,
        };
        
        if (variant.id) {
          await supabase.from('product_variants').update(variantData).eq('id', variant.id);
        } else {
          await supabase.from('product_variants').insert(variantData);
        }
      }
      
      // Delete variants that are no longer present
      const toDelete = (existingVariants || []).filter((v) => !variantsToKeep.has(`${v.color_id}:${v.size}`));
      if (toDelete.length > 0) {
        await supabase.from('product_variants').delete().in('id', toDelete.map((v) => v.id));
      }
    }
  }

  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function updateProductOrder(updates: { id: string; display_order: number }[]): Promise<void> {
  const promises = updates.map(({ id, display_order }) =>
    supabase.from('products').update({ display_order }).eq('id', id)
  );
  const results = await Promise.all(promises);
  const err = results.find((r) => r.error);
  if (err?.error) throw err.error;
}

// Categories CRUD
export async function createCategory(data: CategoryFormData): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return category;
}

export async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

// Banners CRUD
export async function createBanner(data: BannerFormData): Promise<Banner> {
  const { data: banner, error } = await supabase
    .from('banners')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return banner;
}

export async function updateBanner(id: string, data: Partial<BannerFormData>): Promise<Banner> {
  const { data: banner, error } = await supabase
    .from('banners')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function getBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return data || [];
}

export async function getActiveBanners(): Promise<Banner[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return data || [];
}

// Trigger site rebuild via GitHub Actions
export async function triggerSiteDeploy(): Promise<void> {
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const token = process.env.NEXT_PUBLIC_GITHUB_DEPLOY_TOKEN;

  if (!repo || !token) {
    throw new Error('Deploy not configured. Set NEXT_PUBLIC_GITHUB_REPO and NEXT_PUBLIC_GITHUB_DEPLOY_TOKEN.');
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Deploy trigger failed (${res.status}): ${text}`);
  }
}

// Delete an order
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

// Dashboard stats
export async function getDashboardStats() {
  const [
    { count: totalProducts },
    { count: totalCategories },
    { count: totalOrders },
    { count: pendingOrders },
    { count: confirmedOrders },
    { count: totalViews },
    { count: cancelledOrders },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('product_views').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ]);

  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, payment_status');

  const totalRevenue = orders
    ?.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0) || 0;

  const totalOrderValue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

  const abandonedOrders = orders?.filter(o => (o.status === 'pending' || o.status === 'cancelled') && o.payment_status !== 'paid') || [];
  const abandonedCarts = abandonedOrders.length;
  const abandonedValue = abandonedOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return {
    totalProducts: totalProducts || 0,
    totalCategories: totalCategories || 0,
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    confirmedOrders: confirmedOrders || 0,
    cancelledOrders: cancelledOrders || 0,
    totalRevenue,
    totalOrderValue,
    totalViews: totalViews || 0,
    abandonedCarts,
    abandonedValue,
  };
}
