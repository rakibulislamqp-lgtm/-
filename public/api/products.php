<?php
// cPanel Native Product Storage API
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
$dataFile = $dataDir . '/products.json';

// GET: Return all products
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

// POST: Save products list or update
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput, true);

    if ($decoded === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
        exit;
    }

    // Determine if saving whole list or action
    $products = is_array($decoded) && isset($decoded['products']) ? $decoded['products'] : $decoded;

    if (!is_array($products)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Expected an array of products']);
        exit;
    }

    // Atomic write to avoid corruption
    $tempFile = $dataFile . '.tmp.' . uniqid();
    $jsonData = json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if (file_put_contents($tempFile, $jsonData, LOCK_EX) !== false) {
        if (rename($tempFile, $dataFile)) {
            echo json_encode([
                'success' => true,
                'count' => count($products),
                'savedAt' => date('Y-m-d H:i:s'),
                'message' => 'Products saved permanently to cPanel storage.'
            ]);
            exit;
        }
    }

    @unlink($tempFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write to cPanel file storage. Check folder permissions.']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
