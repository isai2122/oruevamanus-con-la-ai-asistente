<?php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo json_encode([
        "status" => "success",
        "message" => "POST recibido correctamente",
        "post_data" => $_POST,
        "raw_length" => strlen(file_get_contents('php://input'))
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Usa el método POST"]);
}
?>
