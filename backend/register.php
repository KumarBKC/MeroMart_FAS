<?php
// Allow CORS for local frontend testing
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle OPTIONS requests early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json");
require_once "db.php";

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['name'], $data['email'], $data['password'], $data['role'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields"]);
    exit;
}

$name = trim($data['name']);
$email = strtolower(trim($data['email']));
$password = $data['password'];
$role = strtolower(trim($data['role']));

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid email format"]);
    exit;
}

// Validate role
$validRoles = ['admin', 'cashier'];
if (!in_array($role, $validRoles)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid role. Must be 'admin' or 'cashier'."]);
    exit;
}

// Check if user already exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(["error" => "Email already registered"]);
    exit;
}

// Generate employee_id: get max employee_id, increment by 1, format as 6-digit string
try {
    $stmtMax = $pdo->query("SELECT MAX(CAST(employee_id AS UNSIGNED)) AS max_id FROM users");
    $row = $stmtMax->fetch(PDO::FETCH_ASSOC);
    $maxId = $row['max_id'] ?? 0;
    $newEmployeeId = str_pad($maxId + 1, 6, '0', STR_PAD_LEFT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to generate employee ID: " . $e->getMessage()]);
    exit;
}

// Hash password
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Insert new user with employee_id
$stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, employee_id) VALUES (?, ?, ?, ?, ?)");
try {
    $stmt->execute([$name, $email, $hashedPassword, $role, $newEmployeeId]);
    http_response_code(201);
    echo json_encode(["message" => "User registered successfully", "role" => $role, "employee_id" => $newEmployeeId]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Registration failed: " . $e->getMessage()]);
}