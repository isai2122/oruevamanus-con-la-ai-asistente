<?php
header('Content-Type: application/json');
$report = [];

// 1. Verificar versión de PHP
$report['php_version'] = PHP_VERSION;

// 2. Verificar permisos de escritura en el directorio actual
$report['dir_writable'] = is_writable('.');
$report['dir_permissions'] = substr(sprintf('%o', fileperms('.')), -4);

// 3. Intentar crear un archivo de prueba
$test_file = 'test_write.txt';
if (file_put_contents($test_file, 'Testing write at ' . date('Y-m-d H:i:s'))) {
    $report['file_write_test'] = 'Success';
    $report['test_file_exists'] = file_exists($test_file);
    unlink($test_file); // Limpiar
} else {
    $report['file_write_test'] = 'Failed';
    $report['last_error'] = error_get_last();
}

// 4. Verificar límites de POST
$report['post_max_size'] = ini_get('post_max_size');
$report['upload_max_filesize'] = ini_get('upload_max_filesize');
$report['memory_limit'] = ini_get('memory_limit');

echo json_encode($report, JSON_PRETTY_PRINT);
?>
