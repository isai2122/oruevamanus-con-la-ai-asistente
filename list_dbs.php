<?php
header('Content-Type: text/plain');
$conn = new mysqli('localhost', 'iedvalsp', 'jeIPfgsz0p6j94LS');
if ($conn->connect_error) die("Error: " . $conn->connect_error);
$res = $conn->query("SHOW DATABASES");
while($row = $res->fetch_row()) echo $row[0] . "\n";
$conn->close();
?>
