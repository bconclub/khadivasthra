<?php
/**
 * Image Upload API
 * Khadi Vasthra Admin Panel
 *
 * Uploads images to organized folder structure:
 * /images/products/{category-slug}/{product-slug}/{filename}.{ext}
 */

require_once __DIR__ . '/../includes/auth-check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

if (!isset($_FILES['image'])) {
    jsonError('No file uploaded');
}

// Get category and product name for folder structure
$category = sanitize($_POST['category'] ?? '');
$productName = sanitize($_POST['productName'] ?? '');

$result = uploadImage($_FILES['image'], 'product', $category, $productName);

if ($result['success']) {
    jsonSuccess('Image uploaded successfully', [
        'path' => $result['path'],
        'filename' => $result['filename']
    ]);
} else {
    jsonError($result['error']);
}
?>
