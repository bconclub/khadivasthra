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
 * If authentication is disabled (no session), skip validation
 */
function validateCSRF($token) {
    // Skip CSRF validation if auth is disabled (no session or session not started)
    if (!isset($_SESSION) || !isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        // Auth is disabled - allow all requests
        return;
    }
    
    // Only validate CSRF if authenticated
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
        // Check for PHP upload errors
        $uploadError = $file['error'] ?? UPLOAD_ERR_OK;
        $errorMessage = 'No file uploaded';
        
        switch ($uploadError) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMessage = 'File size exceeds PHP limit (' . ini_get('upload_max_filesize') . ')';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMessage = 'File was only partially uploaded';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMessage = 'No file was uploaded';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $errorMessage = 'Missing temporary folder';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $errorMessage = 'Failed to write file to disk';
                break;
            case UPLOAD_ERR_EXTENSION:
                $errorMessage = 'File upload stopped by PHP extension';
                break;
        }
        
        return ['valid' => false, 'error' => $errorMessage];
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
        @mkdir(UPLOADS_DIR, 0755, true);
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

/**
 * Sync products from admin to frontend
 */
function syncProductsToFrontend() {
    $adminProductsFile = PRODUCTS_FILE;
    $frontendProductsFile = __DIR__ . '/../../src/data/products.json';
    $publicProductsFile = __DIR__ . '/../../public/data/products.json';
    
    // Read admin products
    $adminData = readJSON($adminProductsFile);
    $adminProducts = $adminData['products'] ?? [];
    
    // Format for public API (simple format)
    $publicProducts = [];
    foreach ($adminProducts as $adminProduct) {
        $slug = $adminProduct['slug'] ?? generateSlug($adminProduct['name']);
        $category = $adminProduct['category'] ?? 'uncategorized';
        $categorySlug = generateSlug($category);
        
        // Convert admin/uploads/ paths to organized /images/products/category/product/ paths
        $imagePath = $adminProduct['image'] ?? '';
        
        if (!empty($imagePath) && strpos($imagePath, '/admin/uploads/') !== false) {
            // Extract filename from admin path
            $filename = basename($imagePath);
            
            // Organized structure: /images/products/{category-slug}/{product-slug}/
            $relPath = '/images/products/' . $categorySlug . '/' . $slug . '/';
            
            // Target path in public folder
            $targetPath = __DIR__ . '/../../public' . $relPath . $filename;
            $sourcePath = __DIR__ . '/../uploads/' . $filename;
            
            // Create products directory if it doesn't exist
            $productsDir = dirname($targetPath);
            if (!is_dir($productsDir)) {
                mkdir($productsDir, 0755, true);
            }
            
            // Copy file from admin/uploads to structured folder if it exists
            if (file_exists($sourcePath)) {
                copy($sourcePath, $targetPath);
            }
            
            // Convert path to public structured path
            $imagePath = $relPath . $filename;
        }
        
        $publicProduct = [
            'id' => $adminProduct['id'],
            'name' => $adminProduct['name'],
            'category' => $adminProduct['category'],
            'price' => $adminProduct['price'],
            'description' => $adminProduct['description'] ?? '',
            'image' => $imagePath,
            'isFeatured' => $adminProduct['isFeatured'] ?? false,
            'slug' => $slug,
            'material' => $adminProduct['material'] ?? '',
            'careInstructions' => $adminProduct['careInstructions'] ?? '',
            'inStock' => $adminProduct['inStock'] ?? true,
            'isNew' => $adminProduct['isNew'] ?? false,
            'isBestSeller' => $adminProduct['isBestSeller'] ?? false,
        ];
        
        // Add optional fields
        if (isset($adminProduct['longDescription'])) {
            $publicProduct['longDescription'] = $adminProduct['longDescription'];
        }
        if (isset($adminProduct['comparePrice'])) {
            $publicProduct['comparePrice'] = $adminProduct['comparePrice'];
        }
        if (isset($adminProduct['images'])) {
            // Also convert image paths in images array
            $convertedImages = [];
            foreach ($adminProduct['images'] as $img) {
                if (!empty($img) && strpos($img, '/admin/uploads/') !== false) {
                    $imgFilename = basename($img);
                    $imgSourcePath = __DIR__ . '/../uploads/' . $imgFilename;
                    
                    // Organized structure: /images/products/{category-slug}/{product-slug}/
                    $relPath = '/images/products/' . $categorySlug . '/' . $slug . '/';
                    $imgTargetPath = __DIR__ . '/../../public' . $relPath . $imgFilename;
                    
                    $productsDir = dirname($imgTargetPath);
                    if (!is_dir($productsDir)) {
                        mkdir($productsDir, 0755, true);
                    }
                    if (file_exists($imgSourcePath)) {
                        copy($imgSourcePath, $imgTargetPath);
                    }
                    $convertedImages[] = $relPath . $imgFilename;
                } else {
                    $convertedImages[] = $img;
                }
            }
            $publicProduct['images'] = $convertedImages;
        }
        
        $publicProducts[] = $publicProduct;
    }
    
    // Write to public API products file
    $publicData = ['products' => $publicProducts];
    $publicJson = json_encode($publicData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $publicDir = dirname($publicProductsFile);
    if (!is_dir($publicDir)) {
        mkdir($publicDir, 0755, true);
    }
    file_put_contents($publicProductsFile, $publicJson);
    
    // Also sync to src/data for Next.js (preserve frontend-specific fields)
    // Read frontend products (to preserve extra fields)
    $frontendProducts = [];
    if (file_exists($frontendProductsFile)) {
        $frontendContent = file_get_contents($frontendProductsFile);
        $frontendProducts = json_decode($frontendContent, true) ?: [];
    }
    
    // Use admin as single source of truth but preserve structure
    $syncedProducts = [];
    foreach ($publicProducts as $pubProduct) {
        $syncedProduct = $pubProduct;
        
        // Re-find original admin product to get details defaults if needed
        $adminProduct = null;
        foreach ($adminProducts as $ap) {
            if ($ap['id'] === $pubProduct['id']) {
                $adminProduct = $ap;
                break;
            }
        }
        
        if ($adminProduct) {
             // Add default details if not present in admin
            if (!isset($adminProduct['details'])) {
                $syncedProduct['details'] = [
                    'material' => $adminProduct['material'] ?? '100% Premium Cotton',
                    'weave' => 'Handloom',
                    'fit' => 'Regular Fit',
                    'pattern' => 'Solid/Plain',
                    'origin' => 'Aluva, Kerala',
                    'dimensions' => '2.0m x 1.25m (Single)'
                ];
            } else {
                $syncedProduct['details'] = $adminProduct['details'];
            }
            
            // Add default careInstructions if not present in admin
            if (!isset($adminProduct['careInstructions'])) {
                $syncedProduct['careInstructions'] = [
                    'Hand wash separately in cold water',
                    'Do not bleach',
                    'Dry in shade',
                    'Iron on medium heat',
                    'Do not wring forcefully'
                ];
            }
        }
        
        $syncedProducts[] = $syncedProduct;
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



