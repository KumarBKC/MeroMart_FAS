<?php
header("Content-Type: application/json");
require_once "db.php";

// Allow CORS for local frontend testing
$allowedOrigins = ['http://localhost:3001', 'http://localhost'];
if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Start session for authentication
session_start();

// Get POST data
$input = file_get_contents("php://input");
error_log("Login request data: " . $input);
$data = json_decode($input, true);

if (!isset($data['email'], $data['password'])) {
    http_response_code(400);
    $errorMsg = "Missing required fields";
    echo json_encode(["error" => $errorMsg, "debug" => "Missing email or password in request"]);
    error_log("Missing required fields in login request");
    exit;
}

$email = trim($data['email']);
$password = $data['password'];

// Fetch user by email
$stmt = $pdo->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    $errorMsg = "Invalid email or password";
    echo json_encode(["error" => $errorMsg, "debug" => "User not found for email: " . $email]);
    error_log("User not found for email: " . $email);
    exit;
}

if (!password_verify($password, $user['password'])) {
    http_response_code(401);
    $errorMsg = "Invalid email or password";
    echo json_encode(["error" => $errorMsg, "debug" => "Password verification failed for user: " . $email]);
    error_log("Password verification failed for user: " . $email);
    exit;
}

// Set session variables
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_name'] = $user['name'];
$_SESSION['user_email'] = $user['email'];

echo json_encode([
    "message" => "Login successful",
    "user" => [
        "id" => $user['id'],
        "name" => $user['name'],
        "email" => $user['email']
    ]
]);
?>
