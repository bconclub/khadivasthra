<?php
/**
 * Authentication Check
 * Khadi Vasthra Admin Panel
 * 
 * NOTE: Authentication is disabled - admin panel is freely accessible
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

/**
 * Check if user is authenticated
 * DISABLED - Always returns true
 */
function checkAuth() {
    // Authentication disabled - always allow access
    return true;
}

// Auto-check disabled - no authentication required
// if (strpos($_SERVER['REQUEST_URI'], '/api/') === false && 
//     basename($_SERVER['PHP_SELF']) !== 'index.php') {
//     checkAuth();
// }
?>



