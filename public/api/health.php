<?php
// cPanel Health & Storage Capability Check
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$isWritable = is_writable($dataDir);

echo json_encode([
    'status' => 'ok',
    'mode' => 'cpanel_native',
    'writable' => $isWritable,
    'php_version' => PHP_VERSION,
    'server_time' => date('Y-m-d H:i:s')
]);
