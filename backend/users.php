<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->query('SELECT id, name, email, role, employee_id, store_id, phone, address, created_at, last_active, is_active FROM users');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($users);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch users: ' . $e->getMessage()]);
    exit;
} 