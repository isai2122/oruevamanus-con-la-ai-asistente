<?php
header('Content-Type: text/plain');
$host = 'localhost';
$user = 'iedvalsp';
$pass = 'jeIPfgsz0p6j94LS';

// En cPanel, el usuario principal suele tener una DB con su propio nombre
$db_name = 'iedvalsp_iedvalsp'; // Intento 1: usuario_usuario
echo "Probando conexión a $db_name...\n";

$conn = new mysqli($host, $user, $pass);
if ($conn->connect_error) {
    die("❌ Error: " . $conn->connect_error);
}

// Intentar encontrar bases de datos disponibles
$res = $conn->query("SHOW DATABASES");
$dbs = [];
while($row = $res->fetch_row()) $dbs[] = $row[0];
echo "Bases de datos encontradas: " . implode(", ", $dbs) . "\n";

// Usar la primera que no sea del sistema
$target_db = "";
foreach($dbs as $d) {
    if ($d !== 'information_schema' && $d !== 'performance_schema' && $d !== 'mysql' && $d !== 'sys') {
        $target_db = $d;
        break;
    }
}

if ($target_db) {
    echo "Usando base de datos: $target_db\n";
    $conn->select_db($target_db);
    
    $sql = "CREATE TABLE IF NOT EXISTS site_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data_key VARCHAR(50) UNIQUE NOT NULL,
        data_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    
    if ($conn->query($sql)) {
        echo "✅ Tabla site_data lista.\n";
        $initial_data = ["posts" => "[]", "banners" => "[]", "aboutContent" => "null", "socialLinks" => "[]", "schoolLogo" => "null"];
        foreach ($initial_data as $key => $val) {
            $conn->query("INSERT IGNORE INTO site_data (data_key, data_value) VALUES ('$key', '$val')");
        }
        echo "✅ Configuración MySQL completada.\n";
    } else {
        echo "❌ Error tabla: " . $conn->error . "\n";
    }
} else {
    echo "❌ No se encontró ninguna base de datos para usar.\n";
}
$conn->close();
?>
