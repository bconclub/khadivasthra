<?php
/**
 * Products API
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/../includes/auth-check.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all products
if ($method === 'GET') {
    $data = readJSON(PRODUCTS_FILE);
    $products = $data['products'] ?? [];
    jsonResponse(['products' => $products]);
}

// POST - Add new product
if ($method === 'POST') {
    validateCSRF($_POST['csrf_token'] ?? '');
    
    $name = sanitize($_POST['name'] ?? '');
    $slug = sanitize($_POST['slug'] ?? '');
    $category = sanitize($_POST['category'] ?? '');
    $price = floatval($_POST['price'] ?? 0);
    $comparePrice = !empty($_POST['comparePrice']) ? floatval($_POST['comparePrice']) : null;
    $description = sanitize($_POST['description'] ?? '');
    $longDescription = sanitize($_POST['longDescription'] ?? '');
    $image = sanitize($_POST['image'] ?? '');
    $imagesJson = $_POST['images'] ?? '[]';
    $images = json_decode($imagesJson, true) ?: [];
    if (!empty($image) && !in_array($image, $images)) {
        $images = array_merge([$image], $images);
    }
    $material = sanitize($_POST['material'] ?? '');
    $careInstructions = sanitize($_POST['careInstructions'] ?? '');
    $isFeatured = isset($_POST['isFeatured']) && $_POST['isFeatured'] === 'true';
    $inStock = isset($_POST['inStock']) && $_POST['inStock'] !== 'false';
    $isNew = isset($_POST['isNew']) && $_POST['isNew'] === 'true';
    $isBestSeller = isset($_POST['isBestSeller']) && $_POST['isBestSeller'] === 'true';
    
    if (empty($name) || empty($category) || $price <= 0) {
        jsonError('Name, category, and valid price are required');
    }
    
    $data = readJSON(PRODUCTS_FILE);
    $products = $data['products'] ?? [];
    
    if (empty($slug)) {
        $slug = generateSlug($name);
    }
    // Ensure unique slug
    $baseSlug = $slug;
    $counter = 1;
    while (in_array($slug, array_column($products, 'slug'))) {
        $slug = $baseSlug . '-' . $counter;
        $counter++;
    }
    
    $newProduct = [
        'id' => getNextId($products),
        'name' => $name,
        'slug' => $slug,
        'category' => $category,
        'price' => $price,
        'comparePrice' => $comparePrice,
        'description' => $description,
        'longDescription' => $longDescription,
        'image' => !empty($images) ? $images[0] : $image,
        'images' => $images,
        'material' => $material,
        'careInstructions' => $careInstructions,
        'isFeatured' => $isFeatured,
        'inStock' => $inStock,
        'isNew' => $isNew,
        'isBestSeller' => $isBestSeller,
        'createdAt' => date('Y-m-d')
    ];
    
    $products[] = $newProduct;
    $data['products'] = $products;
    
    if (writeJSON(PRODUCTS_FILE, $data)) {
        // Sync to frontend
        syncProductsToFrontend();
        jsonSuccess('Product added successfully', $newProduct);
    } else {
        jsonError('Failed to save product');
    }
}

// PUT - Update product
if ($method === 'PUT' || ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT')) {
    // Handle both PUT and POST with _method=PUT
    if ($method === 'PUT') {
        parse_str(file_get_contents('php://input'), $putData);
    } else {
        $putData = $_POST;
    }
    
    validateCSRF($putData['csrf_token'] ?? '');
    
    $id = sanitize($putData['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonError('Product ID is required');
    }
    
    $data = readJSON(PRODUCTS_FILE);
    $products = $data['products'] ?? [];
    
    $found = false;
    foreach ($products as $index => $product) {
        if ($product['id'] == $id) {
            $found = true;
            
            if (isset($putData['name'])) {
                $products[$index]['name'] = sanitize($putData['name']);
            }
            if (isset($putData['slug'])) {
                $products[$index]['slug'] = sanitize($putData['slug']);
            } elseif (isset($putData['name'])) {
                $products[$index]['slug'] = generateSlug($products[$index]['name']);
            }
            if (isset($putData['category'])) {
                $products[$index]['category'] = sanitize($putData['category']);
            }
            if (isset($putData['price'])) {
                $products[$index]['price'] = floatval($putData['price']);
            }
            if (isset($putData['comparePrice'])) {
                $products[$index]['comparePrice'] = !empty($putData['comparePrice']) ? floatval($putData['comparePrice']) : null;
            }
            if (isset($putData['description'])) {
                $products[$index]['description'] = sanitize($putData['description']);
            }
            if (isset($putData['longDescription'])) {
                $products[$index]['longDescription'] = sanitize($putData['longDescription']);
            }
            if (isset($putData['image'])) {
                $products[$index]['image'] = sanitize($putData['image']);
            }
            if (isset($putData['images'])) {
                $imagesJson = $putData['images'];
                $images = json_decode($imagesJson, true) ?: [];
                $products[$index]['images'] = $images;
                if (!empty($images) && empty($products[$index]['image'])) {
                    $products[$index]['image'] = $images[0];
                }
            }
            if (isset($putData['material'])) {
                $products[$index]['material'] = sanitize($putData['material']);
            }
            if (isset($putData['careInstructions'])) {
                $products[$index]['careInstructions'] = sanitize($putData['careInstructions']);
            }
            if (isset($putData['isFeatured'])) {
                $products[$index]['isFeatured'] = $putData['isFeatured'] === 'true' || $putData['isFeatured'] === true;
            }
            if (isset($putData['inStock'])) {
                $products[$index]['inStock'] = $putData['inStock'] !== 'false' && $putData['inStock'] !== false;
            }
            if (isset($putData['isNew'])) {
                $products[$index]['isNew'] = $putData['isNew'] === 'true' || $putData['isNew'] === true;
            }
            if (isset($putData['isBestSeller'])) {
                $products[$index]['isBestSeller'] = $putData['isBestSeller'] === 'true' || $putData['isBestSeller'] === true;
            }
            
            break;
        }
    }
    
    if (!$found) {
        jsonError('Product not found', 404);
    }
    
    $data['products'] = $products;
    
    if (writeJSON(PRODUCTS_FILE, $data)) {
        // Sync to frontend
        syncProductsToFrontend();
        jsonSuccess('Product updated successfully', $products[$index]);
    } else {
        jsonError('Failed to update product');
    }
}

// DELETE - Delete product
if ($method === 'DELETE' || ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'DELETE')) {
    // Handle both DELETE and POST with _method=DELETE
    if ($method === 'DELETE') {
        parse_str(file_get_contents('php://input'), $deleteData);
    } else {
        $deleteData = $_POST;
    }
    
    validateCSRF($deleteData['csrf_token'] ?? '');
    
    $id = sanitize($_GET['id'] ?? $deleteData['id'] ?? '');
    if (empty($id)) {
        jsonError('Product ID is required');
    }
    
    $data = readJSON(PRODUCTS_FILE);
    $products = $data['products'] ?? [];
    
    $found = false;
    $imagePath = '';
    foreach ($products as $index => $product) {
        if ($product['id'] == $id) {
            $found = true;
            $imagePath = $product['image'] ?? '';
            array_splice($products, $index, 1);
            break;
        }
    }
    
    if (!$found) {
        jsonError('Product not found', 404);
    }
    
    // Delete associated image
    if ($imagePath) {
        deleteImage($imagePath);
    }
    
    $data['products'] = $products;
    
    if (writeJSON(PRODUCTS_FILE, $data)) {
        // Sync to frontend
        syncProductsToFrontend();
        jsonSuccess('Product deleted successfully');
    } else {
        jsonError('Failed to delete product');
    }
}

jsonError('Method not allowed', 405);
?>

