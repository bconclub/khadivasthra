import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildItems, googleXml, metaCsv, type FeedProduct } from './catalog-feed';

const product: FeedProduct = {
  id: 'p1', name: 'Cotton Mundu', slug: 'cotton-mundu', price: 500, compare_price: 600,
  description: 'Cotton & cream', image_url: '/images/parent.jpg', images: [], material: 'Cotton',
  in_stock: true, stock_quantity: 3, is_active: true, is_wholesale: false, has_variants: true,
  category: { name: 'Mundus', is_active: true },
};

test('variant has stable ID, matching color/size link, stock, image and adjusted sale', () => {
  const { items, skipped } = buildItems([product], [
    { id: 'c1', product_id: 'p1', name: 'Blue', images: ['/images/blue.jpg'] },
  ], [{ id: 'v1', product_id: 'p1', color_id: 'c1', size: 'L', sku: 'SKU1',
    stock_quantity: 0, price_adjustment: 50, is_active: true }]);
  assert.deepEqual(skipped, []);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'v1');
  assert.equal(items[0].itemGroupId, 'p1');
  assert.equal(items[0].availability, 'out of stock');
  assert.equal(items[0].image, 'https://khadivasthra.com/images/blue.jpg');
  assert.equal(items[0].link, 'https://khadivasthra.com/product/cotton-mundu/?color=Blue&size=L');
  assert.equal(items[0].price, 600);
  assert.equal(items[0].salePrice, 550);
  assert.match(googleXml(items), /<g:description>Cotton &amp; cream<\/g:description>/);
  assert.match(metaCsv(items), /"550.00 INR"/);
});

test('excludes wholesale, inactive categories and incomplete variants', () => {
  const wholesale = { ...product, id: 'p2', is_wholesale: true };
  const inactive = { ...product, id: 'p3', category: { name: 'Mundus', is_active: false } };
  const { items, skipped } = buildItems([wholesale, inactive, product], [], [
    { id: 'v2', product_id: 'p1', color_id: 'missing', size: 'L', sku: null,
      stock_quantity: 5, price_adjustment: 0, is_active: true },
  ]);
  assert.equal(items.length, 0);
  assert.deepEqual(skipped, ['v2: incomplete variant']);
});

test('single product requires both stock flags and a real image', () => {
  const single = { ...product, has_variants: false, in_stock: false, stock_quantity: 5 };
  const { items } = buildItems([single], [], []);
  assert.equal(items[0].availability, 'out of stock');
  assert.equal(items[0].itemGroupId, undefined);
  assert.equal(buildItems([{ ...single, image_url: null }], [], []).items.length, 0);
});
