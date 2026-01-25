<?php
header("Content-Type: application/json");
require_once "db.php";

// Allow CORS for local frontend testing
$allowedOrigins = ['http://localhost:3001', 'http://localhost', 'http://localhost:3000'];
if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Start session for authentication
session_start();

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Assuming sales product data is stored in a table named receipt_products or similar
        // Adjust table and column names as per your schema
        $stmt = $pdo->prepare("SELECT 
            id,
            receipt_id,
            product_name,
            quantity,
            price,
            total_price
            FROM receipt_products
            ORDER BY id DESC
        ");
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respond($products);
    } catch (Exception $e) {
        respond(['error' => 'Failed to fetch sales products: ' . $e->getMessage()], 500);
    }
} else {
    respond(['error' => 'Method not allowed'], 405);
}
?>
