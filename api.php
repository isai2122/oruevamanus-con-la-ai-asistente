<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$data_file = 'data_store.json';
$log_file = 'api_errors.log';

function log_error($msg) {
    global $log_file;
    file_put_contents($log_file, date('[Y-m-d H:i:s] ') . $msg . "\n", FILE_APPEND);
}

// Inicializar archivo si no existe
if (!file_exists($data_file)) {
    file_put_contents($data_file, json_encode([
        "posts" => [],
        "banners" => [],
        "aboutContent" => null,
        "socialLinks" => [],
        "schoolLogo" => null
    ]));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

if ($method === 'GET') {
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    echo file_get_contents($data_file);
} 
elseif ($method === 'POST') {
    // Soporte para FormData (más robusto contra firewalls)
    $key = isset($_POST['key']) ? $_POST['key'] : null;
    $value = isset($_POST['value']) ? json_decode($_POST['value'], true) : null;

    if ($key && $value !== null) {
        $input = [$key => $value];
    } else {
        // Fallback a JSON raw si no es FormData
        $raw_input = file_get_contents('php://input');
        $input = json_decode($raw_input, true);
    }

    if (!$input) {
        log_error("POST fallido. No se detectó FormData ni JSON válido. POST keys: " . implode(',', array_keys($_POST)));
        echo json_encode(["status" => "error", "message" => "No se recibieron datos válidos"]);
        exit;
    }

    $current_data = json_decode(file_get_contents($data_file), true) ?: [];
    
    // Actualizar campos específicos
    foreach (['posts', 'banners', 'aboutContent', 'socialLinks', 'schoolLogo'] as $f) {
        if (isset($input[$f])) {
            $current_data[$f] = $input[$f];
        }
    }
    
    $json_string = json_encode($current_data);
    if ($json_string === false) {
        echo json_encode(["status" => "error", "message" => "JSON encoding error: " . json_last_error_msg()]);
        exit;
    }
    
    if (file_put_contents($data_file, $json_string)) {
        echo json_encode(["status" => "success", "message" => "Data saved"]);
    } else {
        $error = error_get_last();
        echo json_encode(["status" => "error", "message" => "Could not save data to $data_file. Error: " . ($error ? $error['message'] : 'Unknown')]);
    }
}
?>
