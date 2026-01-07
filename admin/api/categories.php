<?php
/**
 * Categories API
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/../includes/auth-check.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all categories
if ($method === 'GET') {
    $data = readJSON(CATEGORIES_FILE);
    $categories = $data['categories'] ?? [];
    jsonResponse(['categories' => $categories]);
}

// POST - Add new category
if ($method === 'POST') {
    validateCSRF($_POST['csrf_token'] ?? '');
    
    $name = sanitize($_POST['name'] ?? '');
    $description = sanitize($_POST['description'] ?? '');
    
    if (empty($name)) {
        jsonError('Category name is required');
    }
    
    $data = readJSON(CATEGORIES_FILE);
    $categories = $data['categories'] ?? [];
    
    $slug = generateSlug($name);
    // Ensure unique slug
    $baseSlug = $slug;
    $counter = 1;
    while (in_array($slug, array_column($categories, 'slug'))) {
        $slug = $baseSlug . '-' . $counter;
        $counter++;
    }
    
    $newCategory = [
        'id' => getNextId($categories),
        'name' => $name,
        'slug' => $slug,
        'description' => $description
    ];
    
    $categories[] = $newCategory;
    $data['categories'] = $categories;
    
    if (writeJSON(CATEGORIES_FILE, $data)) {
        jsonSuccess('Category added successfully', $newCategory);
    } else {
        jsonError('Failed to save category');
    }
}

// PUT - Update category
if ($method === 'PUT' || ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT')) {
    // Handle both PUT and POST with _method=PUT
    if ($method === 'PUT') {
        parse_str(file_get_contents('php://input'), $putData);
    } else {
        $putData = $_POST;
    }
    
    validateCSRF($putData['csrf_token'] ?? '');
    
    $id = sanitize($putData['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        jsonError('Category ID is required');
    }
    
    $data = readJSON(CATEGORIES_FILE);
    $categories = $data['categories'] ?? [];
    
    $found = false;
    foreach ($categories as $index => $category) {
        if ($category['id'] == $id) {
            $found = true;
            
            if (isset($putData['name'])) {
                $categories[$index]['name'] = sanitize($putData['name']);
                $categories[$index]['slug'] = generateSlug($categories[$index]['name']);
            }
            if (isset($putData['description'])) {
                $categories[$index]['description'] = sanitize($putData['description']);
            }
            
            break;
        }
    }
    
    if (!$found) {
        jsonError('Category not found', 404);
    }
    
    $data['categories'] = $categories;
    
    if (writeJSON(CATEGORIES_FILE, $data)) {
        jsonSuccess('Category updated successfully', $categories[$index]);
    } else {
        jsonError('Failed to update category');
    }
}

// DELETE - Delete category
if ($method === 'DELETE' || ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'DELETE')) {
    // Handle both DELETE and POST with _method=DELETE
    if ($method === 'DELETE') {
        parse_str(file_get_contents('php://input'), $deleteData);
    } else {
        $deleteData = $_POST;
    }
    
    validateCSRF($deleteData['csrf_token'] ?? '');
    
    $id = sanitize($_GET['id'] ?? $deleteData['id'] ?? '');
    if (empty($id)) {
        jsonError('Category ID is required');
    }
    
    $data = readJSON(CATEGORIES_FILE);
    $categories = $data['categories'] ?? [];
    
    $found = false;
    foreach ($categories as $index => $category) {
        if ($category['id'] == $id) {
            $found = true;
            array_splice($categories, $index, 1);
            break;
        }
    }
    
    if (!$found) {
        jsonError('Category not found', 404);
    }
    
    $data['categories'] = $categories;
    
    if (writeJSON(CATEGORIES_FILE, $data)) {
        jsonSuccess('Category deleted successfully');
    } else {
        jsonError('Failed to delete category');
    }
}

jsonError('Method not allowed', 405);
?>

