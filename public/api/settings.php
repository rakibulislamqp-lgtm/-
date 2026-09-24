<?php
// cPanel Native Brand & Store Settings Storage API
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
$dataFile = $dataDir . '/settings.json';

// GET: Return current settings
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        if ($content !== false && strlen(trim($content)) > 0) {
            echo $content;
            exit;
        }
    }
    echo json_encode((object)[]);
    exit;
}

// POST: Update settings
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput, true);

    if ($decoded === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
        exit;
    }

    $current = [];
    if (file_exists($dataFile)) {
        $existing = file_get_contents($dataFile);
        if ($existing) {
            $current = json_decode($existing, true) ?: [];
        }
    }

    // Merge or replace
    $merged = array_merge($current, $decoded);
    $merged['updatedAt'] = date('Y-m-d H:i:s');

    $tempFile = $dataFile . '.tmp.' . uniqid();
    $jsonData = json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if (file_put_contents($tempFile, $jsonData, LOCK_EX) !== false) {
        if (rename($tempFile, $dataFile)) {
            echo json_encode([
                'success' => true,
                'data' => $merged,
                'message' => 'Settings saved permanently to cPanel storage.'
            ]);
            exit;
        }
    }

    @unlink($tempFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write settings to cPanel storage.']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
