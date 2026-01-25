<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

echo "Starting database test...\n";

try {
    require_once "db.php";
    echo "Database connection successful!\n";
    
    // Check if bills table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'bills'");
    $billsExists = $stmt->rowCount() > 0;
    
    echo "Bills table exists: " . ($billsExists ? "YES" : "NO") . "\n";
    
    if ($billsExists) {
        // Check table structure
        $stmt = $pdo->query("DESCRIBE bills");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "Bills table columns:\n";
        foreach ($columns as $column) {
            echo "- " . $column['Field'] . " (" . $column['Type'] . ")\n";
        }
        
        // Check if there's any data
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM bills");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "Number of bills: " . $count . "\n";
        
        if ($count > 0) {
            // Show first few bills
            $stmt = $pdo->query("SELECT * FROM bills LIMIT 3");
            $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo "Sample bills:\n";
            foreach ($bills as $bill) {
                echo "- ID: " . $bill['id'] . ", Bill Number: " . $bill['bill_number'] . ", Customer: " . $bill['customer_name'] . "\n";
            }
        }
    } else {
        echo "Bills table does not exist. Creating it...\n";
        
        // Create the bills table
        $sql = "CREATE TABLE IF NOT EXISTS bills (
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
        
        $pdo->exec($sql);
        echo "Bills table created successfully!\n";
    }
    
    // Check if bill_items table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'bill_items'");
    $billItemsExists = $stmt->rowCount() > 0;
    
    echo "\nBill_items table exists: " . ($billItemsExists ? "YES" : "NO") . "\n";
    
    if (!$billItemsExists) {
        echo "Creating bill_items table...\n";
        
        // Create the bill_items table
        $sql = "CREATE TABLE IF NOT EXISTS bill_items (
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
        
        $pdo->exec($sql);
        echo "Bill_items table created successfully!\n";
    }
    
    if ($billItemsExists) {
        // Check if there's any data
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM bill_items");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "Number of bill items: " . $count . "\n";
    }
    
    echo "\nTest completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?> 