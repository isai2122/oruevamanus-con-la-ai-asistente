<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Configuración de la base de datos
$db_host = 'localhost';
$db_user = 'iedvalsp_admin';
$db_pass = 'IEValdivia#2026';
$db_name = 'iedvalsp_iedvalsp';

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Error de conexión: " . $conn->connect_error]);
    exit;
}

// Asegurar que la tabla existe
$conn->query("CREATE TABLE IF NOT EXISTS site_data (
    data_key VARCHAR(50) PRIMARY KEY,
    data_value LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

// Manejar peticiones GET (Leer datos)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $result = $conn->query("SELECT data_key, data_value FROM site_data");
    $data = [
        "posts" => [],
        "banners" => [],
        "aboutContent" => null,
        "socialLinks" => [],
        "schoolLogo" => null
    ];
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $data[$row['data_key']] = json_decode($row['data_value']);
        }
    }
    
    echo json_encode($data);
}

// Manejar peticiones POST (Guardar datos)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $key = $_POST['key'] ?? '';
    $value = $_POST['value'] ?? '';
    
    // Si no viene vía POST convencional, intentar JSON raw
    if (empty($key)) {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);
        if ($input) {
            foreach (['posts', 'banners', 'aboutContent', 'socialLinks', 'schoolLogo'] as $f) {
                if (isset($input[$f])) {
                    $key = $f;
                    $value = json_encode($input[$f]);
                    break;
                }
            }
        }
    }

    if (empty($key)) {
        echo json_encode(["status" => "error", "message" => "No se recibieron datos válidos"]);
        exit;
    }
    
    // Usar prepared statements para seguridad y manejo de datos pesados
    $stmt = $conn->prepare("INSERT INTO site_data (data_key, data_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE data_value = ?");
    $stmt->bind_param("sss", $key, $value, $value);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Datos guardados correctamente en MySQL"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar: " . $stmt->error]);
    }
    
    $stmt->close();
}

$conn->close();
?>
