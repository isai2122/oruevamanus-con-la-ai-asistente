<?php
header('Content-Type: text/html; charset=utf-8');
echo "<h1>Estado del Sistema IE Valdivia</h1>";
$file = 'data_store.json';
if (file_exists($file)) {
    echo "<p style='color:green'>✅ El archivo de datos existe.</p>";
    echo "<p>Contenido actual: <pre>" . file_get_contents($file) . "</pre></p>";
} else {
    echo "<p style='color:red'>❌ El archivo de datos NO existe.</p>";
}

if (is_writable($file)) {
    echo "<p style='color:green'>✅ El archivo tiene permisos de escritura.</p>";
} else {
    echo "<p style='color:red'>❌ El servidor NO permite escribir en el archivo.</p>";
}

echo "<h2>Prueba de Guardado Manual</h2>";
echo "<form method='POST'><input type='hidden' name='test' value='1'><button type='submit'>Probar Guardado Ahora</button></form>";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $test_data = ["posts" => [], "banners" => [], "aboutContent" => "Prueba realizada el " . date('H:i:s'), "socialLinks" => [], "schoolLogo" => null];
    if (file_put_contents($file, json_encode($test_data))) {
        echo "<p style='color:blue; font-weight:bold;'>🚀 ¡ÉXITO! El servidor acaba de permitir el guardado manual.</p>";
        echo "<script>setTimeout(() => { window.location.href = window.location.href; }, 2000);</script>";
    } else {
        echo "<p style='color:red;'>❌ ERROR: El servidor bloqueó el guardado manual.</p>";
    }
}
?>
