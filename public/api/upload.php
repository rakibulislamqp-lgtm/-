<?php
// cPanel High-Speed Image Upload API
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$uploadsDir = dirname(__DIR__) . '/uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

// 1. Check if uploaded via Multipart Form-Data (file input)
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    
    if (!in_array($ext, $allowed)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid image format. Allowed: JPG, PNG, WEBP, GIF, SVG']);
        exit;
    }

    $filename = 'img_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
    $targetPath = $uploadsDir . '/' . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Construct relative or full public URL
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
        $host = $_SERVER['HTTP_HOST'];
        $url = '/uploads/' . $filename;

        echo json_encode([
            'success' => true,
            'url' => $url,
            'filename' => $filename,
            'message' => 'Image uploaded to cPanel successfully in 1 click.'
        ]);
        exit;
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file. Check cPanel uploads folder permission.']);
        exit;
    }
}

// 2. Check if uploaded via Base64 JSON payload
$rawInput = file_get_contents('php://input');
$decoded = json_decode($rawInput, true);

if ($decoded && isset($decoded['image']) && is_string($decoded['image'])) {
    $dataUrl = $decoded['image'];
    if (preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $type)) {
        $data = substr($dataUrl, strpos($dataUrl, ',') + 1);
        $type = strtolower($type[1]); // jpg, png, webp, etc.
        if ($type === 'jpeg') $type = 'jpg';

        $data = base64_decode($data);
        if ($data === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Base64 decode failed']);
            exit;
        }

        $filename = 'img_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $type;
        $targetPath = $uploadsDir . '/' . $filename;

        if (file_put_contents($targetPath, $data) !== false) {
            $url = '/uploads/' . $filename;
            echo json_encode([
                'success' => true,
                'url' => $url,
                'filename' => $filename,
                'message' => 'Base64 image saved to cPanel successfully.'
            ]);
            exit;
        }
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'No valid file or image data provided']);
