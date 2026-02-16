<?php
header('Content-Type: text/plain');
$files = ['api.php', 'data_store.json', 'api_errors.log', 'test_server.php', 'test_post.php', 'force_save.php', 'inspect_api.php', 'view_logs.php'];
foreach ($files as $f) {
    if (file_exists($f)) {
        if (unlink($f)) echo "Eliminado: $f\n";
        else echo "Error al eliminar: $f\n";
    }
}
echo "Limpieza completada.";
?>
