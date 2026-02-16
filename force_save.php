<?php
header('Content-Type: application/json');
$file = 'data_store.json';
$data = ["posts" => [], "banners" => [], "aboutContent" => "Test", "socialLinks" => [], "schoolLogo" => null];
if (file_put_contents($file, json_encode($data))) {
    echo json_encode(["status" => "success", "message" => "Archivo guardado por force_save.php"]);
} else {
    echo json_encode(["status" => "error", "last_error" => error_get_last()]);
}
?>
