<?php
// cPanel Native Orders Storage API
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}
$dataFile = $dataDir . '/orders.json';

// GET: Return all orders
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        if ($content !== false && strlen(trim($content)) > 0) {
            echo $content;
            exit;
        }
    }
    echo json_encode([]);
    exit;
}

// POST: Place new order, update status, or replace orders
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput, true);

    if ($decoded === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
        exit;
    }

    $orders = [];
    if (file_exists($dataFile)) {
        $existing = file_get_contents($dataFile);
        if ($existing) {
            $orders = json_decode($existing, true) ?: [];
        }
    }

    // Action 1: Replace all orders (batch sync or reset)
    if (isset($decoded['action']) && $decoded['action'] === 'sync_all' && isset($decoded['orders']) && is_array($decoded['orders'])) {
        $orders = $decoded['orders'];
    }
    // Action 2: Update status of a specific order
    else if (isset($decoded['action']) && $decoded['action'] === 'update_status' && isset($decoded['orderId'])) {
        $found = false;
        foreach ($orders as &$ord) {
            if ($ord['id'] == $decoded['orderId']) {
                if (isset($decoded['status'])) $ord['status'] = $decoded['status'];
                if (isset($decoded['courierStatus'])) $ord['courierStatus'] = $decoded['courierStatus'];
                if (isset($decoded['adminNote'])) $ord['adminNote'] = $decoded['adminNote'];
                $ord['updatedAt'] = date('Y-m-d H:i:s');
                $found = true;
                break;
            }
        }
        if (!$found) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Order not found']);
            exit;
        }
    }
    // Action 3: Delete an order
    else if (isset($decoded['action']) && $decoded['action'] === 'delete' && isset($decoded['orderId'])) {
        $orders = array_values(array_filter($orders, function($o) use ($decoded) {
            return $o['id'] != $decoded['orderId'];
        }));
    }
    // Action 4: Single new order placed
    else if (isset($decoded['id']) || isset($decoded['customerName']) || isset($decoded['phone'])) {
        $newOrder = $decoded;
        if (!isset($newOrder['id'])) {
            $newOrder['id'] = 'ORD-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));
        }
        if (!isset($newOrder['createdAt'])) {
            $newOrder['createdAt'] = date('c');
        }
        // Check if already exists, update or prepend
        $existingIndex = -1;
        foreach ($orders as $idx => $o) {
            if ($o['id'] == $newOrder['id']) {
                $existingIndex = $idx;
                break;
            }
        }
        if ($existingIndex >= 0) {
            $orders[$existingIndex] = array_merge($orders[$existingIndex], $newOrder);
        } else {
            array_unshift($orders, $newOrder);
        }
    } 
    // Fallback: If received an array directly
    else if (is_array($decoded) && isset($decoded[0])) {
        $orders = $decoded;
    }

    $tempFile = $dataFile . '.tmp.' . uniqid();
    $jsonData = json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if (file_put_contents($tempFile, $jsonData, LOCK_EX) !== false) {
        if (rename($tempFile, $dataFile)) {
            echo json_encode([
                'success' => true,
                'count' => count($orders),
                'orderId' => isset($newOrder['id']) ? $newOrder['id'] : null,
                'message' => 'Order saved permanently to cPanel storage.'
            ]);
            exit;
        }
    }

    @unlink($tempFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write orders to cPanel storage.']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
