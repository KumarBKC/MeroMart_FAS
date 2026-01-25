<?php
require_once 'db.php'; // Assumes db.php has the PDO connection $pdo

// Add CORS headers to allow cross-origin requests from frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function getProducts($pdo) {
    $stmt = $pdo->prepare("SELECT * FROM products ORDER BY created_at DESC");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respond($products);
}

function saveProduct($pdo, $input) {
    // Validate required fields
    $required = ['name', 'category', 'unit', 'selling_price', 'cost_price', 'stock', 'min_stock'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            respond(['error' => "Missing field: $field"], 400);
        }
    }

    // Validate non-negative numeric fields
    foreach (['selling_price', 'cost_price'] as $field) {
        if (!is_numeric($input[$field]) || $input[$field] < 0) {
            respond(['error' => "$field must be a non-negative number"], 400);
        }
    }
    foreach (['stock', 'min_stock'] as $field) {
        if (!is_numeric($input[$field]) || intval($input[$field]) < 0) {
            respond(['error' => "$field must be a non-negative integer"], 400);
        }
    }

    $id = $input['id'] ?? null;
    $now = date('Y-m-d H:i:s');
    $createdBy = $input['createdBy'] ?? null;
    $updatedBy = $input['updatedBy'] ?? null;

    if ($id) {
        // Update existing product
        try {
            $stmt = $pdo->prepare("UPDATE products SET 
                name = :name,
                category = :category,
                unit = :unit,
                selling_price = :selling_price,
                cost_price = :cost_price,
                stock = :stock,
                min_stock = :min_stock,
                barcode = :barcode,
                description = :description,
                updated_at = :updated_at,
                updated_by = :updated_by
                WHERE id = :id
            ");
            $stmt->execute([
                ':name' => $input['name'],
                ':category' => $input['category'],
                ':unit' => $input['unit'],
                ':selling_price' => $input['selling_price'],
                ':cost_price' => $input['cost_price'],
                ':stock' => intval($input['stock']),
                ':min_stock' => intval($input['min_stock']),
                ':barcode' => $input['barcode'] ?? null,
                ':description' => $input['description'] ?? null,
                ':updated_at' => $now,
                ':updated_by' => $updatedBy,
                ':id' => $id,
            ]);
            respond(['message' => 'Product updated']);
        } catch (PDOException $e) {
            respond(['error' => 'Database update failed: ' . $e->getMessage()], 500);
        }
    } else {
        // Insert new product
        try {
            $id = bin2hex(random_bytes(16)); // Generate 32 char hex id
            $stmt = $pdo->prepare("INSERT INTO products (
                id, name, category, unit, selling_price, cost_price, stock, min_stock, barcode, description, created_at, created_by
            ) VALUES (
                :id, :name, :category, :unit, :selling_price, :cost_price, :stock, :min_stock, :barcode, :description, :created_at, :created_by
            )");
            $stmt->execute([
                ':id' => $id,
                ':name' => $input['name'],
                ':category' => $input['category'],
                ':unit' => $input['unit'],
                ':selling_price' => $input['selling_price'],
                ':cost_price' => $input['cost_price'],
                ':stock' => intval($input['stock']),
                ':min_stock' => intval($input['min_stock']),
                ':barcode' => $input['barcode'] ?? null,
                ':description' => $input['description'] ?? null,
                ':created_at' => $now,
                ':created_by' => $createdBy,
            ]);
            respond(['message' => 'Product added', 'id' => $id]);
        } catch (PDOException $e) {
            respond(['error' => 'Database insert failed: ' . $e->getMessage()], 500);
        }
    }
}

function deleteProduct($pdo, $id) {
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
    $stmt->execute([':id' => $id]);
    respond(['message' => 'Product deleted']);
}

switch ($method) {
    case 'GET':
        getProducts($pdo);
        break;
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            respond(['error' => 'Invalid JSON'], 400);
        }
        saveProduct($pdo, $input);
        break;
    case 'DELETE':
        // Expect id as query param
        if (!isset($_GET['id'])) {
            respond(['error' => 'Missing id parameter'], 400);
        }
        deleteProduct($pdo, $_GET['id']);
        break;
    default:
        respond(['error' => 'Method not allowed'], 405);
}
?>
