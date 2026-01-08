<?php
/**
 * Admin Authentication API for Khadi Vasthra
 * Simple password-based authentication
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

// Default admin password (change this in production!)
$adminPassword = 'khadivasthra2024';

// Get input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

$password = $input['password'] ?? '';

if (empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password is required']);
    exit;
}

// Verify password
if ($password === $adminPassword) {
    // Generate a simple token (in production, use proper JWT)
    $token = base64_encode(json_encode([
        'authenticated' => true,
        'timestamp' => time(),
        'expires' => time() + (24 * 60 * 60) // 24 hours
    ]));
    
    echo json_encode([
        'success' => true,
        'message' => 'Authentication successful',
        'token' => $token
    ]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid password']);
}
