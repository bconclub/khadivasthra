<?php
/**
 * Image Upload API
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/../includes/auth-check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

if (!isset($_FILES['image'])) {
    jsonError('No file uploaded');
}

$result = uploadImage($_FILES['image'], 'product');

if ($result['success']) {
    jsonSuccess('Image uploaded successfully', [
        'path' => $result['path'],
        'filename' => $result['filename']
    ]);
} else {
    jsonError($result['error']);
}
?>



