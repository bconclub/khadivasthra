<?php
/**
 * Sync Products from Admin to Frontend
 * This script copies products from admin/data/products.json to src/data/products.json
 * while preserving the frontend's data structure
 */

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/functions.php';

// Paths
$adminProductsFile = PRODUCTS_FILE;
$frontendProductsFile = __DIR__ . '/../src/data/products.json';

// Read admin products
$adminData = readJSON($adminProductsFile);
$adminProducts = $adminData['products'] ?? [];

// Read frontend products (to preserve extra fields)
$frontendProducts = [];
if (file_exists($frontendProductsFile)) {
    $frontendContent = file_get_contents($frontendProductsFile);
    $frontendProducts = json_decode($frontendContent, true) ?: [];
}

// Create a map of frontend products by ID for merging
$frontendMap = [];
foreach ($frontendProducts as $product) {
    $frontendMap[$product['id']] = $product;
}

// Merge admin products with frontend products
$syncedProducts = [];
foreach ($adminProducts as $adminProduct) {
    $productId = $adminProduct['id'];
    
    // Start with admin product data
    $syncedProduct = [
        'id' => $adminProduct['id'],
        'name' => $adminProduct['name'],
        'category' => $adminProduct['category'],
        'price' => $adminProduct['price'],
        'description' => $adminProduct['description'] ?? '',
        'image' => $adminProduct['image'] ?? '',
        'isFeatured' => $adminProduct['isFeatured'] ?? false,
    ];
    
    // Add slug if exists
    if (isset($adminProduct['slug'])) {
        $syncedProduct['slug'] = $adminProduct['slug'];
    }
    
    // Preserve frontend-specific fields if they exist
    if (isset($frontendMap[$productId])) {
        $frontendProduct = $frontendMap[$productId];
        
        // Preserve details object
        if (isset($frontendProduct['details'])) {
            $syncedProduct['details'] = $frontendProduct['details'];
        }
        
        // Preserve careInstructions array
        if (isset($frontendProduct['careInstructions'])) {
            $syncedProduct['careInstructions'] = $frontendProduct['careInstructions'];
        }
        
        // Preserve longDescription
        if (isset($frontendProduct['longDescription'])) {
            $syncedProduct['longDescription'] = $frontendProduct['longDescription'];
        }
        
        // Use frontend image if admin image is placeholder
        if (empty($adminProduct['image']) || strpos($adminProduct['image'], '/images/mundu-') !== false) {
            if (!empty($frontendProduct['image'])) {
                $syncedProduct['image'] = $frontendProduct['image'];
            }
        }
    } else {
        // New product from admin - add default structure
        $syncedProduct['details'] = [
            'material' => $adminProduct['material'] ?? '100% Premium Cotton',
            'weave' => 'Handloom',
            'fit' => 'Regular Fit',
            'pattern' => 'Solid/Plain',
            'origin' => 'Aluva, Kerala',
            'dimensions' => '2.0m x 1.25m (Single)'
        ];
        
        $syncedProduct['careInstructions'] = [
            'Hand wash separately in cold water',
            'Do not bleach',
            'Dry in shade',
            'Iron on medium heat',
            'Do not wring forcefully'
        ];
        
        $syncedProduct['longDescription'] = $adminProduct['description'] ?? '';
    }
    
    $syncedProducts[] = $syncedProduct;
}

// Add any frontend-only products (products that exist in frontend but not in admin)
foreach ($frontendProducts as $frontendProduct) {
    $productId = $frontendProduct['id'];
    $existsInAdmin = false;
    
    foreach ($adminProducts as $adminProduct) {
        if ($adminProduct['id'] === $productId) {
            $existsInAdmin = true;
            break;
        }
    }
    
    if (!$existsInAdmin) {
        // Keep frontend-only products
        $syncedProducts[] = $frontendProduct;
    }
}

// Write to frontend products file
$json = json_encode($syncedProducts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$dir = dirname($frontendProductsFile);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

if (file_put_contents($frontendProductsFile, $json) !== false) {
    echo json_encode([
        'success' => true,
        'message' => 'Products synced successfully',
        'count' => count($syncedProducts)
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to write frontend products file'
    ]);
}
?>



