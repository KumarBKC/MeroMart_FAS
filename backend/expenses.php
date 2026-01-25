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
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
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

// Add API to add new expense category
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'addExpenseCategory') {
    if (!isAuthenticated()) {
        respond(['error' => 'Unauthorized'], 401);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['name']) || trim($input['name']) === '') {
        respond(['error' => 'Category name is required'], 400);
    }
    $name = trim($input['name']);
    $description = $input['description'] ?? '';
    $color = $input['color'] ?? '#6B7280';
    $isActive = true;

    // Check if category already exists
    $stmtCheck = $pdo->prepare("SELECT id FROM expense_categories WHERE LOWER(name) = LOWER(?)");
    $stmtCheck->execute([$name]);
    if ($stmtCheck->fetch()) {
        respond(['error' => 'Category already exists'], 409);
    }

    // Insert new category
    $stmtInsert = $pdo->prepare("INSERT INTO expense_categories (name, description, color, is_active) VALUES (?, ?, ?, ?)");
    try {
        $stmtInsert->execute([$name, $description, $color, $isActive]);
        respond(['message' => 'Category added']);
    } catch (PDOException $e) {
        respond(['error' => 'Failed to add category: ' . $e->getMessage()], 500);
    }
}

function getExpenses($pdo) {
    $stmt = $pdo->prepare("SELECT 
        id,
        description,
        category,
        amount,
        date,
        payment_method AS paymentMethod,
        vendor,
        notes,
        is_recurring AS isRecurring,
        recurring_frequency AS recurringFrequency,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_by AS updatedBy,
        updated_at AS updatedAt
        FROM expenses ORDER BY date DESC");
    $stmt->execute();
    $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respond($expenses);
}

function saveExpense($pdo, $input) {
    if (!isAuthenticated()) {
        respond(['error' => 'Unauthorized'], 401);
    }

    $required = ['description', 'category', 'amount', 'date', 'payment_method'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            respond(['error' => "Missing field: $field"], 400);
        }
    }

    if (!is_numeric($input['amount']) || $input['amount'] < 0) {
        respond(['error' => "Amount must be a non-negative number"], 400);
    }

    $now = date('Y-m-d H:i:s');
    $userId = $_SESSION['user_id'];
    $userName = $_SESSION['user_name'];

    if (isset($input['id']) && !empty($input['id'])) {
        // Update existing expense
        try {
            $stmt = $pdo->prepare("UPDATE expenses SET 
                description = :description,
                category = :category,
                amount = :amount,
                date = :date,
                payment_method = :payment_method,
                vendor = :vendor,
                notes = :notes,
                is_recurring = :is_recurring,
                recurring_frequency = :recurring_frequency,
                updated_at = :updated_at,
                updated_by = :updated_by
                WHERE id = :id
            ");
            $stmt->execute([
                ':description' => $input['description'],
                ':category' => $input['category'],
                ':amount' => $input['amount'],
                ':date' => $input['date'],
                ':payment_method' => $input['payment_method'],
                ':vendor' => $input['vendor'] ?? null,
                ':notes' => $input['notes'] ?? null,
                ':is_recurring' => $input['is_recurring'] ?? false,
                ':recurring_frequency' => $input['recurring_frequency'] ?? null,
                ':updated_at' => $now,
                ':updated_by' => $userName,
                ':id' => $input['id'],
            ]);
            respond(['message' => 'Expense updated']);
        } catch (PDOException $e) {
            respond(['error' => 'Database update failed: ' . $e->getMessage()], 500);
        }
    } else {
        // Insert new expense
        try {
            $stmt = $pdo->prepare("INSERT INTO expenses (
                description, category, amount, date, payment_method, vendor, notes, is_recurring, recurring_frequency, created_at, created_by
            ) VALUES (
                :description, :category, :amount, :date, :payment_method, :vendor, :notes, :is_recurring, :recurring_frequency, :created_at, :created_by
            )");
            $stmt->execute([
                ':description' => $input['description'],
                ':category' => $input['category'],
                ':amount' => $input['amount'],
                ':date' => $input['date'],
                ':payment_method' => $input['payment_method'],
                ':vendor' => $input['vendor'] ?? null,
                ':notes' => $input['notes'] ?? null,
                ':is_recurring' => $input['is_recurring'] ?? false,
                ':recurring_frequency' => $input['recurring_frequency'] ?? null,
                ':created_at' => $now,
                ':created_by' => $userName,
            ]);
            respond(['message' => 'Expense added']);
        } catch (PDOException $e) {
            respond(['error' => 'Database insert failed: ' . $e->getMessage()], 500);
        }
    }
}

function deleteExpense($pdo, $id) {
    if (!isAuthenticated()) {
        respond(['error' => 'Unauthorized'], 401);
    }
    $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = :id");
    $stmt->execute([':id' => $id]);
    respond(['message' => 'Expense deleted']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'getExpenseCategories') {
    // Fetch expense categories from database
    try {
        $stmt = $pdo->prepare("SELECT id, name, description, color, is_active FROM expense_categories WHERE is_active = 1");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respond($categories);
    } catch (Exception $e) {
        respond(['error' => 'Failed to fetch expense categories'], 500);
    }
    exit;
}

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'getDistinctExpenseCategories') {
    // Fetch distinct categories from expenses table
    try {
        $stmt = $pdo->prepare("SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL AND category != ''");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        // Map to objects with id and name for frontend compatibility
        $result = array_map(function($cat) {
            return [
                'id' => $cat,
                'name' => $cat,
                'description' => '',
                'color' => '#6B7280',
                'isActive' => true,
            ];
        }, $categories);
        respond($result);
    } catch (Exception $e) {
        respond(['error' => 'Failed to fetch distinct expense categories'], 500);
    }
    exit;
}

switch ($method) {
    case 'GET':
        getExpenses($pdo);
        break;
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            respond(['error' => 'Invalid JSON'], 400);
        }
        saveExpense($pdo, $input);
        break;
    case 'DELETE':
        if (!isset($_GET['id'])) {
            respond(['error' => 'Missing id parameter'], 400);
        }
        deleteExpense($pdo, $_GET['id']);
        break;
    default:
        respond(['error' => 'Method not allowed'], 405);
}
