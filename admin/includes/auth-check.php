<?php
/**
 * Authentication Check
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

/**
 * Check if user is authenticated
 */
function checkAuth() {
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        if (strpos($_SERVER['REQUEST_URI'], '/api/') !== false) {
            jsonError('Unauthorized', 401);
        } else {
            header('Location: /admin/index.php');
            exit;
        }
    }

    // Check session timeout
    if (isset($_SESSION['last_activity'])) {
        if (time() - $_SESSION['last_activity'] > SESSION_TIMEOUT) {
            session_destroy();
            if (strpos($_SERVER['REQUEST_URI'], '/api/') !== false) {
                jsonError('Session expired', 401);
            } else {
                header('Location: /admin/index.php?expired=1');
                exit;
            }
        }
    }

    // Update last activity
    $_SESSION['last_activity'] = time();
}

// Auto-check for non-API pages
if (strpos($_SERVER['REQUEST_URI'], '/api/') === false && 
    basename($_SERVER['PHP_SELF']) !== 'index.php') {
    checkAuth();
}
?>



