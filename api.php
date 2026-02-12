<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$data_file = 'data_store.json';

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
    echo file_get_contents($data_file);
} 
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        echo json_encode(["error" => "Invalid data"]);
        exit;
    }

    $current_data = json_decode(file_get_contents($data_file), true);
    
    // Actualizar campos específicos si vienen en el POST
    if (isset($input['posts'])) $current_data['posts'] = $input['posts'];
    if (isset($input['banners'])) $current_data['banners'] = $input['banners'];
    if (isset($input['aboutContent'])) $current_data['aboutContent'] = $input['aboutContent'];
    if (isset($input['socialLinks'])) $current_data['socialLinks'] = $input['socialLinks'];
    if (isset($input['schoolLogo'])) $current_data['schoolLogo'] = $input['schoolLogo'];
    
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
