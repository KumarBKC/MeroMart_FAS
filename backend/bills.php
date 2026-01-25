<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');

// Include centralized CORS configuration
require_once "cors.php";

// Add request logging
error_log("Bills API called: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);

// Add global exception handler at the top
set_exception_handler(function($e) {
    http_response_code(500);
    error_log("Uncaught Exception: " . $e->getMessage());
    echo json_encode(["error" => "Server error: " . $e->getMessage()]);
    exit;
});

try {
    require_once "db.php";
} catch (Exception $e) {
    http_response_code(500);
    error_log("Database connection failed: " . $e->getMessage());
    echo json_encode([
        "error" => "Database connection failed",
        "details" => $e->getMessage(),
        "timestamp" => date('Y-m-d H:i:s')
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            try {
                // Check if bills table exists
                $stmt = $pdo->query("SHOW TABLES LIKE 'bills'");
                if ($stmt->rowCount() == 0) {
                    // Create the bills table if it doesn't exist
                    $createTableSQL = "CREATE TABLE IF NOT EXISTS bills (
                        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                        bill_number VARCHAR(50) NOT NULL UNIQUE,
                        customer_name VARCHAR(255) NOT NULL,
                        customer_phone VARCHAR(50) DEFAULT NULL,
                        customer_address TEXT DEFAULT NULL,
                        subtotal DECIMAL(10,2) NOT NULL,
                        discount DECIMAL(10,2) NOT NULL,
                        discount_type ENUM('amount', 'percentage') DEFAULT 'amount',
                        vat_rate DECIMAL(5,2) NOT NULL,
                        vat_amount DECIMAL(10,2) NOT NULL,
                        net_amount DECIMAL(10,2) NOT NULL,
                        date_time DATETIME NOT NULL,
                        status ENUM('paid', 'pending', 'cancelled') NOT NULL,
                        payment_method VARCHAR(50) DEFAULT NULL,
                        notes TEXT DEFAULT NULL,
                        cashier_id VARCHAR(255) DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                    
                    $pdo->exec($createTableSQL);
                    error_log("Bills table created");
                }

                // Check if bill_items table exists
                $stmt = $pdo->query("SHOW TABLES LIKE 'bill_items'");
                if ($stmt->rowCount() == 0) {
                    // Create the bill_items table if it doesn't exist
                    $createItemsTableSQL = "CREATE TABLE IF NOT EXISTS bill_items (
                        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                        bill_id INT UNSIGNED NOT NULL,
                        product_id INT UNSIGNED NOT NULL,
                        product_name VARCHAR(255) NOT NULL,
                        quantity INT NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        total_price DECIMAL(10,2) NOT NULL,
                        PRIMARY KEY (id),
                        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
                        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                    
                    $pdo->exec($createItemsTableSQL);
                    error_log("Bill_items table created");
                }

                // Fetch bills, optionally filter by status or search term
                $status = $_GET['status'] ?? '';
                $search = $_GET['search'] ?? '';

                $sql = "SELECT bill_id, bill_number, customer_name, customer_phone, customer_address, subtotal, discount, discount_type, vat_rate, vat_amount, net_amount, date_time, status, payment_method, notes, cashier_id FROM bills WHERE 1=1";
                $params = [];

                if ($status !== '' && in_array($status, ['paid', 'pending', 'cancelled'])) {
                    $sql .= " AND status = ?";
                    $params[] = $status;
                }

                if ($search !== '') {
                    $sql .= " AND (customer_name LIKE ? OR bill_number LIKE ?)";
                    $searchParam = "%$search%";
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                }

                $sql .= " ORDER BY date_time DESC";

                $stmt = $pdo->prepare($sql);
                if (!$stmt) {
                    throw new Exception("Failed to prepare statement");
                }
                $stmt->execute($params);
                $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Fetch bill items for each bill
                foreach ($bills as &$bill) {
                    $stmtItems = $pdo->prepare("SELECT * FROM bill_items WHERE bill_id = ?");
                    if (!$stmtItems) {
                        throw new Exception("Failed to prepare statement for bill items");
                    }
                    $stmtItems->execute([$bill['bill_id']]);
                    $bill['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
                }

                error_log("Successfully fetched " . count($bills) . " bills");
                echo json_encode($bills);
            } catch (Exception $e) {
                http_response_code(500);
                error_log("Error fetching bills: " . $e->getMessage());
                echo json_encode([
                    "error" => "Server error: " . $e->getMessage(),
                    "timestamp" => date('Y-m-d H:i:s')
                ]);
            }
            break;

        case 'POST':
            // Create new bill with items
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid JSON"]);
                exit;
            }

            // Validate required fields
            $required = ['customer_name', 'subtotal', 'net_amount', 'date_time', 'status'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                    http_response_code(400);
                    echo json_encode(["error" => "Missing required field: $field"]);
                    exit;
                }
            }

            try {
                $pdo->beginTransaction();

                // Check if bill_number is provided and unique
                $bill_number = $data['bill_number'] ?? '';
                $exists = false;
                if ($bill_number) {
                    $stmt = $pdo->prepare("SELECT COUNT(*) FROM bills WHERE bill_number = ?");
                    $stmt->execute([$bill_number]);
                    $stmt->bindColumn(1, $count);
                    $stmt->fetch();
                    $exists = $count > 0;
                }
                if (!$bill_number || $exists) {
                    $bill_number = getNextBillNumber($pdo);
                }

                // Insert bill
                $sqlBill = "INSERT INTO bills (bill_number, customer_name, customer_phone, customer_address, subtotal, discount, discount_type, vat_rate, vat_amount, net_amount, date_time, status, payment_method, notes, cashier_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                $stmtBill = $pdo->prepare($sqlBill);
                if (!$stmtBill->execute([
                    $bill_number,
                    $data['customer_name'],
                    $data['customer_phone'] ?? null,
                    $data['customer_address'] ?? null,
                    $data['subtotal'],
                    $data['discount'],
                    $data['discount_type'],
                    $data['vat_rate'],
                    $data['vat_amount'],
                    $data['net_amount'],
                    $data['date_time'],
                    $data['status'],
                    $data['payment_method'] ?? null,
                    $data['notes'] ?? null,
                    $data['cashier_id'] ?? null,
                ])) {
                    throw new Exception("Bill insert failed: " . implode(", ", $stmtBill->errorInfo()));
                }

                $billId = $pdo->lastInsertId();

                // Insert bill items
                if (!empty($data['items']) && is_array($data['items'])) {
                    $sqlItem = "INSERT INTO bill_items (bill_id, product_id, product_name, quantity, price, total_price) VALUES (?, ?, ?, ?, ?, ?)";
                    $stmtItem = $pdo->prepare($sqlItem);

                    foreach ($data['items'] as $item) {
                        if (!$stmtItem->execute([
                            $billId,
                            $item['product_id'],
                            $item['product_name'],
                            $item['quantity'],
                            $item['price'],
                            $item['total_price'],
                        ])) {
                            throw new Exception("Bill item insert failed: " . implode(", ", $stmtItem->errorInfo()));
                        }
                        // Insert into sales table
                        $sqlSale = "INSERT INTO sales (product_name, invoice_number, date_sold, amount, category, user) VALUES (?, ?, ?, ?, ?, ?)";
                        $stmtSale = $pdo->prepare($sqlSale);
                        $category = null;
                        // Try to get category from products table
                        $stmtCat = $pdo->prepare("SELECT category FROM products WHERE id = ?");
                        if ($stmtCat->execute([$item['product_id']])) {
                            $catRow = $stmtCat->fetch(PDO::FETCH_ASSOC);
                            $category = $catRow ? $catRow['category'] : null;
                        }
                        $cashierName = $data['cashier_id'] ?? null;
                        $stmtSale->execute([
                            $item['product_name'],
                            $bill_number,
                            date('Y-m-d', strtotime($data['date_time'])),
                            $item['total_price'],
                            $category,
                            $cashierName
                        ]);
                    }
                }

                $pdo->commit();

                http_response_code(201);
                echo json_encode(["message" => "Bill created", "bill_id" => $billId]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                error_log("Error creating bill: " . $e->getMessage());
                echo json_encode(["error" => "Server error: " . $e->getMessage()]);
            }
            break;

        case 'PUT':
        case 'PATCH':
            // Update bill and items
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data || !isset($data['bill_id'])) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid JSON or missing bill id"]);
                exit;
            }

            $billId = $data['bill_id'];

            // Update bill
            $sqlUpdate = "UPDATE bills SET bill_number = ?, customer_name = ?, customer_phone = ?, customer_address = ?, subtotal = ?, discount = ?, discount_type = ?, vat_rate = ?, vat_amount = ?, net_amount = ?, date_time = ?, status = ?, payment_method = ?, notes = ?, cashier_id = ? WHERE bill_id = ?";

            $stmtUpdate = $pdo->prepare($sqlUpdate);
            $stmtUpdate->execute([
                $data['bill_number'],
                $data['customer_name'],
                $data['customer_phone'] ?? null,
                $data['customer_address'] ?? null,
                $data['subtotal'],
                $data['discount'],
                $data['discount_type'],
                $data['vat_rate'],
                $data['vat_amount'],
                $data['net_amount'],
                $data['date_time'],
                $data['status'],
                $data['payment_method'] ?? null,
                $data['notes'] ?? null,
                $data['cashier_id'] ?? null,
                $billId,
            ]);

            // Delete existing items
            $stmtDeleteItems = $pdo->prepare("DELETE FROM bill_items WHERE bill_id = ?");
            $stmtDeleteItems->execute([$billId]);

            // Delete sales records for this bill
            $stmtDeleteSales = $pdo->prepare("DELETE FROM sales WHERE invoice_number = ?");
            $stmtDeleteSales->execute([$data['bill_number']]);

            // Insert new items
            if (!empty($data['items']) && is_array($data['items'])) {
                $sqlItem = "INSERT INTO bill_items (bill_id, product_id, product_name, quantity, price, total_price) VALUES (?, ?, ?, ?, ?, ?)";
                $stmtItem = $pdo->prepare($sqlItem);

                foreach ($data['items'] as $item) {
                    $stmtItem->execute([
                        $billId,
                        $item['product_id'],
                        $item['product_name'],
                        $item['quantity'],
                        $item['price'],
                        $item['total_price'],
                    ]);
                    // Insert into sales table
                    $sqlSale = "INSERT INTO sales (product_name, invoice_number, date_sold, amount, category, user) VALUES (?, ?, ?, ?, ?, ?)";
                    $stmtSale = $pdo->prepare($sqlSale);
                    $category = null;
                    // Try to get category from products table
                    $stmtCat = $pdo->prepare("SELECT category FROM products WHERE id = ?");
                    if ($stmtCat->execute([$item['product_id']])) {
                        $catRow = $stmtCat->fetch(PDO::FETCH_ASSOC);
                        $category = $catRow ? $catRow['category'] : null;
                    }
                    $cashierName = $data['cashier_id'] ?? null;
                    $stmtSale->execute([
                        $item['product_name'],
                        $data['bill_number'],
                        date('Y-m-d', strtotime($data['date_time'])),
                        $item['total_price'],
                        $category,
                        $cashierName
                    ]);
                }
            }

            echo json_encode(["message" => "Bill updated"]);
            break;

        case 'DELETE':
            // Delete bill and cascade delete items
            $billId = $_GET['bill_id'] ?? null;

            if (!$billId) {
                http_response_code(400);
                echo json_encode(["error" => "Missing bill id"]);
                exit;
            }

            // Get bill number before deleting
            $stmtGetBill = $pdo->prepare("SELECT bill_number FROM bills WHERE bill_id = ?");
            $stmtGetBill->execute([$billId]);
            $bill = $stmtGetBill->fetch(PDO::FETCH_ASSOC);
            if ($bill) {
                $stmtDeleteSales = $pdo->prepare("DELETE FROM sales WHERE invoice_number = ?");
                $stmtDeleteSales->execute([$bill['bill_number']]);
            }

            $stmtDelete = $pdo->prepare("DELETE FROM bills WHERE bill_id = ?");
            $stmtDelete->execute([$billId]);

            echo json_encode(["message" => "Bill deleted"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error: " . $e->getMessage()]);
    exit;
}

// When inserting a new bill, ensure bill_number is unique and auto-incremented
function getNextBillNumber($conn) {
    $prefix = 'B-';
    $start = 1000;
    $max = $start - 1;
    $used = array();
    $stmt = $conn->query("SELECT bill_number FROM bills WHERE bill_number LIKE 'B%' ");
    if ($stmt) {
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $bill_number = $row['bill_number'];
            // Accept both B-1000 and B1000
            if (preg_match('/^B-?(\d+)$/', $bill_number, $matches)) {
                $num = intval($matches[1]);
                $used[$num] = true;
                if ($num > $max) $max = $num;
            }
        }
    }
    $next = $max + 1;
    while (isset($used[$next])) {
        $next++;
    }
    return $prefix . $next;
}
