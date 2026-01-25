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
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

try {
    $stmt = $pdo->query("SELECT * FROM receipts");
    $receipts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respond($receipts);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
    exit;
}
?>
