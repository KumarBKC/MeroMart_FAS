<?php
header('Content-Type: application/json');
require_once 'db.php';
session_start();

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function isAuthenticated() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

if (!isAuthenticated()) {
    respond(['error' => 'Unauthorized'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['action'])) {
        $action = $input['action'];
    }
}

try {
    // --- USERS ---
    if ($action === 'get_users') {
        $stmt = $pdo->query('SELECT id, name, email, role, phone, address, created_at, is_active FROM users');
        respond($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    if ($action === 'add_user') {
        if (!isAdmin()) respond(['error' => 'Forbidden'], 403);
        $user = $input['user'] ?? [];
        $sql = 'INSERT INTO users (name, email, password, role, phone, address, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $user['name'],
            $user['email'],
            password_hash($user['password'], PASSWORD_BCRYPT),
            $user['role'],
            $user['phone'] ?? null,
            $user['address'] ?? null
        ]);
        respond(['message' => 'User added']);
    }
    if ($action === 'edit_user') {
        if (!isAdmin()) respond(['error' => 'Forbidden'], 403);
        $user = $input['user'] ?? [];
        $sql = 'UPDATE users SET name=?, email=?, role=?, phone=?, address=?, is_active=? WHERE id=?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $user['name'],
            $user['email'],
            $user['role'],
            $user['phone'] ?? null,
            $user['address'] ?? null,
            $user['is_active'] ?? 1,
            $user['id']
        ]);
        respond(['message' => 'User updated']);
    }
    if ($action === 'delete_user') {
        if (!isAdmin()) respond(['error' => 'Forbidden'], 403);
        $id = $input['id'] ?? null;
        if (!$id) respond(['error' => 'Missing user id'], 400);
        $stmt = $pdo->prepare('DELETE FROM users WHERE id=?');
        $stmt->execute([$id]);
        respond(['message' => 'User deleted']);
    }

    // --- STORE SETTINGS ---
    if ($action === 'get_store_settings') {
        $stmt = $pdo->query('SELECT * FROM store_settings LIMIT 1');
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        respond($settings);
    }
    if ($action === 'update_store_settings') {
        if (!isAdmin()) respond(['error' => 'Forbidden'], 403);
        $settings = $input['settings'] ?? [];
        $sql = 'UPDATE store_settings SET store_name=?, store_address=?, store_phone=?, store_email=?, tax_rate=?, currency=?, bill_prefix=?, bill_start_number=?, bank_name=?, account_number=?, account_name=?, pan_vat_number=?, store_logo=?, bill_footer_message=?, enable_vat=?, low_stock_threshold=?, allow_negative_stock=?, default_user_role=?, date_format=?, currency_symbol=?, timezone=? WHERE id=?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $settings['store_name'],
            $settings['store_address'],
            $settings['store_phone'],
            $settings['store_email'],
            $settings['tax_rate'],
            $settings['currency'],
            $settings['bill_prefix'],
            $settings['bill_start_number'],
            $settings['bank_name'],
            $settings['account_number'],
            $settings['account_name'],
            $settings['pan_vat_number'],
            $settings['store_logo'],
            $settings['bill_footer_message'],
            $settings['enable_vat'],
            $settings['low_stock_threshold'],
            $settings['allow_negative_stock'],
            $settings['default_user_role'],
            $settings['date_format'],
            $settings['currency_symbol'],
            $settings['timezone'],
            $settings['id']
        ]);
        respond(['message' => 'Store settings updated']);
    }
    // Password change endpoint (placeholder)
    if ($action === 'change_password') {
        $user_id = $_SESSION['user_id'];
        $old = $input['old_password'] ?? '';
        $new = $input['new_password'] ?? '';
        if (!$old || !$new) respond(['error' => 'Missing password'], 400);
        $stmt = $pdo->prepare('SELECT password FROM users WHERE id=?');
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || !password_verify($old, $row['password'])) respond(['error' => 'Incorrect old password'], 403);
        $stmt = $pdo->prepare('UPDATE users SET password=? WHERE id=?');
        $stmt->execute([password_hash($new, PASSWORD_BCRYPT), $user_id]);
        respond(['message' => 'Password changed']);
    }
    // User login restrictions (placeholder)
    if ($action === 'set_login_restrictions') {
        // Implement as needed
        respond(['message' => 'Login restrictions updated (not implemented)']);
    }

    // --- CATEGORIES ---
    if ($action === 'get_categories') {
        $stmt = $pdo->query('SELECT * FROM expense_categories');
        respond($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    if ($action === 'add_category') {
        if (!isAdmin()) respond(['error' => 'Forbidden'], 403);
        $cat = $input['category'] ?? [];
        $sql = 'INSERT INTO expense_categories (name, description, color, is_active) VALUES (?, ?, ?, ?)';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $cat['name'],
            $cat['description'] ?? '',
            $cat['color'] ?? '#3B82F6',
            $cat['is_active'] ?? 1
        ]);
        respond(['message' => 'Category added']);
    }
    if ($action === 'edit_category') {
        if (!isAdmin()) respond(['error' => 'Forbidden'], 403);
        $cat = $input['category'] ?? [];
        $sql = 'UPDATE expense_categories SET name=?, description=?, color=?, is_active=? WHERE id=?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $cat['name'],
            $cat['description'] ?? '',
            $cat['color'] ?? '#3B82F6',
            $cat['is_active'] ?? 1,
            $cat['id']
        ]);
        respond(['message' => 'Category updated']);
    }
    if ($action === 'delete_category') {
        if (!isAdmin()) respond(['error' => 'Forbidden'], 403);
        $id = $input['id'] ?? null;
        if (!$id) respond(['error' => 'Missing category id'], 400);
        $stmt = $pdo->prepare('DELETE FROM expense_categories WHERE id=?');
        $stmt->execute([$id]);
        respond(['message' => 'Category deleted']);
    }

    // --- DEFAULT: Invalid action ---
    respond(['error' => 'Invalid action'], 400);
} catch (Exception $e) {
    error_log('Settings API error: ' . $e->getMessage());
    respond(['error' => 'Internal server error'], 500);
} 