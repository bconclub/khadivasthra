export const SITE_URL = 'https://khadivasthra.com';
export const BRAND = 'Khadi Vasthra';

export interface FeedColor { id: string; product_id: string; name: string; images: string[] }
export interface FeedVariant { id: string; product_id: string; color_id: string; size: string; sku: string | null; stock_quantity: number; price_adjustment: number; is_active: boolean }
export interface FeedProduct {
  id: string; name: string; slug: string; price: number; compare_price: number | null;
  description: string | null; image_url: string | null; images: string[] | null;
  material: string | null; colours?: string[] | null; in_stock: boolean; stock_quantity: number;
  is_active: boolean; is_wholesale: boolean; has_variants: boolean;
  category?: { name: string; is_active: boolean } | null;
}
export interface FeedItem {
  id: string; itemGroupId?: string; title: string; description: string; link: string;
  image: string; additionalImages: string[]; availability: 'in stock' | 'out of stock';
  price: number; salePrice?: number; color?: string; size?: string; material?: string;
  productType?: string; mpn?: string; gender: 'female' | 'unisex'; ageGroup: 'adult';
}

function absoluteImage(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, SITE_URL);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function images(primary: string | null | undefined, others: string[] = []): string[] {
  return [...new Set([primary, ...others].map(absoluteImage).filter((s): s is string => Boolean(s)))];
}

function validPrice(value: number): boolean { return Number.isFinite(Number(value)) && Number(value) > 0; }

export function buildItems(products: FeedProduct[], colors: FeedColor[], variants: FeedVariant[]): { items: FeedItem[]; skipped: string[] } {
  const items: FeedItem[] = [];
  const skipped: string[] = [];
  const colorsById = new Map(colors.map(color => [color.id, color]));
  const variantsByProduct = new Map<string, FeedVariant[]>();
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.product_id) || [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }
  for (const product of products) {
    if (!product.is_active || product.is_wholesale || product.category?.is_active === false) continue;
    const base = Number(product.price);
    if (!validPrice(base)) { skipped.push(`${product.id}: invalid price`); continue; }
    const description = (product.description || product.name).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const productType = product.category?.name || undefined;
    const material = product.material?.trim() || undefined;
    const gender = /women|ladies|set.mundu|set saree/i.test(`${product.name} ${productType || ''}`) ? 'female' : 'unisex';
    const demographics = { gender: gender as 'female' | 'unisex', ageGroup: 'adult' as const };
    const baseLink = `${SITE_URL}/product/${encodeURIComponent(product.slug)}/`;
    const makePrice = (adjustment: number) => {
      const current = base + adjustment;
      const compare = Number(product.compare_price);
      return { price: Number.isFinite(compare) && compare > current ? compare : current,
        salePrice: Number.isFinite(compare) && compare > current ? current : undefined };
    };
    if (product.has_variants) {
      for (const variant of variantsByProduct.get(product.id) || []) {
        if (!variant.is_active) continue;
        const color = colorsById.get(variant.color_id);
        const variantImages = images(color?.images?.[0] || product.image_url, [
          ...(color?.images || []), ...(product.images || []),
        ]);
        const current = base + Number(variant.price_adjustment || 0);
        if (!color || color.product_id !== product.id || !variant.size?.trim() || !variantImages.length || !validPrice(current)) {
          skipped.push(`${variant.id}: incomplete variant`); continue;
        }
        const link = new URL(baseLink);
        link.searchParams.set('color', color.name);
        link.searchParams.set('size', variant.size);
        items.push({ id: variant.id, itemGroupId: product.id,
          title: `${product.name} - ${color.name} / ${variant.size}`.slice(0, 150),
          description, link: link.href, image: variantImages[0], additionalImages: variantImages.slice(1, 11),
          availability: variant.stock_quantity > 0 ? 'in stock' : 'out of stock',
          ...makePrice(Number(variant.price_adjustment || 0)), color: color.name, size: variant.size,
          material, productType, mpn: variant.sku?.trim() || undefined, ...demographics });
      }
    } else {
      const productImages = images(product.image_url, product.images || []);
      if (!productImages.length) { skipped.push(`${product.id}: missing image`); continue; }
      items.push({ id: product.id, title: product.name.slice(0, 150), description,
        link: baseLink, image: productImages[0], additionalImages: productImages.slice(1, 11),
        availability: product.in_stock && product.stock_quantity > 0 ? 'in stock' : 'out of stock',
        ...makePrice(0), material, productType,
        color: product.colours?.filter(Boolean).join('/') || undefined, ...demographics });
    }
  }
  return { items, skipped };
}

const xml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const money = (n: number) => `${n.toFixed(2)} INR`;

export function googleXml(items: FeedItem[]): string {
  const field = (name: string, value?: string) => value ? `      <g:${name}>${xml(value)}</g:${name}>\n` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>${BRAND}</title>\n    <link>${SITE_URL}</link>\n    <description>${BRAND} product catalog</description>\n${items.map(item => `    <item>\n${field('id', item.id)}${field('item_group_id', item.itemGroupId)}${field('title', item.title)}${field('description', item.description.slice(0, 5000))}${field('link', item.link)}${field('image_link', item.image)}${item.additionalImages.map(image => field('additional_image_link', image)).join('')}${field('availability', item.availability)}${field('condition', 'new')}${field('price', money(item.price))}${field('sale_price', item.salePrice === undefined ? undefined : money(item.salePrice))}${field('brand', BRAND)}${field('product_type', item.productType)}${field('color', item.color)}${field('size', item.size)}${field('material', item.material)}${field('gender', item.gender)}${field('age_group', item.ageGroup)}${field('mpn', item.mpn)}    </item>`).join('\n')}\n  </channel>\n</rss>\n`;
}

const META_FIELDS = ['id', 'title', 'description', 'availability', 'condition', 'price', 'sale_price', 'link', 'image_link', 'brand', 'item_group_id', 'color', 'size', 'material', 'product_type', 'additional_image_link', 'mpn', 'gender', 'age_group'];
function csvCell(value: string | undefined): string { return `"${(value || '').replace(/"/g, '""')}"`; }
export function metaCsv(items: FeedItem[]): string {
  return [META_FIELDS.join(','), ...items.map(item => [item.id, item.title, item.description.slice(0, 5000),
    item.availability, 'new', money(item.price), item.salePrice === undefined ? '' : money(item.salePrice),
    item.link, item.image, BRAND, item.itemGroupId, item.color, item.size, item.material,
    item.productType, item.additionalImages.join(','), item.mpn, item.gender, item.ageGroup].map(csvCell).join(','))].join('\r\n') + '\r\n';
}
