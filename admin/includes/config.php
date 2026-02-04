<?php
/**
 * Admin Configuration
 * Khadi Vasthra Admin Panel
 */

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
// Auto-detect HTTPS for cookie security
$isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
ini_set('session.cookie_secure', $isSecure ? 1 : 0);

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Admin password (change this!)
// Default password: admin123
// Generate hash: password_hash('your_password', PASSWORD_DEFAULT)
define('ADMIN_PASSWORD_HASH', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'); // admin123

// Session timeout (30 minutes)
define('SESSION_TIMEOUT', 1800);

// File paths
define('DATA_DIR', __DIR__ . '/../data/');
define('UPLOADS_DIR', __DIR__ . '/../uploads/');
define('PRODUCTS_FILE', DATA_DIR . 'products.json');
define('CATEGORIES_FILE', DATA_DIR . 'categories.json');
define('SETTINGS_FILE', DATA_DIR . 'settings.json');

// Upload settings
define('MAX_FILE_SIZE', 2 * 1024 * 1024); // 2MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'webp', 'gif']);

// CORS headers for Next.js frontend
// For same-domain setup, use specific origin instead of *
$is_https = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$protocol = $is_https ? 'https://' : 'http://';
$allowed_origin = $_SERVER['HTTP_ORIGIN'] ?? $protocol . ($_SERVER['HTTP_HOST'] ?? 'localhost');
header('Access-Control-Allow-Origin: ' . $allowed_origin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Timezone
date_default_timezone_set('Asia/Kolkata');
?>



