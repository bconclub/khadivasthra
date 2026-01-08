<?php
/**
 * Helper Functions
 * Khadi Vasthra Admin Panel
 */

/**
 * Send JSON response
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Send error response
 */
function jsonError($message, $statusCode = 400) {
    jsonResponse(['error' => $message], $statusCode);
}

/**
 * Send success response
 */
function jsonSuccess($message, $data = null) {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse($response);
}

/**
 * Sanitize input
 */
function sanitize($input) {
    if (is_array($input)) {
        return array_map('sanitize', $input);
    }
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate CSRF token
 */
function validateCSRF($token) {
    if (!isset($_SESSION['csrf_token']) || $token !== $_SESSION['csrf_token']) {
        jsonError('Invalid CSRF token', 403);
    }
}

/**
 * Generate CSRF token
 */
function generateCSRF() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Generate slug from string
 */
function generateSlug($string) {
    $string = strtolower(trim($string));
    $string = preg_replace('/[^a-z0-9-]/', '-', $string);
    $string = preg_replace('/-+/', '-', $string);
    return trim($string, '-');
}

/**
 * Read JSON file
 */
function readJSON($file) {
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    if (empty($content)) {
        return [];
    }
    $data = json_decode($content, true);
    return $data ?: [];
}

/**
 * Write JSON file
 */
function writeJSON($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return file_put_contents($file, $json) !== false;
}

/**
 * Validate image upload
 */
function validateImage($file) {
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return ['valid' => false, 'error' => 'No file uploaded'];
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        return ['valid' => false, 'error' => 'File size exceeds 2MB limit'];
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXTENSIONS)) {
        return ['valid' => false, 'error' => 'Invalid file type. Allowed: ' . implode(', ', ALLOWED_EXTENSIONS)];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($mime, $allowedMimes)) {
        return ['valid' => false, 'error' => 'Invalid file type'];
    }

    return ['valid' => true];
}

/**
 * Upload image
 */
function uploadImage($file, $prefix = 'product') {
    $validation = validateImage($file);
    if (!$validation['valid']) {
        return ['success' => false, 'error' => $validation['error']];
    }

    if (!is_dir(UPLOADS_DIR)) {
        mkdir(UPLOADS_DIR, 0755, true);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = $prefix . '_' . time() . '_' . uniqid() . '.' . $ext;
    $path = UPLOADS_DIR . $filename;

    if (move_uploaded_file($file['tmp_name'], $path)) {
        return [
            'success' => true,
            'path' => '/admin/uploads/' . $filename,
            'filename' => $filename
        ];
    }

    return ['success' => false, 'error' => 'Failed to upload file'];
}

/**
 * Delete image file
 */
function deleteImage($path) {
    if (empty($path)) {
        return true;
    }
    
    // Remove /admin/uploads/ prefix if present
    $path = str_replace('/admin/uploads/', '', $path);
    $filepath = UPLOADS_DIR . $path;
    
    if (file_exists($filepath) && is_file($filepath)) {
        return unlink($filepath);
    }
    
    return true;
}

/**
 * Get next ID for products/categories
 */
function getNextId($items) {
    if (empty($items)) {
        return '1';
    }
    $ids = array_map('intval', array_column($items, 'id'));
    return (string)(max($ids) + 1);
}

/**
 * Sync products from admin to frontend
 */
function syncProductsToFrontend() {
    $adminProductsFile = PRODUCTS_FILE;
    $frontendProductsFile = __DIR__ . '/../../src/data/products.json';
    
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
            
            $syncedProduct['longDescription'] = $adminProduct['longDescription'] ?? $adminProduct['description'] ?? '';
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
    
    file_put_contents($frontendProductsFile, $json);
}
?>



