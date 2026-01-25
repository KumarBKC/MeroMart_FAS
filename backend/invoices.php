<?php
header("Content-Type: application/json");
require_once "db.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Fetch bills, optionally filter by status or search term
            $status = $_GET['status'] ?? '';
            $search = $_GET['search'] ?? '';

            $sql = "SELECT * FROM bills WHERE 1=1";
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
            $stmt->execute($params);
            $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch bill items for each bill
            foreach ($bills as &$bill) {
                $stmtItems = $pdo->prepare("SELECT * FROM bill_items WHERE bill_id = ?");
                $stmtItems->execute([$bill['id']]);
                $bill['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
            }

            echo json_encode($bills);
            break;

        case 'POST':
            // Create new bill with items
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid JSON"]);
                exit;
            }

            // Insert bill
            $sqlBill = "INSERT INTO bills (bill_number, customer_name, customer_phone, customer_address, subtotal, discount, discount_type, vat_rate, vat_amount, net_amount, date_time, status, payment_method, notes, cashier_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmtBill = $pdo->prepare($sqlBill);
            $stmtBill->execute([
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
            ]);

            $billId = $pdo->lastInsertId();

            // Insert bill items
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
                }
            }

            http_response_code(201);
            echo json_encode(["message" => "Bill created", "bill_id" => $billId]);
            break;

        case 'PUT':
        case 'PATCH':
            // Update bill and items
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data || !isset($data['id'])) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid JSON or missing bill id"]);
                exit;
            }

            $billId = $data['id'];

            // Update bill
            $sqlUpdate = "UPDATE bills SET bill_number = ?, customer_name = ?, customer_phone = ?, customer_address = ?, subtotal = ?, discount = ?, discount_type = ?, vat_rate = ?, vat_amount = ?, net_amount = ?, date_time = ?, status = ?, payment_method = ?, notes = ?, cashier_id = ? WHERE id = ?";

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
                }
            }

            echo json_encode(["message" => "Bill updated"]);
            break;

        case 'DELETE':
            // Delete bill and cascade delete items
            $id = $_GET['id'] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(["error" => "Missing bill id"]);
                exit;
            }

            $stmtDelete = $pdo->prepare("DELETE FROM bills WHERE id = ?");
            $stmtDelete->execute([$id]);

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
