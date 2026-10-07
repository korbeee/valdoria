<?php
declare(strict_types=1);

// Ponte local do XAMPP: o navegador não grava diretamente em Documentos.
ini_set('memory_limit', '768M');
set_time_limit(120);
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $value): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if (!in_array($remote, ['127.0.0.1', '::1', '::ffff:127.0.0.1'], true)) {
    reply(403, ['ok' => false, 'error' => 'Os mundos deste computador só podem ser acessados localmente.']);
}
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = parse_url($_SERVER['HTTP_ORIGIN']);
    $originHost = strtolower(($origin['host'] ?? '') . (isset($origin['port']) ? ':' . $origin['port'] : ''));
    if ($originHost !== strtolower($_SERVER['HTTP_HOST'] ?? '')) {
        reply(403, ['ok' => false, 'error' => 'Origem da solicitação não permitida.']);
    }
}

$directory = getenv('VALDORIA_SAVE_DIR') ?: 'C:\\Users\\bagre\\Documents\\My Games\\Valdoria';
$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($action, ['list','migrate'], true) && !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D', $id)) {
    reply(400, ['ok' => false, 'error' => 'Identificador de mundo inválido.']);
}
$path = $directory . DIRECTORY_SEPARATOR . $id . '.valdoria';

function checkedSave(string $bytes, string $id): array {
    $json = @gzdecode($bytes, 256 * 1024 * 1024);
    if ($json === false) throw new RuntimeException('O arquivo de mundo está incompleto ou danificado.');
    $save = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    $meta = $save['meta'] ?? [];
    if (($save['format'] ?? '') !== 'valdoria-world' || ($save['version'] ?? 0) !== 1 || ($meta['id'] ?? '') !== $id || !isset($save['state'])) {
        throw new RuntimeException('Formato de mundo não reconhecido.');
    }
    if (!is_string($meta['name'] ?? null) || strlen($meta['name']) > 180 || !is_int($meta['w'] ?? null) || !is_int($meta['h'] ?? null) ||
        $meta['w'] < 1 || $meta['h'] < 1 || $meta['w'] > 8400 || $meta['h'] > 2400 || !is_string($meta['savedAt'] ?? null)) {
        throw new RuntimeException('Dados do mundo inválidos.');
    }
    return $save;
}

function atomicWrite(string $path, string $bytes): void {
    $temporary = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
    $handle = @fopen($temporary, 'xb');
    if (!$handle) throw new RuntimeException('Não foi possível gravar na pasta de mundos.');
    try {
        $offset = 0;
        while ($offset < strlen($bytes)) {
            $written = fwrite($handle, substr($bytes, $offset, 1024 * 1024));
            if ($written === false || $written === 0) throw new RuntimeException('Falha ao gravar o mundo.');
            $offset += $written;
        }
        fflush($handle);
        if (function_exists('fsync')) fsync($handle);
    } catch (Throwable $e) { fclose($handle); @unlink($temporary); throw $e; }
    fclose($handle);
    if (!@rename($temporary, $path)) {
        @unlink($temporary);
        throw new RuntimeException('Não foi possível concluir o salvamento. O arquivo anterior foi preservado.');
    }
}

require_once __DIR__ . '/world-save-storage.php';

try {
    if ($action === 'migrate' && $method === 'POST') {
        if (($_SERVER['HTTP_X_VALDORIA_SAVE'] ?? '') !== '1') reply(403, ['error'=>'Solicitação inválida.']);
        reply(200, ['ok'=>true,'migrated'=>migrateLegacyWorlds($directory)]);
    }
    if ($action === 'list' && $method === 'GET') {
        $worlds = [];
        foreach (glob($directory . '/*', GLOB_ONLYDIR) ?: [] as $folder) foreach (manifestCandidates($folder) as $file) {
            try { $manifest = manifestAt($file); if (!worldDeleted($directory, $manifest['meta']['id'])) $worlds[$manifest['meta']['id']] = $manifest['meta']; break; }
            catch (Throwable $e) {}
        }
        // Compatibilidade mesmo se a migração ainda não foi concluída.
        foreach (glob($directory . '/*.json') ?: [] as $entry) {
            $meta = json_decode(@file_get_contents($entry) ?: '', true);
            if (!is_array($meta) || !preg_match('/^[a-f0-9-]{36}$/D', $meta['id'] ?? '') || isset($worlds[$meta['id']]) || worldDeleted($directory, $meta['id'])) continue;
            $legacy = $directory . '/' . $meta['id'] . '.valdoria';
            if (is_file($legacy) || is_file($legacy . '.bak')) $worlds[$meta['id']] = $meta;
        }
        $worlds = array_values($worlds);
        usort($worlds, fn(array $a,array $b)=>strcmp($b['savedAt'] ?? '',$a['savedAt'] ?? ''));
        reply(200, ['ok'=>true,'directory'=>$directory,'worlds'=>$worlds]);
    }
    if ($action === 'load' && $method === 'GET') {
        $lock = worldLock($directory, $id, LOCK_SH);
        try {
            $folder = findWorldFolder($directory, $id); $recovered = false;
            if (worldDeleted($directory, $id)) throw new RuntimeException('Este mundo foi excluído.');
            if ($folder) {
                [$save, , $recovered] = readFolderSave($folder, $id);
                $bytes = gzencode(json_encode($save, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),6);
            } else {
                try { $bytes = @file_get_contents($path) ?: ''; checkedSave($bytes,$id); }
                catch (Throwable $e) { $bytes = @file_get_contents($path . '.bak') ?: ''; checkedSave($bytes,$id);$recovered=true; }
            }
        } finally { releaseWorldLock($lock); }
        header('Content-Type: application/gzip');header('X-Valdoria-Recovered: ' . ($recovered?'1':'0'));echo $bytes;exit;
    }
    if ($action === 'save' && $method === 'PUT') {
        if (($_SERVER['HTTP_X_VALDORIA_SAVE'] ?? '') !== '1') reply(403,['error'=>'Solicitação de salvamento inválida.']);
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>64*1024*1024) reply(413,['error'=>'O arquivo de mundo excedeu o limite de tamanho.']);
        $bytes=file_get_contents('php://input',false,null,0,64*1024*1024+1);
        if(strlen($bytes)>64*1024*1024)reply(413,['error'=>'O arquivo de mundo excedeu o limite de tamanho.']);
        $save=checkedSave($bytes,$id);unset($bytes);
        $lock=worldLock($directory,$id,LOCK_EX);
        try {
            if (worldDeleted($directory, $id)) throw new RuntimeException('Este mundo foi excluído. Crie uma nova aventura para salvar novamente.');
            $folder=findWorldFolder($directory,$id) ?? createWorldFolder($directory,$save['meta']['name']);
            $meta=writeFolderSave($folder,$save);
        }finally{releaseWorldLock($lock);}
        reply(200,['ok'=>true,'meta'=>$meta,'directory'=>$directory]);
    }
    if (($action === 'rename' && $method === 'POST') || ($action === 'delete' && $method === 'DELETE')) {
        if (($_SERVER['HTTP_X_VALDORIA_SAVE'] ?? '') !== '1') reply(403, ['error'=>'Solicitação inválida.']);
        $name = null;
        if ($action === 'rename') {
            $data = json_decode(file_get_contents('php://input', false, null, 0, 4096), true, 16, JSON_THROW_ON_ERROR);
            $name = is_string($data['name'] ?? null) ? trim($data['name']) : '';
            if ($name === '' || strlen($name) > 180 || preg_match('/[\x00-\x1F\x7F]/u', $name)) reply(400, ['error'=>'Digite um nome válido para o mundo (até 48 caracteres).']);
            if (preg_match_all('/./us', $name) > 48) reply(400, ['error'=>'O nome deve ter até 48 caracteres.']);
        }
        $lock = worldLock($directory, $id, LOCK_EX);
        try {
            if ($action === 'rename') $meta = renameSavedWorld($directory, $id, $name);
            else deleteSavedWorld($directory, $id);
        } finally { releaseWorldLock($lock); }
        reply(200, ['ok'=>true] + ($action === 'rename' ? ['meta'=>$meta] : []));
    }
    reply(405,['ok'=>false,'error'=>'Operação não permitida.']);
} catch(Throwable $e) {
    reply(400,['ok'=>false,'error'=>$e instanceof JsonException?'O arquivo de mundo está danificado.':$e->getMessage()]);
}
