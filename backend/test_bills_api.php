<?php
// Simple test to check if bills API is working
header("Content-Type: application/json");

// Test database connection
try {
    require_once "db.php";
    echo json_encode([
        "status" => "success",
        "message" => "Database connection successful",
        "timestamp" => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $e->getMessage(),
        "timestamp" => date('Y-m-d H:i:s')
    ]);
}
?> 