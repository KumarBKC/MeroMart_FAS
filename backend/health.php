<?php
// Include centralized CORS configuration
require_once "cors.php";

$response = [
    "status" => "ok",
    "timestamp" => date('Y-m-d H:i:s'),
    "php_version" => PHP_VERSION,
    "server" => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
];

try {
    require_once "db.php";
    $response["database"] = "connected";
    
    // Check if bills table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'bills'");
    $response["bills_table"] = $stmt->rowCount() > 0 ? "exists" : "missing";
    
    // Check if bill_items table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'bill_items'");
    $response["bill_items_table"] = $stmt->rowCount() > 0 ? "exists" : "missing";
    
} catch (Exception $e) {
    $response["database"] = "error";
    $response["database_error"] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?> 