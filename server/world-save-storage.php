<?php
declare(strict_types=1);

const WORLD_SECTIONS = ['Terreno'=>'terreno','Personagem'=>'personagem','Itens'=>'itens','Criaturas'=>'criaturas','Mapa'=>'mapa','Progresso'=>'progresso'];

function worldDeleted(string $directory, string $id): bool {
    return is_file($directory . '/Sistema/Excluidos/' . $id . '.json');
}
function renameSavedWorld(string $directory, string $id, string $name): array {
    if (worldDeleted($directory, $id)) throw new RuntimeException('Este mundo foi excluído.');
    $folder = findWorldFolder($directory, $id); $meta = null;
    if ($folder) {
        checkedWorldTree($directory, $folder);
        // Altera apenas os índices; terreno, personagem e itens permanecem intactos.
        $updates = [];
        foreach (manifestCandidates($folder) as $file) {
            try { $manifest = manifestAt($file, $id); } catch (Throwable $e) { continue; }
            $manifest['meta']['name'] = $name; $updates[$file] = $manifest; $meta ??= $manifest['meta'];
        }
        foreach (array_reverse($updates, true) as $file => $manifest) atomicWrite($file, json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    } else {
        $base = $directory . '/' . $id;
        foreach (['.valdoria', '.valdoria.bak'] as $suffix) {
            try { $save = checkedSave(@file_get_contents($base . $suffix) ?: '', $id); } catch (Throwable $e) { continue; }
            $save['meta']['name'] = $name; $meta ??= $save['meta'];
            atomicWrite($base . $suffix, gzencode(json_encode($save, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 6));
        }
        if ($meta) atomicWrite($base . '.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }
    if (!$meta) throw new RuntimeException('Mundo não encontrado.');
    return $meta;
}
function checkedWorldTree(string $directory, string $folder): void {
    $base = realpath($directory); $target = realpath($folder);
    $normalize = fn($path) => strtolower(str_replace('\\', '/', $path));
    if (!$base || !$target || dirname($normalize($target)) !== $normalize($base) || basename($target) === 'Sistema' || is_link($folder)) throw new RuntimeException('Pasta de mundo inválida.');
    $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($folder, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);
    foreach ($entries as $entry) if ($entry->isLink() || !str_starts_with($normalize($entry->getRealPath() ?: ''), $normalize($target) . '/')) throw new RuntimeException('A pasta contém um caminho não permitido.');
}
function removeWorldTree(string $folder): void {
    $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($folder, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($entries as $entry) {
        if ($entry->isDir()) { if (!@rmdir($entry->getPathname())) throw new RuntimeException('Não foi possível remover uma pasta do mundo.'); }
        elseif (!@unlink($entry->getPathname())) throw new RuntimeException('Não foi possível remover um arquivo do mundo.');
    }
    if (!@rmdir($folder)) throw new RuntimeException('Não foi possível remover a pasta do mundo.');
}
function deleteSavedWorld(string $directory, string $id): void {
    if (worldDeleted($directory, $id)) return;
    $folder = findWorldFolder($directory, $id); $base = $directory . '/' . $id;
    $legacy = array_filter(array_map(fn($suffix) => $base . $suffix, ['.valdoria','.valdoria.bak','.json']), 'is_file');
    if (!$folder && !$legacy) throw new RuntimeException('Mundo não encontrado.');
    if ($folder) checkedWorldTree($directory, $folder);
    foreach ($legacy as $file) if (is_link($file)) throw new RuntimeException('Arquivo de mundo inválido.');
    $trash = $directory . '/Sistema/Excluidos'; makeDirectory($trash);
    // Retira da lista antes da limpeza e bloqueia saves antigos que recriariam o mundo.
    $removed = $trash . '/' . $id . '-' . bin2hex(random_bytes(6));
    if ($folder && !@rename($folder, $removed)) throw new RuntimeException('Não foi possível excluir o mundo.');
    try { atomicWrite($trash . '/' . $id . '.json', json_encode(['id'=>$id,'deletedAt'=>gmdate('c')], JSON_THROW_ON_ERROR)); }
    catch (Throwable $e) { if ($folder) @rename($removed, $folder); throw $e; }
    if ($folder) removeWorldTree($removed);
    foreach ($legacy as $file) if (!@unlink($file)) throw new RuntimeException('Não foi possível remover um arquivo antigo do mundo.');
}

function makeDirectory(string $path): void {
    if (!is_dir($path) && !@mkdir($path, 0777, true) && !is_dir($path)) throw new RuntimeException('Não foi possível criar a pasta de salvamento.');
}
function worldLock(string $directory, string $id, int $mode) {
    makeDirectory($directory . '/Sistema/Travas');
    $lock = @fopen($directory . '/Sistema/Travas/' . $id . '.lock', 'c');
    if (!$lock || !flock($lock, $mode)) throw new RuntimeException('Não foi possível proteger o mundo para gravação.');
    return $lock;
}
function releaseWorldLock($lock): void { flock($lock, LOCK_UN); fclose($lock); }
function manifestAt(string $file, ?string $id = null): array {
    $manifest = json_decode(@file_get_contents($file) ?: '', true, 512, JSON_THROW_ON_ERROR);
    if (($manifest['format'] ?? '') !== 'valdoria-folder' || ($manifest['version'] ?? 0) !== 1 || !is_array($manifest['meta'] ?? null) ||
        !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D', $manifest['meta']['id'] ?? '') ||
        ($id !== null && $manifest['meta']['id'] !== $id) || count($manifest['sections'] ?? []) !== count(WORLD_SECTIONS)) throw new RuntimeException('Índice do mundo inválido.');
    return $manifest;
}
function manifestCandidates(string $folder): array { return [$folder . '/mundo.json', $folder . '/Sistema/recuperacao.json', $folder . '/Backups/mundo.json']; }
function findWorldFolder(string $directory, string $id): ?string {
    foreach (glob($directory . '/*', GLOB_ONLYDIR) ?: [] as $folder) {
        if (basename($folder) === 'Sistema') continue;
        foreach (manifestCandidates($folder) as $file) {
            try { manifestAt($file, $id); return $folder; } catch (Throwable $e) {}
        }
    }
    return null;
}
function createWorldFolder(string $directory, string $name): string {
    $name = preg_replace('/[<>:"\/\\\\|?*\x00-\x1F]/u', '-', $name);
    $name = trim($name ?? '', " .\t\n\r\0\x0B");
    if ($name === '') $name = 'Meu mundo';
    if (preg_match('/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]|Sistema)(\..*)?$/i', $name)) $name = 'Mundo ' . $name;
    $folder = $directory . '/' . $name;
    for ($n = 2; file_exists($folder); $n++) $folder = $directory . '/' . $name . ' (' . $n . ')';
    makeDirectory($folder);
    return $folder;
}
function splitWorldSave(array $save): array {
    $root = $save['state']; $props = $root['props'] ?? null; $game = $props['game'] ?? null;
    if (!is_array($props) || !is_array($game['props'] ?? null)) throw new RuntimeException('Dados do mundo incompletos.');
    $parts = []; foreach (WORLD_SECTIONS as $category => $label) $parts[$category] = ['root'=>[], 'game'=>[]];
    $rootCategory = ['world'=>'Terreno','player'=>'Personagem','look'=>'Personagem','inventory'=>'Itens','held'=>'Itens','bench'=>'Itens','trash'=>'Itens','mapRevealed'=>'Mapa','mapAllExplored'=>'Mapa','fishing'=>'Criaturas'];
    foreach ($props as $key => $value) if ($key !== 'game') $parts[$rootCategory[$key] ?? 'Progresso']['root'][$key] = $value;
    $creatures = ['mobs','npcs','pets','boss','mount','cub','spiderling'];
    $items = ['chests','chestPairs','drops','outfit','accessories','selected'];
    foreach ($game['props'] as $key => $value) {
        $category = in_array($key, $creatures, true) ? 'Criaturas' : (in_array($key, $items, true) ? 'Itens' : 'Progresso');
        $parts[$category]['game'][$key] = $value;
    }
    unset($root['props'], $game['props']);
    return [$parts, ['root'=>$root,'game'=>$game,'rootOrder'=>array_keys($props),'gameOrder'=>array_keys($save['state']['props']['game']['props'])]];
}
function sectionPath(string $folder, string $relative): string {
    if (!preg_match('/^(?:Backups\/)?(?:Terreno|Personagem|Itens|Criaturas|Mapa|Progresso)\/[a-z]+-[a-f0-9]{16}\.valdoria$/D', $relative)) throw new RuntimeException('Caminho de arquivo do mundo inválido.');
    $path = $folder . '/' . $relative;
    $resolved = realpath($path); $base = realpath($folder);
    if ($resolved === false || $base === false || !str_starts_with(strtolower(str_replace('\\','/',$resolved)), strtolower(str_replace('\\','/',$base)) . '/')) throw new RuntimeException('Arquivo do mundo ausente.');
    return $path;
}
function readFolderSave(string $folder, string $id): array {
    $last = null;
    foreach (manifestCandidates($folder) as $index => $file) {
        try {
            $manifest = manifestAt($file, $id); $rootProps = []; $gameProps = [];
            foreach (WORLD_SECTIONS as $category => $label) {
                $entry = $manifest['sections'][$category] ?? [];
                $bytes = @file_get_contents(sectionPath($folder, $entry['file'] ?? ''));
                if ($bytes === false || !hash_equals($entry['sha256'] ?? '', hash('sha256', $bytes))) throw new RuntimeException('Uma parte do mundo está incompleta ou danificada.');
                $json = @gzdecode($bytes, 256 * 1024 * 1024); if ($json === false) throw new RuntimeException('Arquivo do mundo danificado.');
                $part = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
                if (($part['format'] ?? '') !== 'valdoria-section' || ($part['id'] ?? '') !== $id || ($part['category'] ?? '') !== $category) throw new RuntimeException('As partes não pertencem ao mesmo mundo.');
                $rootProps = array_merge($rootProps, $part['root']); $gameProps = array_merge($gameProps, $part['game']);
                unset($part, $json, $bytes);
            }
            $game = $manifest['graph']['game']; $game['props'] = [];
            foreach ($manifest['graph']['gameOrder'] as $key) { if (!array_key_exists($key, $gameProps)) throw new RuntimeException('Progresso incompleto.'); $game['props'][$key] = $gameProps[$key]; }
            $root = $manifest['graph']['root']; $root['props'] = [];
            foreach ($manifest['graph']['rootOrder'] as $key) {
                if ($key === 'game') $root['props'][$key] = $game;
                else { if (!array_key_exists($key, $rootProps)) throw new RuntimeException('Mundo incompleto.'); $root['props'][$key] = $rootProps[$key]; }
            }
            return [['format'=>'valdoria-world','version'=>1,'meta'=>$manifest['meta'],'state'=>$root], $manifest, $index !== 0];
        } catch (Throwable $e) { $last = $e; }
    }
    throw new RuntimeException('Não foi possível recuperar o mundo: ' . ($last?->getMessage() ?? 'arquivos ausentes'));
}
function cleanupSections(string $folder, array $current, ?array $backup): void {
    $keep = [];
    foreach ([$current, $backup] as $manifest) foreach ($manifest['sections'] ?? [] as $entry) $keep[$entry['file']] = true;
    foreach (WORLD_SECTIONS as $category => $label) foreach ([$category, 'Backups/' . $category] as $relative) {
        foreach (glob($folder . '/' . $relative . '/' . $label . '-*.valdoria') ?: [] as $file) {
            $key = $relative . '/' . basename($file); if (!isset($keep[$key])) @unlink($file);
        }
    }
}
function writeFolderSave(string $folder, array $save): array {
    $id = $save['meta']['id']; $backup = null;
    try {
        [, $previous, ] = readFolderSave($folder, $id);
        $backup = $previous;
        foreach ($previous['sections'] as $category => $entry) {
            $relative = 'Backups/' . $category . '/' . basename($entry['file']);
            makeDirectory($folder . '/Backups/' . $category);
            if ($relative !== $entry['file']) atomicWrite($folder . '/' . $relative, file_get_contents(sectionPath($folder, $entry['file'])));
            $backup['sections'][$category]['file'] = $relative;
        }
        atomicWrite($folder . '/Backups/mundo.json', json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    } catch (Throwable $e) {
        // Índices existentes exigem pelo menos uma geração válida antes de serem substituídos.
        if (is_file($folder . '/mundo.json') || is_file($folder . '/Backups/mundo.json')) throw $e;
    }
    [$parts, $graph] = splitWorldSave($save); $revision = bin2hex(random_bytes(8));
    $manifest = ['format'=>'valdoria-folder','version'=>1,'meta'=>$save['meta'],'graph'=>$graph,'sections'=>[]];
    $manifest['meta']['folder'] = basename($folder);
    foreach ($parts as $category => $part) {
        $part = ['format'=>'valdoria-section','version'=>1,'id'=>$id,'category'=>$category] + $part;
        $bytes = gzencode(json_encode($part, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 6);
        if ($bytes === false) throw new RuntimeException('Falha ao compactar uma parte do mundo.');
        makeDirectory($folder . '/' . $category); $relative = $category . '/' . WORLD_SECTIONS[$category] . '-' . $revision . '.valdoria';
        atomicWrite($folder . '/' . $relative, $bytes);
        $manifest['sections'][$category] = ['file'=>$relative,'sha256'=>hash('sha256',$bytes),'bytes'=>strlen($bytes)];
        unset($bytes);
    }
    $manifest['meta']['bytes'] = array_sum(array_column($manifest['sections'], 'bytes'));
    $json = json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    // O índice só muda depois de todas as partes estarem no disco. Nenhuma mistura de versões.
    atomicWrite($folder . '/mundo.json', $json);
    makeDirectory($folder . '/Sistema'); atomicWrite($folder . '/Sistema/recuperacao.json', $json);
    cleanupSections($folder, $manifest, $backup);
    return $manifest['meta'];
}
function migrateLegacyWorlds(string $directory): int {
    $ids = [];
    foreach (array_merge(glob($directory . '/*.valdoria') ?: [], glob($directory . '/*.valdoria.bak') ?: []) as $file) {
        $id = explode('.', basename($file))[0];
        if (preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D', $id)) $ids[$id] = true;
    }
    $count = 0;
    foreach (array_keys($ids) as $id) {
        if (worldDeleted($directory, $id)) continue;
        $lock = worldLock($directory, $id, LOCK_EX);
        try {
            $base = $directory . '/' . $id; $main = null; $oldBackup = null;
            try { $main = checkedSave(@file_get_contents($base . '.valdoria') ?: '', $id); } catch (Throwable $e) {}
            try { $oldBackup = checkedSave(@file_get_contents($base . '.valdoria.bak') ?: '', $id); } catch (Throwable $e) {}
            if (!$main && !$oldBackup) continue;
            $folder = findWorldFolder($directory, $id);
            if (!$folder) {
                $folder = createWorldFolder($directory, ($main ?? $oldBackup)['meta']['name']);
                if ($oldBackup) writeFolderSave($folder, $oldBackup);
                if ($main) writeFolderSave($folder, $main);
            }
            // Verifica o resultado antes de recolher qualquer arquivo antigo.
            readFolderSave($folder, $id); makeDirectory($folder . '/Backups/Legado');
            foreach (['.valdoria','.valdoria.bak','.json','.lock'] as $suffix) if (is_file($base . $suffix)) {
                if (!@rename($base . $suffix, $folder . '/Backups/Legado/' . $id . $suffix)) throw new RuntimeException('O mundo foi convertido, mas um arquivo antigo não pôde ser recolhido.');
            }
            $count++;
        } finally { releaseWorldLock($lock); }
    }
    return $count;
}
