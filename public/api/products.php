<?php
/**
 * Products API for Khadi Vasthra
 * Works with static export in /out/api/
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/../data/products.json';

function readData() {
    global $dataFile;
    if (!file_exists($dataFile)) {
        return ['products' => []];
    }
    $content = file_get_contents($dataFile);
    $data = json_decode($content, true);
    
    // Handle both formats
    if (is_array($data) && !isset($data['products'])) {
        return ['products' => $data];
    }
    return $data ?: ['products' => []];
}

function writeData($data) {
    global $dataFile;
    $dir = dirname($dataFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function generateSlug($text) {
    $slug = strtolower($text);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim($slug, '-');
    return $slug;
}

function generateId() {
    return 'prod_' . uniqid();
}

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all products
if ($method === 'GET') {
    $data = readData();
    
    // Optional filtering
    $category = $_GET['category'] ?? null;
    $featured = isset($_GET['featured']) ? filter_var($_GET['featured'], FILTER_VALIDATE_BOOLEAN) : null;
    $id = $_GET['id'] ?? null;
    
    $products = $data['products'];
    
    // Get single product by ID
    if ($id) {
        foreach ($products as $product) {
            if ($product['id'] === $id) {
                echo json_encode(['success' => true, 'product' => $product]);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        exit;
    }
    
    // Filter by category
    if ($category) {
        $products = array_filter($products, function($p) use ($category) {
            $catSlug = generateSlug($p['category'] ?? '');
            return $catSlug === $category || ($p['category'] ?? '') === $category;
        });
        $products = array_values($products);
    }
    
    // Filter featured
    if ($featured !== null) {
        $products = array_filter($products, function($p) use ($featured) {
            $isFeatured = $p['isFeatured'] ?? false;
            // Handle boolean, string, and numeric values
            if (is_bool($isFeatured)) {
                return $isFeatured === $featured;
            } elseif (is_string($isFeatured)) {
                return ($isFeatured === 'true' || $isFeatured === '1') === $featured;
            } elseif (is_numeric($isFeatured)) {
                return ((bool)$isFeatured) === $featured;
            }
            return false;
        });
        $products = array_values($products);
    }
    
    echo json_encode(['success' => true, 'products' => $products]);
    exit;
}

// POST - Create new product
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        // Try form data
        $input = $_POST;
    }
    
    if (empty($input['name']) || empty($input['category']) || empty($input['price'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Name, category, and price are required']);
        exit;
    }
    
    $data = readData();
    
    $product = [
        'id' => generateId(),
        'name' => $input['name'],
        'slug' => $input['slug'] ?? generateSlug($input['name']),
        'category' => $input['category'],
        'price' => floatval($input['price']),
        'comparePrice' => isset($input['comparePrice']) ? floatval($input['comparePrice']) : null,
        'description' => $input['description'] ?? '',
        'longDescription' => $input['longDescription'] ?? '',
        'image' => $input['image'] ?? '',
        'images' => $input['images'] ?? [],
        'material' => $input['material'] ?? '',
        'careInstructions' => $input['careInstructions'] ?? '',
        'inStock' => isset($input['inStock']) ? filter_var($input['inStock'], FILTER_VALIDATE_BOOLEAN) : true,
        'isFeatured' => isset($input['isFeatured']) ? filter_var($input['isFeatured'], FILTER_VALIDATE_BOOLEAN) : false,
        'isNew' => isset($input['isNew']) ? filter_var($input['isNew'], FILTER_VALIDATE_BOOLEAN) : false,
        'isBestSeller' => isset($input['isBestSeller']) ? filter_var($input['isBestSeller'], FILTER_VALIDATE_BOOLEAN) : false,
        'createdAt' => date('Y-m-d H:i:s')
    ];
    
    $data['products'][] = $product;
    
    if (writeData($data)) {
        echo json_encode(['success' => true, 'product' => $product]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save product']);
    }
    exit;
}

// PUT - Update product
if ($method === 'PUT') {
    $id = $_GET['id'] ?? '';
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Product ID is required']);
        exit;
    }
    
    $data = readData();
    $found = false;
    
    foreach ($data['products'] as $key => &$product) {
        if ($product['id'] === $id) {
            $found = true;
            
            // Update fields
            if (isset($input['name'])) $product['name'] = $input['name'];
            if (isset($input['slug'])) $product['slug'] = $input['slug'];
            if (isset($input['category'])) $product['category'] = $input['category'];
            if (isset($input['price'])) $product['price'] = floatval($input['price']);
            if (isset($input['comparePrice'])) $product['comparePrice'] = floatval($input['comparePrice']);
            if (isset($input['description'])) $product['description'] = $input['description'];
            if (isset($input['longDescription'])) $product['longDescription'] = $input['longDescription'];
            if (isset($input['image'])) $product['image'] = $input['image'];
            if (isset($input['images'])) $product['images'] = $input['images'];
            if (isset($input['material'])) $product['material'] = $input['material'];
            if (isset($input['careInstructions'])) $product['careInstructions'] = $input['careInstructions'];
            if (isset($input['inStock'])) $product['inStock'] = filter_var($input['inStock'], FILTER_VALIDATE_BOOLEAN);
            if (isset($input['isFeatured'])) $product['isFeatured'] = filter_var($input['isFeatured'], FILTER_VALIDATE_BOOLEAN);
            if (isset($input['isNew'])) $product['isNew'] = filter_var($input['isNew'], FILTER_VALIDATE_BOOLEAN);
            if (isset($input['isBestSeller'])) $product['isBestSeller'] = filter_var($input['isBestSeller'], FILTER_VALIDATE_BOOLEAN);
            
            $product['updatedAt'] = date('Y-m-d H:i:s');
            break;
        }
    }
    
    if (!$found) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        exit;
    }
    
    if (writeData($data)) {
        echo json_encode(['success' => true, 'message' => 'Product updated']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update product']);
    }
    exit;
}

// DELETE - Delete product
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Product ID is required']);
        exit;
    }
    
    $data = readData();
    $found = false;
    
    foreach ($data['products'] as $key => $product) {
        if ($product['id'] === $id) {
            $found = true;
            array_splice($data['products'], $key, 1);
            break;
        }
    }
    
    if (!$found) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        exit;
    }
    
    if (writeData($data)) {
        echo json_encode(['success' => true, 'message' => 'Product deleted']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete product']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
