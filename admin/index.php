<?php
/**
 * Admin Entry Point
 * Khadi Vasthra Admin Panel
 * 
 * NOTE: Login disabled - redirects directly to dashboard
 */

require_once __DIR__ . '/includes/config.php';

// Redirect directly to dashboard (no login required)
header('Location: dashboard.php');
exit;
?>



