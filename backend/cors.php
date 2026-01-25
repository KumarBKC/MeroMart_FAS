<?php
/**
 * CORS Configuration for MeroMart API
 * Include this file at the top of all API endpoints
 */

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Set CORS headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    // Allow requests from specific origins in production
    $allowedOrigins = [
        'http://localhost:3000',  // Next.js development server
        'http://localhost:3001',  // Alternative Next.js port
        'http://127.0.0.1:3000',  // Alternative localhost
        'http://127.0.0.1:3001',  // Alternative localhost port
        'http://localhost',       // Apache server
        'http://127.0.0.1'        // Alternative localhost
    ];
    
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowedOrigins)) {
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    } else {
        header("Access-Control-Allow-Origin: *");
    }
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400"); // 24 hours

// Set content type for JSON responses
header("Content-Type: application/json; charset=utf-8");
?> 