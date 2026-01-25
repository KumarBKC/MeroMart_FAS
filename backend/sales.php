<?php
header("Content-Type: application/json");
require_once "db.php";

// CORS Configuration
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

function isAuthenticated() {
    return isset($_SESSION['user_id']);
}

// Authentication for all routes
if (!isAuthenticated()) {
    respond(["error" => "Unauthorized"], 401);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['productName', 'invoiceNumber', 'dateSold', 'amount', 'category', 'user'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            respond(["error" => "Missing field: $field"], 400);
            exit;
        }
    }

    // Validate amount
    $amount = filter_var($input['amount'], FILTER_VALIDATE_FLOAT);
    if ($amount === false) {
        respond(["error" => "Invalid amount"], 400);
        exit;
    }

    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['dateSold'])) {
        respond(["error" => "Invalid date format. Use YYYY-MM-DD"], 400);
        exit;
    }

    try {
        $sql = "INSERT INTO sales (product_name, invoice_number, date_sold, amount, category, user)
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            htmlspecialchars($input['productName']),
            htmlspecialchars($input['invoiceNumber']),
            $input['dateSold'],
            $amount,
            htmlspecialchars($input['category']),
            htmlspecialchars($input['user'])
        ]);
        respond(["message" => "Sale added successfully"], 201);
    } catch (Exception $e) {
        error_log("POST Error: " . $e->getMessage());
        respond(["error" => "Internal server error"], 500);
    }
    exit;
}

// GET Request Handling
$period = $_GET['period'] ?? 'all';
$search = $_GET['search'] ?? '';

// Validate period
$valid_periods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all'];
if (!in_array($period, $valid_periods)) {
    respond(["error" => "Invalid period parameter"], 400);
    exit;
}

// Build date filter for sales table
$date_filter = "1=1";
$params = [];
switch ($period) {
    case 'daily':
        $date_filter = "DATE(date_sold) = CURDATE()";
        break;
    case 'weekly':
        $date_filter = "YEARWEEK(date_sold, 1) = YEARWEEK(CURDATE(), 1)";
        break;
    case 'monthly':
        $date_filter = "YEAR(date_sold) = YEAR(CURDATE()) AND MONTH(date_sold) = MONTH(CURDATE())";
        break;
    case 'quarterly':
        $currentMonth = date('n');
        $currentQuarter = ceil($currentMonth / 3);
        $startMonth = ($currentQuarter - 1) * 3 + 1;
        $endMonth = $startMonth + 2;
        $date_filter = "YEAR(date_sold) = YEAR(CURDATE()) AND MONTH(date_sold) BETWEEN ? AND ?";
        $params[] = $startMonth;
        $params[] = $endMonth;
        break;
    case 'yearly':
        $date_filter = "YEAR(date_sold) = YEAR(CURDATE())";
        break;
    case 'all':
        $date_filter = "1=1";
        break;
}

// Prepare search filter
$search_filter = "";
if (!empty($search)) {
    $search_filter = " AND (product_name LIKE ? OR category LIKE ? OR user LIKE ? OR invoice_number LIKE ?)";
    $search_param = "%" . $search . "%";
    $search_params = array_fill(0, 4, $search_param);
    $params = array_merge($params, $search_params);
}

try {
    // Fetch sales data from sales table
    $sql = "SELECT id, product_name, invoice_number, date_sold, amount, category, user FROM sales WHERE $date_filter $search_filter ORDER BY date_sold DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respond($sales);
} catch (Exception $e) {
    error_log("GET Error: " . $e->getMessage() . ' | SQL: ' . $sql . ' | Params: ' . json_encode($params));
    respond(["error" => "Internal server error"], 500);
}
