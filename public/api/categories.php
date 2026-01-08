<?php
/**
 * Categories API for Khadi Vasthra
 * Works with static export in /out/api/
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/../data/categories.json';

function readData() {
    global $dataFile;
    if (!file_exists($dataFile)) {
        return ['categories' => []];
    }
    $content = file_get_contents($dataFile);
    $data = json_decode($content, true);
    
    if (is_array($data) && !isset($data['categories'])) {
        return ['categories' => $data];
    }
    return $data ?: ['categories' => []];
}

function writeData($data) {
    global $dataFile;
    $dir = dirname($dataFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function generateSlug($text) {
    $slug = strtolower($text);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim($slug, '-');
    return $slug;
}

function generateId() {
    return 'cat_' . uniqid();
}

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all categories
if ($method === 'GET') {
    $data = readData();
    
    $id = $_GET['id'] ?? null;
    $slug = $_GET['slug'] ?? null;
    
    // Get single category by ID
    if ($id) {
        foreach ($data['categories'] as $category) {
            if ($category['id'] === $id) {
                echo json_encode(['success' => true, 'category' => $category]);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Category not found']);
        exit;
    }
    
    // Get single category by slug
    if ($slug) {
        foreach ($data['categories'] as $category) {
            if (($category['slug'] ?? '') === $slug) {
                echo json_encode(['success' => true, 'category' => $category]);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Category not found']);
        exit;
    }
    
    // Sort by displayOrder
    $categories = $data['categories'];
    usort($categories, function($a, $b) {
        return ($a['displayOrder'] ?? 999) - ($b['displayOrder'] ?? 999);
    });
    
    // Filter active only if requested
    if (isset($_GET['active']) && filter_var($_GET['active'], FILTER_VALIDATE_BOOLEAN)) {
        $categories = array_filter($categories, function($c) {
            return $c['isActive'] ?? true;
        });
        $categories = array_values($categories);
    }
    
    echo json_encode(['success' => true, 'categories' => $categories]);
    exit;
}

// POST - Create new category
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    if (empty($input['name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Category name is required']);
        exit;
    }
    
    $data = readData();
    
    // Get next display order
    $maxOrder = 0;
    foreach ($data['categories'] as $cat) {
        if (($cat['displayOrder'] ?? 0) > $maxOrder) {
            $maxOrder = $cat['displayOrder'];
        }
    }
    
    $category = [
        'id' => generateId(),
        'name' => $input['name'],
        'slug' => $input['slug'] ?? generateSlug($input['name']),
        'description' => $input['description'] ?? '',
        'image' => $input['image'] ?? '',
        'displayOrder' => isset($input['displayOrder']) ? intval($input['displayOrder']) : $maxOrder + 1,
        'isActive' => isset($input['isActive']) ? filter_var($input['isActive'], FILTER_VALIDATE_BOOLEAN) : true
    ];
    
    $data['categories'][] = $category;
    
    if (writeData($data)) {
        echo json_encode(['success' => true, 'category' => $category]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save category']);
    }
    exit;
}

// PUT - Update category
if ($method === 'PUT') {
    $id = $_GET['id'] ?? '';
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Category ID is required']);
        exit;
    }
    
    $data = readData();
    $found = false;
    
    foreach ($data['categories'] as $key => &$category) {
        if ($category['id'] === $id) {
            $found = true;
            
            if (isset($input['name'])) $category['name'] = $input['name'];
            if (isset($input['slug'])) $category['slug'] = $input['slug'];
            if (isset($input['description'])) $category['description'] = $input['description'];
            if (isset($input['image'])) $category['image'] = $input['image'];
            if (isset($input['displayOrder'])) $category['displayOrder'] = intval($input['displayOrder']);
            if (isset($input['isActive'])) $category['isActive'] = filter_var($input['isActive'], FILTER_VALIDATE_BOOLEAN);
            
            break;
        }
    }
    
    if (!$found) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Category not found']);
        exit;
    }
    
    if (writeData($data)) {
        echo json_encode(['success' => true, 'message' => 'Category updated']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update category']);
    }
    exit;
}

// DELETE - Delete category
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Category ID is required']);
        exit;
    }
    
    $data = readData();
    $found = false;
    
    foreach ($data['categories'] as $key => $category) {
        if ($category['id'] === $id) {
            $found = true;
            array_splice($data['categories'], $key, 1);
            break;
        }
    }
    
    if (!$found) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Category not found']);
        exit;
    }
    
    if (writeData($data)) {
        echo json_encode(['success' => true, 'message' => 'Category deleted']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to delete category']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
