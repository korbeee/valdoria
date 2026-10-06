<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Metodo nao permitido.']);
    exit;
}

$batch = __DIR__ . DIRECTORY_SEPARATOR . 'iniciar-servidor.bat';
if (!is_file($batch)) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Arquivo do servidor nao encontrado.']);
    exit;
}

if (!function_exists('popen')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'O PHP nao permite iniciar processos (popen desativado).']);
    exit;
}

$command = 'start "" cmd /c call "' . str_replace('"', '""', $batch) . '"';
$process = @popen($command, 'r');
if ($process === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'O Windows recusou a inicializacao do servidor.']);
    exit;
}

pclose($process);
echo json_encode(['ok' => true]);