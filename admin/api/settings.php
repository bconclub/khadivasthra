<?php
/**
 * Settings API
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/../includes/auth-check.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET - Get settings
if ($method === 'GET') {
    $data = readJSON(SETTINGS_FILE);
    if (empty($data)) {
        // Default settings
        $data = [
            'storeName' => 'Khadi Vasthra',
            'whatsapp' => '',
            'address' => '',
            'email' => '',
            'instagram' => ''
        ];
    }
    jsonResponse($data);
}

// POST - Update settings
if ($method === 'POST') {
    validateCSRF($_POST['csrf_token'] ?? '');
    
    $settings = [
        'storeName' => sanitize($_POST['storeName'] ?? ''),
        'whatsapp' => sanitize($_POST['whatsapp'] ?? ''),
        'address' => sanitize($_POST['address'] ?? ''),
        'email' => sanitize($_POST['email'] ?? ''),
        'instagram' => sanitize($_POST['instagram'] ?? '')
    ];
    
    if (writeJSON(SETTINGS_FILE, $settings)) {
        jsonSuccess('Settings updated successfully', $settings);
    } else {
        jsonError('Failed to update settings');
    }
}

jsonError('Method not allowed', 405);
?>



