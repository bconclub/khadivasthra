<?php
/**
 * Authentication API
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/functions.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'login') {
        $password = $_POST['password'] ?? '';
        
        if (empty($password)) {
            jsonError('Password is required');
        }
        
        if (password_verify($password, ADMIN_PASSWORD_HASH)) {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['last_activity'] = time();
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            
            jsonSuccess('Login successful', [
                'csrf_token' => $_SESSION['csrf_token']
            ]);
        } else {
            jsonError('Invalid password', 401);
        }
    }
    
    if ($action === 'logout') {
        session_destroy();
        jsonSuccess('Logged out successfully');
    }
    
    if ($action === 'check') {
        if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
            jsonSuccess('Authenticated', [
                'csrf_token' => generateCSRF()
            ]);
        } else {
            jsonError('Not authenticated', 401);
        }
    }
    
    jsonError('Invalid action');
}

if ($method === 'GET') {
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        jsonSuccess('Authenticated', [
            'csrf_token' => generateCSRF()
        ]);
    } else {
        jsonError('Not authenticated', 401);
    }
}

jsonError('Method not allowed', 405);
?>



