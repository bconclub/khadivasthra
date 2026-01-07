<?php
/**
 * Convert existing products.json to admin format
 */

$sourceFile = __DIR__ . '/../src/data/products.json';
$targetFile = __DIR__ . '/data/products.json';
$categoriesFile = __DIR__ . '/data/categories.json';

// Read source products
$products = json_decode(file_get_contents($sourceFile), true);

// Convert products - add slug and inStock
$convertedProducts = [];
$categories = [];

foreach ($products as $product) {
    // Generate slug
    $slug = strtolower(trim($product['name']));
    $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
    $slug = preg_replace('/-+/', '-', $slug);
    $slug = trim($slug, '-');
    
    // Ensure unique slug
    $baseSlug = $slug;
    $counter = 1;
    while (in_array($slug, array_column($convertedProducts, 'slug'))) {
        $slug = $baseSlug . '-' . $counter;
        $counter++;
    }
    
    $convertedProduct = [
        'id' => $product['id'],
        'name' => $product['name'],
        'slug' => $slug,
        'category' => $product['category'],
        'price' => $product['price'],
        'description' => $product['description'],
        'image' => $product['image'],
        'isFeatured' => $product['isFeatured'] ?? false,
        'inStock' => true, // Default to in stock
        'createdAt' => date('Y-m-d')
    ];
    
    $convertedProducts[] = $convertedProduct;
    
    // Collect categories
    if (!in_array($product['category'], array_column($categories, 'name'))) {
        $catSlug = strtolower(trim($product['category']));
        $catSlug = preg_replace('/[^a-z0-9-]/', '-', $catSlug);
        $catSlug = preg_replace('/-+/', '-', $catSlug);
        $catSlug = trim($catSlug, '-');
        
        $categories[] = [
            'id' => (string)(count($categories) + 1),
            'name' => $product['category'],
            'slug' => $catSlug,
            'description' => ''
        ];
    }
}

// Create data directory
$dataDir = dirname($targetFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Write products
file_put_contents($targetFile, json_encode(['products' => $convertedProducts], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

// Write categories
file_put_contents($categoriesFile, json_encode(['categories' => $categories], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

echo "Conversion complete!\n";
echo "Products: " . count($convertedProducts) . "\n";
echo "Categories: " . count($categories) . "\n";
?>



