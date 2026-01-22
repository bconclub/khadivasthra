<?php
/**
 * Image Upload API for Khadi Vasthra
 * Works with static export in /out/api/
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Determine upload type: 'main' for product images, 'gallery' for gallery images
$uploadType = $_POST['type'] ?? 'main'; // 'main' or 'gallery'
$productId = $_POST['productId'] ?? null; // Product ID for organized naming
$productName = $_POST['productName'] ?? null; // Product name/title for filename

// Set upload directory based on type
if ($uploadType === 'gallery') {
    $uploadDir = __DIR__ . '/../images/products/gallery/';
} else {
    $uploadDir = __DIR__ . '/../images/products/';
}

// Create directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Check if file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds server limit',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit',
        UPLOAD_ERR_PARTIAL => 'File partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temp folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write',
        UPLOAD_ERR_EXTENSION => 'Upload blocked'
    ];
    
    $errorCode = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
    $errorMsg = $errorMessages[$errorCode] ?? 'Unknown error';
    
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $errorMsg]);
    exit;
}

$file = $_FILES['image'];

// Validate file type
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Allowed: JPG, PNG, WebP, GIF']);
    exit;
}

// Validate file size (max 5MB)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File too large. Max: 5MB']);
    exit;
}

// Get file extension
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
    $ext = 'jpg'; // Default
}

// Generate filename based on product name (preferred) or product ID
$slug = null;
if ($productName) {
    // Create slug from product name: convert to lowercase, replace spaces with hyphens, remove special chars
    $slug = strtolower(trim($productName));
    $slug = preg_replace('/[^\w\s-]/', '', $slug); // Remove special characters
    $slug = preg_replace('/\s+/', '-', $slug); // Replace spaces with hyphens
    $slug = preg_replace('/-+/', '-', $slug); // Replace multiple hyphens with single
    $slug = trim($slug, '-'); // Remove leading/trailing hyphens
}

// Generate filename based on upload type
if ($uploadType === 'gallery' && ($slug || $productId)) {
    // Gallery images: product-name-slug_1.jpg or productId_1.jpg
    $prefix = $slug ?: $productId;
    $existingFiles = glob($uploadDir . $prefix . '_*.' . $ext);
    $index = count($existingFiles) + 1;
    $filename = $prefix . '_' . $index . '.' . $ext;
} elseif ($slug) {
    // Main product image: product-name-slug.jpg (preferred)
    $filename = $slug . '.' . $ext;
} elseif ($productId) {
    // Fallback: productId.jpg
    $filename = $productId . '.' . $ext;
} else {
    // Final fallback: unique filename
    $filename = uniqid() . '-' . preg_replace('/[^a-z0-9.]/', '-', strtolower(pathinfo($file['name'], PATHINFO_FILENAME))) . '.' . $ext;
}

$filepath = $uploadDir . $filename;

// Move uploaded file
if (move_uploaded_file($file['tmp_name'], $filepath)) {
    if ($uploadType === 'gallery') {
        $publicPath = '/images/products/gallery/' . $filename;
    } else {
        $publicPath = '/images/products/' . $filename;
    }
    echo json_encode([
        'success' => true,
        'path' => $publicPath,
        'filename' => $filename,
        'type' => $uploadType
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
}
