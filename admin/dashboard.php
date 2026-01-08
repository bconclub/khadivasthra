<?php
/**
 * Admin Dashboard - EzMart Style
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/includes/auth-check.php';

$csrfToken = generateCSRF();

// Load data for stats
$productsData = readJSON(PRODUCTS_FILE);
$categoriesData = readJSON(CATEGORIES_FILE);
// Handle both array format and object format
$products = is_array($productsData) && !isset($productsData['products']) 
    ? $productsData 
    : ($productsData['products'] ?? []);
$categories = is_array($categoriesData) && !isset($categoriesData['categories'])
    ? $categoriesData
    : ($categoriesData['categories'] ?? []);
$totalProducts = count($products);
$totalCategories = count($categories);
$totalFeatured = count(array_filter($products, fn($p) => !empty($p['isFeatured'])));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Khadi Vasthra</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script>
        // Log Alpine.js loading
        console.log('[DEBUG] Script loaded');
        window.addEventListener('alpine:init', () => {
            console.log('[DEBUG] Alpine.js initialized');
            fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:alpine-init',message:'Alpine.js initialized',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch((e) => console.error('[DEBUG] Log fetch failed:', e));
        });
        window.addEventListener('DOMContentLoaded', () => {
            console.log('[DEBUG] DOM content loaded, Alpine defined:', typeof Alpine !== 'undefined');
            fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:DOMContentLoaded',message:'DOM content loaded',data:{alpineDefined:typeof Alpine !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch((e) => console.error('[DEBUG] Log fetch failed:', e));
        });
        console.log('[DEBUG] Event listeners registered');
    </script>
    <style>
        [x-cloak] { display: none !important; }
        :root {
            --cream: #F5E6D3;
            --coral: #E8657B;
            --orange: #F5A623;
            --white: #FFFFFF;
            --text: #1A1A1A;
        }
    </style>
</head>
<body class="bg-white" x-data="{ 
    activePage: 'dashboard',
    searchQuery: '',
    products: <?php echo json_encode(is_array($products) ? $products : []); ?>,
    categories: <?php echo json_encode(is_array($categories) ? $categories : []); ?>,
    csrfToken: '<?php echo $csrfToken; ?>',
    notification: { show: false, message: '', type: 'success' },
    showProductModal: false,
    showCategoryModal: false,
    editingProduct: null,
    editingCategory: null,
    productForm: {
        name: '',
        slug: '',
        category: '',
        price: '',
        comparePrice: '',
        description: '',
        longDescription: '',
        images: [],
        material: '',
        careInstructions: '',
        inStock: true,
        isFeatured: false,
        isNew: false,
        isBestSeller: false
    },
    categoryForm: {
        name: '',
        slug: '',
        description: '',
        image: '',
        isActive: true,
        displayOrder: 0
    },
    featuredProducts: new Set(<?php echo json_encode(array_map(fn($p) => $p['id'], array_filter($products, fn($p) => !empty($p['isFeatured'])))); ?>),
    loadProducts() { console.log('loadProducts called'); },
    loadCategories() { console.log('loadCategories called'); },
    loadDashboard() { console.log('loadDashboard called'); },
    showProducts() {},
    showCategories() {},
    showDashboard() {}
}">
    <div class="flex h-screen overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 bg-[#F5E6D3] fixed left-0 top-0 bottom-0 overflow-y-auto">
            <div class="p-6">
                <!-- Logo -->
                <div class="mb-8">
                    <div class="flex items-center justify-center mb-3">
                        <img src="http://localhost:3000/Khadi%20Vasthra%20White%20Transparnt.png" 
                             alt="Khadi Vasthra Logo" 
                             class="h-16 w-auto object-contain">
                    </div>
                    <p class="text-sm text-gray-600 text-center">Admin Panel</p>
                </div>
                
                <!-- Navigation -->
                <nav class="space-y-2">
                    <button @click="showDashboard()" 
                        :class="activePage === 'dashboard' ? 'bg-[#E8657B] text-white' : 'text-[#1A1A1A] hover:bg-white/50'"
                        class="w-full text-left px-4 py-3 rounded-lg transition font-medium">
                        Dashboard
                    </button>
                    <button @click="showProducts()" 
                        :class="activePage === 'products' ? 'bg-[#E8657B] text-white' : 'text-[#1A1A1A] hover:bg-white/50'"
                        class="w-full text-left px-4 py-3 rounded-lg transition font-medium">
                        Products
                    </button>
                    <button @click="showCategories()" 
                        :class="activePage === 'categories' ? 'bg-[#E8657B] text-white' : 'text-[#1A1A1A] hover:bg-white/50'"
                        class="w-full text-left px-4 py-3 rounded-lg transition font-medium">
                        Categories
                    </button>
                    <button @click="activePage = 'featured'; loadProducts()" 
                        :class="activePage === 'featured' ? 'bg-[#E8657B] text-white' : 'text-[#1A1A1A] hover:bg-white/50'"
                        class="w-full text-left px-4 py-3 rounded-lg transition font-medium">
                        Featured
                    </button>
                </nav>
            </div>
        </aside>

        <!-- Main Content Area -->
        <div class="flex-1 ml-64 flex flex-col">
            <!-- Topbar -->
            <header class="bg-white border-b border-gray-200 px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1 max-w-md">
                        <div class="relative">
                            <input type="text" 
                                x-model="searchQuery"
                                placeholder="Search products, categories..."
                                class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                            <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="text-right">
                            <p class="text-sm font-medium text-[#1A1A1A]">Admin</p>
                            <p class="text-xs text-gray-500">Administrator</p>
                        </div>
                        <div class="h-10 w-10 rounded-full bg-[#E8657B] flex items-center justify-center text-white font-semibold">
                            A
                        </div>
                    </div>
                </div>
            </header>

            <!-- Notification -->
            <div x-show="notification.show" 
                 x-cloak
                 x-transition
                 :class="notification.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'"
                 class="mx-6 mt-4 border px-4 py-3 rounded relative">
                <span x-text="notification.message"></span>
                <button @click="notification.show = false" class="absolute top-0 right-0 px-4 py-3">×</button>
            </div>

            <!-- Main Content -->
            <main class="flex-1 overflow-y-auto p-6">
                <!-- Dashboard Page -->
                <div x-show="activePage === 'dashboard'" x-cloak>
                    <h2 class="text-3xl font-bold text-[#1A1A1A] mb-6">Dashboard</h2>
                    
                    <!-- Stat Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                            <h3 class="text-sm font-medium text-gray-600 mb-2">Total Products</h3>
                            <p class="text-3xl font-bold text-[#1A1A1A]" x-text="products.length"></p>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                            <h3 class="text-sm font-medium text-gray-600 mb-2">Categories</h3>
                            <p class="text-3xl font-bold text-[#1A1A1A]" x-text="categories.length"></p>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                            <h3 class="text-sm font-medium text-gray-600 mb-2">Featured Products</h3>
                            <p class="text-3xl font-bold text-[#1A1A1A]" x-text="products.filter(p => p.isFeatured).length"></p>
                        </div>
                    </div>

                    <!-- Recent Products -->
                    <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-[#1A1A1A]">Recent Products</h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <template x-for="product in products.slice(0, 5)" :key="product.id">
                                        <tr>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <img :src="getImagePath(product.image)" 
                                                     :alt="product.name"
                                                     class="h-12 w-12 object-cover rounded">
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-[#1A1A1A]" x-text="product.name"></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-500" x-text="product.category"></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-[#1A1A1A]">₹<span x-text="product.price"></span></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span :class="product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                                                      class="px-2 py-1 text-xs rounded" 
                                                      x-text="product.inStock ? 'In Stock' : 'Out of Stock'"></span>
                                            </td>
                                        </tr>
                                    </template>
                                    <tr x-show="products.length === 0">
                                        <td colspan="5" class="px-6 py-4 text-center text-gray-500">No products found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Products Page -->
                <div x-show="activePage === 'products'" x-cloak>
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-3xl font-bold text-[#1A1A1A]">Products</h2>
                        <button @click="openProductModal()" 
                            class="bg-[#E8657B] hover:bg-[#d8556b] text-white px-4 py-2 rounded-lg transition font-medium">
                            Add New
                        </button>
                    </div>
                    
                    <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200" x-effect="console.log('[x-effect] Products array changed:', { productsCount: products.length, productsIsArray: Array.isArray(products), firstProduct: products.length > 0 ? products[0].name : 'none' })">
                                    <template x-for="product in products.filter(p => !searchQuery || (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())))" :key="product.id">
                                        <tr>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <img :src="getImagePath(product.image)" 
                                                     :alt="product.name"
                                                     class="h-16 w-16 object-cover rounded">
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-[#1A1A1A]" x-text="product.name"></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-500" x-text="product.category"></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-[#1A1A1A]">₹<span x-text="product.price"></span></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span :class="product.isFeatured ? 'bg-[#E8657B] text-white' : 'bg-gray-100 text-gray-800'"
                                                      class="px-2 py-1 text-xs rounded" 
                                                      x-text="product.isFeatured ? 'Yes' : 'No'"></span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button @click="editProduct(product)" class="text-[#E8657B] hover:text-[#d8556b] mr-4">Edit</button>
                                                <button @click="deleteProduct(product.id)" class="text-red-600 hover:text-red-800">Delete</button>
                                            </td>
                                        </tr>
                                    </template>
                                    <tr x-show="products.length === 0 || (searchQuery && products.filter(p => !searchQuery || (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0)">
                                        <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                                            <span x-show="products.length === 0">No products found</span>
                                            <span x-show="products.length > 0 && searchQuery">No products match your search</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Categories Page -->
                <div x-show="activePage === 'categories'" x-cloak>
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-3xl font-bold text-[#1A1A1A]">Categories</h2>
                        <button @click="openCategoryModal()" 
                            class="bg-[#E8657B] hover:bg-[#d8556b] text-white px-4 py-2 rounded-lg transition font-medium">
                            Add New
                        </button>
                    </div>
                    
                    <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Count</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <template x-for="category in categories" :key="category.id">
                                        <tr>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <img :src="getImagePath(category.image)" 
                                                     :alt="category.name"
                                                     class="h-16 w-16 object-cover rounded">
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-[#1A1A1A]" x-text="category.name"></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-500" x-text="getProductCount(category.name)"></div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button @click="editCategory(category)" class="text-[#E8657B] hover:text-[#d8556b] mr-4">Edit</button>
                                                <button @click="deleteCategory(category.id)" class="text-red-600 hover:text-red-800">Delete</button>
                                            </td>
                                        </tr>
                                    </template>
                                    <tr x-show="categories.length === 0">
                                        <td colspan="4" class="px-6 py-4 text-center text-gray-500">No categories found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Featured Page -->
                <div x-show="activePage === 'featured'" x-cloak>
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-3xl font-bold text-[#1A1A1A]">Featured Products</h2>
                        <button @click="saveFeatured()" 
                            class="bg-[#E8657B] hover:bg-[#d8556b] text-white px-4 py-2 rounded-lg transition font-medium">
                            Save Featured
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <template x-for="product in products" :key="product.id">
                            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <img :src="getImagePath(product.image)" 
                                     :alt="product.name"
                                     class="w-full h-48 object-cover">
                                <div class="p-4">
                                    <h3 class="font-medium text-[#1A1A1A] mb-2" x-text="product.name"></h3>
                                    <p class="text-sm text-gray-600 mb-4">₹<span x-text="product.price"></span></p>
                                    <label class="flex items-center">
                                        <input type="checkbox" 
                                               :checked="featuredProducts.has(product.id)"
                                               @change="toggleFeatured(product.id)"
                                               class="mr-2 h-4 w-4 text-[#E8657B] focus:ring-[#E8657B] border-gray-300 rounded">
                                        <span class="text-sm text-[#1A1A1A]">Mark as Featured</span>
                                    </label>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Product Modal -->
    <div x-show="showProductModal" 
         x-cloak
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
         @click.self="showProductModal = false">
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div class="p-6">
                <h3 class="text-2xl font-bold mb-4 text-[#1A1A1A]" x-text="editingProduct ? 'Edit Product' : 'Add Product'"></h3>
                <form @submit.prevent="saveProduct()" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Name *</label>
                            <input type="text" x-model="productForm.name" required
                                   @input="productForm.slug = generateSlug(productForm.name)"
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Slug *</label>
                            <input type="text" x-model="productForm.slug" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Category *</label>
                        <select x-model="productForm.category" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                            <option value="">Select Category</option>
                            <template x-for="cat in categories" :key="cat.id">
                                <option :value="cat.name" x-text="cat.name"></option>
                            </template>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Price (₹) *</label>
                            <input type="number" x-model="productForm.price" step="0.01" min="0" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Compare Price (₹)</label>
                            <input type="number" x-model="productForm.comparePrice" step="0.01" min="0"
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Description</label>
                        <textarea x-model="productForm.description" rows="3"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Long Description</label>
                        <textarea x-model="productForm.longDescription" rows="5"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Images</label>
                        <input type="file" @change="uploadProductImage($event)" accept="image/*" multiple
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        <div x-show="productForm.images.length > 0" class="mt-2 flex flex-wrap gap-2">
                            <template x-for="(img, index) in productForm.images" :key="index">
                                <img :src="img" alt="Preview" class="h-24 w-24 object-cover rounded">
                            </template>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Material</label>
                            <input type="text" x-model="productForm.material"
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Care Instructions</label>
                            <input type="text" x-model="productForm.careInstructions"
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-4">
                        <label class="flex items-center">
                            <input type="checkbox" x-model="productForm.inStock"
                                   class="mr-2 h-4 w-4 text-[#E8657B] focus:ring-[#E8657B] border-gray-300 rounded">
                            <span class="text-sm text-[#1A1A1A]">In Stock</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" x-model="productForm.isFeatured"
                                   class="mr-2 h-4 w-4 text-[#E8657B] focus:ring-[#E8657B] border-gray-300 rounded">
                            <span class="text-sm text-[#1A1A1A]">Featured</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" x-model="productForm.isNew"
                                   class="mr-2 h-4 w-4 text-[#E8657B] focus:ring-[#E8657B] border-gray-300 rounded">
                            <span class="text-sm text-[#1A1A1A]">New</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" x-model="productForm.isBestSeller"
                                   class="mr-2 h-4 w-4 text-[#E8657B] focus:ring-[#E8657B] border-gray-300 rounded">
                            <span class="text-sm text-[#1A1A1A]">Best Seller</span>
                        </label>
                    </div>
                    <div class="flex justify-end space-x-4 pt-4">
                        <button type="button" @click="closeProductModal()"
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-[#1A1A1A]">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-[#E8657B] hover:bg-[#d8556b] text-white rounded-lg">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Category Modal -->
    <div x-show="showCategoryModal" 
         x-cloak
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
         @click.self="showCategoryModal = false">
        <div class="bg-white rounded-lg max-w-2xl w-full">
            <div class="p-6">
                <h3 class="text-2xl font-bold mb-4 text-[#1A1A1A]" x-text="editingCategory ? 'Edit Category' : 'Add Category'"></h3>
                <form @submit.prevent="saveCategory()" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Name *</label>
                            <input type="text" x-model="categoryForm.name" required
                                   @input="categoryForm.slug = generateSlug(categoryForm.name)"
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Slug *</label>
                            <input type="text" x-model="categoryForm.slug" required
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Description</label>
                        <textarea x-model="categoryForm.description" rows="3"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Image</label>
                        <input type="file" @change="uploadCategoryImage($event)" accept="image/*"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        <div x-show="categoryForm.image" class="mt-2">
                            <img :src="categoryForm.image" alt="Preview" class="h-32 w-32 object-cover rounded">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-[#1A1A1A] mb-2">Display Order</label>
                            <input type="number" x-model="categoryForm.displayOrder" min="0"
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8657B] focus:border-transparent">
                        </div>
                        <div class="flex items-end">
                            <label class="flex items-center">
                                <input type="checkbox" x-model="categoryForm.isActive"
                                       class="mr-2 h-4 w-4 text-[#E8657B] focus:ring-[#E8657B] border-gray-300 rounded">
                                <span class="text-sm text-[#1A1A1A]">Is Active</span>
                            </label>
                        </div>
                    </div>
                    <div class="flex justify-end space-x-4 pt-4">
                        <button type="button" @click="closeCategoryModal()"
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-[#1A1A1A]">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-[#E8657B] hover:bg-[#d8556b] text-white rounded-lg">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        // Helper functions
        window.generateSlug = function(str) {
            if (!str) return '';
            return str.toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        // Alpine.js methods - attach to existing x-data
        function initDashboardMethods() {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'initDashboardMethods called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            const dashboardElement = document.querySelector('[x-data]');
            if (!dashboardElement) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Dashboard element not found, retrying',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                setTimeout(initDashboardMethods, 100);
                return;
            }
            
            if (typeof Alpine === 'undefined' || !Alpine.$data) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Alpine not ready, retrying',data:{alpineDefined:typeof Alpine !== 'undefined',hasAlpineData:typeof Alpine !== 'undefined' && typeof Alpine.$data !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                setTimeout(initDashboardMethods, 100);
                return;
            }
            
            const dashboard = Alpine.$data(dashboardElement);
            if (!dashboard) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Dashboard data not found, retrying',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                setTimeout(initDashboardMethods, 100);
                return;
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Attaching methods to dashboard',data:{hasLoadProducts:typeof dashboard.loadProducts === 'function',hasLoadCategories:typeof dashboard.loadCategories === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // Ensure featuredProducts exists and is a Set
            if (!dashboard.featuredProducts || !(dashboard.featuredProducts instanceof Set)) {
                dashboard.featuredProducts = new Set();
            }
            
            // Ensure products is an array - convert if needed
            if (!Array.isArray(dashboard.products)) {
                if (dashboard.products && typeof dashboard.products === 'object') {
                    // Try to convert object/other types to array
                    dashboard.products = Object.values(dashboard.products);
                } else {
                    dashboard.products = [];
                }
            }
            
            // Ensure categoryForm exists
            if (!dashboard.categoryForm || typeof dashboard.categoryForm !== 'object') {
                dashboard.categoryForm = {
                    name: '',
                    slug: '',
                    description: '',
                    image: '',
                    isActive: true,
                    displayOrder: 0
                };
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Products initialized',data:{productsIsArray:Array.isArray(dashboard.products),productsCount:dashboard.products.length,featuredProductsIsSet:dashboard.featuredProducts instanceof Set,hasCategoryForm:!!dashboard.categoryForm},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            Object.assign(dashboard, {
            // Helper method to get correct image path for admin panel
            getImagePath(imagePath) {
                if (!imagePath) return 'http://localhost:3000/images/mundu-white.png';
                // If path already has http, return as is
                if (imagePath.startsWith('http')) {
                    return imagePath;
                }
                // If path starts with /, use Next.js server
                if (imagePath.startsWith('/')) {
                    // URL encode only the filename part (last segment) to handle spaces
                    const parts = imagePath.split('/');
                    const filename = parts.pop();
                    const encodedFilename = encodeURIComponent(filename);
                    const encodedPath = parts.join('/') + '/' + encodedFilename;
                    return 'http://localhost:3000' + encodedPath;
                }
                // Otherwise, assume it's relative to Next.js public directory
                return 'http://localhost:3000/' + encodeURIComponent(imagePath);
            },
            
            get filteredProducts() {
                // CRITICAL FIX: Access Alpine data DYNAMICALLY to get the current reactive state
                const el = document.querySelector('[x-data]');
                if (!el) {
                    console.warn('[filteredProducts] No x-data element found');
                    return [];
                }
                
                const currentData = Alpine.$data(el);
                if (!currentData) {
                    console.warn('[filteredProducts] No Alpine data found');
                    return [];
                }
                
                // Get products with null check
                const products = currentData.products;
                const searchQuery = currentData.searchQuery || '';
                
                console.log('[filteredProducts] GETTER CALLED:', {
                    'products exists': products !== undefined,
                    'products type': typeof products,
                    'isArray': Array.isArray(products),
                    'length': products ? (Array.isArray(products) ? products.length : 'not array') : 0,
                    'searchQuery': searchQuery
                });
                
                // CRITICAL FIX: Add null check - if products is undefined or null, return empty array
                if (!products || !Array.isArray(products)) {
                    console.warn('[filteredProducts] products is not a valid array, returning empty array', {
                        productsType: typeof products,
                        productsIsArray: Array.isArray(products),
                        productsValue: products
                    });
                    return [];
                }
                
                // Create a copy of the array to ensure reactivity
                const productsArray = [...products];
                
                console.log('[filteredProducts] Products array prepared:', {
                    length: productsArray.length,
                    searchQuery: searchQuery
                });
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:filteredProducts',message:'filteredProducts getter called',data:{productsIsArray:Array.isArray(products),productsCount:productsArray.length,searchQuery:searchQuery,hasSearchQuery:!!searchQuery},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                // #endregion
                
                // Always return all products if no search query
                if (!searchQuery || searchQuery.trim() === '') {
                    console.log('[filteredProducts] Returning all products:', productsArray.length);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:filteredProducts',message:'filteredProducts returning all products',data:{resultCount:productsArray.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                    // #endregion
                    return productsArray;
                }
                
                // Filter products based on search query
                const query = searchQuery.toLowerCase();
                const result = productsArray.filter(p => {
                    if (!p) return false;
                    const nameMatch = p.name && typeof p.name === 'string' && p.name.toLowerCase().includes(query);
                    const categoryMatch = p.category && typeof p.category === 'string' && p.category.toLowerCase().includes(query);
                    return nameMatch || categoryMatch;
                });
                
                console.log('[filteredProducts] Returning filtered results:', {
                    query: query,
                    resultCount: result.length,
                    totalProducts: productsArray.length
                });
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:filteredProducts',message:'filteredProducts returning filtered results',data:{resultCount:result.length,query:query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                // #endregion
                return result;
            },
            
            getProductCount(categoryName) {
                // Access Alpine data dynamically
                const el = document.querySelector('[x-data]');
                const currentData = Alpine.$data(el);
                const products = currentData.products || [];
                return products.filter(p => p.category === categoryName).length;
            },
            
            loadDashboard() {
                // Refresh data for dashboard stats
                this.loadProducts();
                this.loadCategories();
            },
            
            showNotification(message, type = 'success') {
                this.notification = { show: true, message, type };
                setTimeout(() => {
                    this.notification.show = false;
                }, 3000);
            },
            
            async loadProducts() {
                console.log('[loadProducts] Called, fetching from /api/products.php');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'loadProducts called',data:{url:'/api/products.php'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                try {
                    const response = await fetch('/api/products.php', {
                        credentials: 'include'
                    });
                    
                    console.log('[loadProducts] Fetch response:', {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok,
                        url: response.url
                    });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'Fetch response received',data:{status:response.status,statusText:response.statusText,ok:response.ok,url:response.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    console.log('[loadProducts] Data parsed:', {
                        hasProducts: !!data.products,
                        productsIsArray: Array.isArray(data.products),
                        productsCount: Array.isArray(data.products) ? data.products.length : 0,
                        dataIsArray: Array.isArray(data)
                    });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'Products data parsed',data:{hasProducts:!!data.products,productsIsArray:Array.isArray(data.products),productsCount:Array.isArray(data.products) ? data.products.length : 0,dataIsArray:Array.isArray(data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    // Ensure we get all products
                    const productsArray = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);
                    
                    console.log('[loadProducts] Products array prepared:', {
                        productsCount: productsArray.length,
                        productsIsArray: Array.isArray(productsArray),
                        firstProduct: productsArray.length > 0 ? productsArray[0].name : 'none'
                    });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'Products array prepared',data:{productsCount:productsArray.length,productsIsArray:Array.isArray(productsArray)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    // Ensure products is an array before assignment
                    // CRITICAL: Initialize as empty array if undefined/null or not an array
                    if (!this.products || !Array.isArray(this.products)) {
                        console.warn('[loadProducts] Products is not an array, resetting:', {
                            productsType: typeof this.products,
                            productsIsArray: Array.isArray(this.products),
                            productsValue: this.products ? JSON.stringify(this.products).substring(0, 100) : 'null/undefined'
                        });
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'Products is not array, resetting',data:{productsType:typeof this.products,productsIsArray:Array.isArray(this.products),productsValue:this.products ? JSON.stringify(this.products).substring(0,100) : 'null/undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                        // #endregion
                        this.products = [];
                    }
                    
                    console.log('[loadProducts] Before assignment:', {
                        currentProductsCount: this.products.length,
                        currentProductsIsArray: Array.isArray(this.products),
                        newProductsCount: productsArray.length
                    });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'Before assignment',data:{productsCount:this.products.length,productsIsArray:Array.isArray(this.products),productsArrayLength:productsArray.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    
                    // CRITICAL FIX: Use splice() to maintain Alpine.js reactivity
                    // Direct array assignment doesn't always trigger reactivity properly
                    // Clear existing array and replace with new products using splice
                    // This ensures Alpine.js detects the change and updates computed properties
                    this.products.splice(0, this.products.length, ...productsArray);
                    
                    console.log('[loadProducts] After assignment:', {
                        productsCount: this.products.length,
                        productsIsArray: Array.isArray(this.products),
                        productsFirstItem: this.products.length > 0 ? this.products[0].name : 'none',
                        productsReference: this.products
                    });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'After assignment',data:{productsCount:this.products.length,productsIsArray:Array.isArray(this.products)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    
                    // Update featuredProducts Set based on loaded products
                    if (!this.featuredProducts || !(this.featuredProducts instanceof Set)) {
                        this.featuredProducts = new Set();
                    }
                    // Sync featuredProducts with product isFeatured flags
                    productsArray.forEach(product => {
                        if (product.isFeatured) {
                            this.featuredProducts.add(product.id);
                        }
                    });
                    
                    // Force Alpine.js to recognize the change by using $nextTick
                    // This ensures Alpine.js has updated its reactivity tracking
                    if (this.$nextTick) {
                        this.$nextTick(() => {
                            const filtered = this.filteredProducts;
                            console.log('[loadProducts] Final state (after nextTick):', {
                                productsCount: this.products.length,
                                filteredProductsCount: filtered.length,
                                featuredProductsSize: this.featuredProducts ? this.featuredProducts.size : 'N/A'
                            });
                        });
                    } else {
                        // Fallback: use setTimeout if $nextTick is not available
                        setTimeout(() => {
                            const filtered = this.filteredProducts;
                            console.log('[loadProducts] Final state (after setTimeout):', {
                                productsCount: this.products.length,
                                filteredProductsCount: filtered.length,
                                featuredProductsSize: this.featuredProducts ? this.featuredProducts.size : 'N/A'
                            });
                        }, 0);
                    }
                    
                    // Also log immediately to see current state
                    const filtered = this.filteredProducts;
                    console.log('[loadProducts] Final state (immediate):', {
                        productsCount: this.products.length,
                        filteredProductsCount: filtered.length,
                        featuredProductsSize: this.featuredProducts ? this.featuredProducts.size : 'N/A'
                    });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'Products assigned via splice for reactivity',data:{productsCount:this.products.length,productsIsArray:Array.isArray(this.products),filteredProductsCount:filtered.length,featuredProductsSize:this.featuredProducts ? this.featuredProducts.size : 'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                } catch (error) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadProducts',message:'Load products error',data:{errorMessage:error.message,errorName:error.name,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    console.error('Load products error:', error);
                    this.showNotification('Failed to load products: ' + error.message, 'error');
                }
            },
            
            async loadCategories() {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadCategories',message:'loadCategories called',data:{url:'/api/categories.php'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                try {
                    const response = await fetch('/api/categories.php', {
                        credentials: 'include'
                    });
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadCategories',message:'Fetch response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadCategories',message:'Categories data parsed',data:{hasCategories:!!data.categories,categoriesCount:Array.isArray(data.categories) ? data.categories.length : 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    this.categories = data.categories || [];
                } catch (error) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:loadCategories',message:'Load categories error',data:{errorMessage:error.message,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    console.error('Load categories error:', error);
                    this.showNotification('Failed to load categories: ' + error.message, 'error');
                }
            },
            
            openProductModal() {
                this.resetProductForm();
                this.editingProduct = null;
                this.showProductModal = true;
            },
            
            closeProductModal() {
                this.showProductModal = false;
                this.editingProduct = null;
                this.resetProductForm();
            },
            
            editProduct(product) {
                this.editingProduct = product;
                this.productForm = {
                    name: product.name || '',
                    slug: product.slug || '',
                    category: product.category || '',
                    price: product.price || '',
                    comparePrice: product.comparePrice || '',
                    description: product.description || '',
                    longDescription: product.longDescription || '',
                    images: product.images || (product.image ? [product.image] : []),
                    material: product.material || '',
                    careInstructions: product.careInstructions || '',
                    inStock: product.inStock !== false,
                    isFeatured: product.isFeatured || false,
                    isNew: product.isNew || false,
                    isBestSeller: product.isBestSeller || false
                };
                this.showProductModal = true;
            },
            
            resetProductForm() {
                this.productForm = {
                    name: '',
                    slug: '',
                    category: '',
                    price: '',
                    comparePrice: '',
                    description: '',
                    longDescription: '',
                    images: [],
                    material: '',
                    careInstructions: '',
                    inStock: true,
                    isFeatured: false,
                    isNew: false,
                    isBestSeller: false
                };
            },
            
            async uploadProductImage(event) {
                const files = Array.from(event.target.files);
                if (files.length === 0) return;
                
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('image', file);
                    
                    try {
                        const response = await fetch('/api/upload.php', {
                            method: 'POST',
                            body: formData
                        });
                        const data = await response.json();
                        if (data.success) {
                            this.productForm.images.push(data.data.path);
                        }
                    } catch (error) {
                        this.showNotification('Failed to upload image', 'error');
                    }
                }
                if (files.length > 0) {
                    this.showNotification('Images uploaded successfully');
                }
            },
            
            async saveProduct() {
                const payload = {
                    name: this.productForm.name,
                    slug: this.productForm.slug,
                    category: this.productForm.category,
                    price: this.productForm.price,
                    comparePrice: this.productForm.comparePrice || '',
                    description: this.productForm.description,
                    longDescription: this.productForm.longDescription,
                    image: this.productForm.images[0] || '',
                    images: JSON.stringify(this.productForm.images),
                    material: this.productForm.material,
                    careInstructions: this.productForm.careInstructions,
                    inStock: this.productForm.inStock ? 'true' : 'false',
                    isFeatured: this.productForm.isFeatured ? 'true' : 'false',
                    isNew: this.productForm.isNew ? 'true' : 'false',
                    isBestSeller: this.productForm.isBestSeller ? 'true' : 'false',
                    csrf_token: this.csrfToken
                };
                
                if (this.editingProduct) {
                    payload._method = 'PUT';
                    payload.id = this.editingProduct.id;
                }
                
                try {
                        const response = await fetch('/api/products.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(payload).toString()
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(data.message);
                        this.closeProductModal();
                        await this.loadProducts();
                    } else {
                        this.showNotification(data.error || 'Failed to save product', 'error');
                    }
                } catch (error) {
                    this.showNotification('Failed to save product', 'error');
                }
            },
            
            async deleteProduct(id) {
                if (!confirm('Are you sure you want to delete this product?')) return;
                
                try {
                    const formData = new URLSearchParams({
                        id: id,
                        _method: 'DELETE',
                        csrf_token: this.csrfToken
                    });
                    
                        const response = await fetch('/api/products.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: formData.toString()
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(data.message);
                        await this.loadProducts();
                    } else {
                        this.showNotification(data.error || 'Failed to delete product', 'error');
                    }
                } catch (error) {
                    this.showNotification('Failed to delete product', 'error');
                }
            },
            
            openCategoryModal() {
                this.resetCategoryForm();
                this.editingCategory = null;
                this.showCategoryModal = true;
            },
            
            closeCategoryModal() {
                this.showCategoryModal = false;
                this.editingCategory = null;
                this.resetCategoryForm();
            },
            
            editCategory(category) {
                this.editingCategory = category;
                this.categoryForm = {
                    name: category.name || '',
                    slug: category.slug || '',
                    description: category.description || '',
                    image: category.image || '',
                    isActive: category.isActive !== false,
                    displayOrder: category.displayOrder || 0
                };
                this.showCategoryModal = true;
            },
            
            resetCategoryForm() {
                this.categoryForm = {
                    name: '',
                    slug: '',
                    description: '',
                    image: '',
                    isActive: true,
                    displayOrder: 0
                };
            },
            
            async uploadCategoryImage(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('image', file);
                
                try {
                    const response = await fetch('/api/upload.php', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        this.categoryForm.image = data.data.path;
                        this.showNotification('Image uploaded successfully');
                    } else {
                        this.showNotification(data.error || 'Upload failed', 'error');
                    }
                } catch (error) {
                    this.showNotification('Failed to upload image', 'error');
                }
            },
            
            async saveCategory() {
                const payload = {
                    name: this.categoryForm.name,
                    slug: this.categoryForm.slug,
                    description: this.categoryForm.description,
                    image: this.categoryForm.image,
                    isActive: this.categoryForm.isActive ? 'true' : 'false',
                    displayOrder: this.categoryForm.displayOrder,
                    csrf_token: this.csrfToken
                };
                
                if (this.editingCategory) {
                    payload._method = 'PUT';
                    payload.id = this.editingCategory.id;
                }
                
                try {
                        const response = await fetch('/api/categories.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(payload).toString()
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(data.message);
                        this.closeCategoryModal();
                        await this.loadCategories();
                    } else {
                        this.showNotification(data.error || 'Failed to save category', 'error');
                    }
                } catch (error) {
                    this.showNotification('Failed to save category', 'error');
                }
            },
            
            async deleteCategory(id) {
                if (!confirm('Are you sure you want to delete this category?')) return;
                
                try {
                    const formData = new URLSearchParams({
                        id: id,
                        _method: 'DELETE',
                        csrf_token: this.csrfToken
                    });
                    
                        const response = await fetch('/api/categories.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: formData.toString()
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(data.message);
                        await this.loadCategories();
                    } else {
                        this.showNotification(data.error || 'Failed to delete category', 'error');
                    }
                } catch (error) {
                    this.showNotification('Failed to delete category', 'error');
                }
            },
            
            toggleFeatured(productId) {
                if (this.featuredProducts.has(productId)) {
                    this.featuredProducts.delete(productId);
                } else {
                    this.featuredProducts.add(productId);
                }
            },
            
            async saveFeatured() {
                const featuredIds = Array.from(this.featuredProducts);
                
                // Update all products
                const updates = this.products.map(product => {
                    const isFeatured = featuredIds.includes(product.id);
                    return {
                        ...product,
                        isFeatured: isFeatured
                    };
                });
                
                // Save via API
                try {
                    for (const product of updates) {
                        if (product.isFeatured !== (this.products.find(p => p.id === product.id)?.isFeatured || false)) {
                            const payload = new URLSearchParams({
                                id: product.id,
                                isFeatured: product.isFeatured ? 'true' : 'false',
                                _method: 'PUT',
                                csrf_token: this.csrfToken
                            });
                            
                            await fetch('/api/products.php', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                                body: payload.toString()
                            });
                        }
                    }
                    
                    this.showNotification('Featured products saved successfully');
                    await this.loadProducts();
                } catch (error) {
                    this.showNotification('Failed to save featured products', 'error');
                }
            },
            
            showProducts() {
                console.log('[showProducts] Called');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:showProducts',message:'showProducts called',data:{currentPage:this.activePage,hasLoadProducts:typeof this.loadProducts === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                this.activePage = 'products';
                console.log('[showProducts] Active page set to:', this.activePage);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:showProducts',message:'activePage set to products',data:{activePage:this.activePage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                setTimeout(() => {
                    if (typeof this.loadProducts === 'function') {
                        console.log('[showProducts] Calling loadProducts');
                        this.loadProducts();
                    } else {
                        console.error('[showProducts] loadProducts is not a function');
                    }
                }, 50);
            },
            
            showCategories() {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:showCategories',message:'showCategories called',data:{currentPage:this.activePage,hasLoadCategories:typeof this.loadCategories === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                this.activePage = 'categories';
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:showCategories',message:'activePage set to categories',data:{activePage:this.activePage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                setTimeout(() => {
                    if (typeof this.loadCategories === 'function') {
                        this.loadCategories();
                    } else {
                        console.error('loadCategories not a function');
                    }
                }, 50);
            },
            
            showDashboard() {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:showDashboard',message:'showDashboard called',data:{currentPage:this.activePage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                this.activePage = 'dashboard';
                if (typeof this.loadDashboard === 'function') {
                    this.loadDashboard();
                }
            }
            });
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Methods attached successfully',data:{hasLoadProducts:typeof dashboard.loadProducts === 'function',hasLoadCategories:typeof dashboard.loadCategories === 'function',hasLoadDashboard:typeof dashboard.loadDashboard === 'function',hasShowProducts:typeof dashboard.showProducts === 'function',hasShowCategories:typeof dashboard.showCategories === 'function',hasShowDashboard:typeof dashboard.showDashboard === 'function',activePage:dashboard.activePage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // Load initial data
            try {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Attempting to load dashboard',data:{activePage:dashboard.activePage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                if (dashboard.activePage === 'dashboard' && typeof dashboard.loadDashboard === 'function') {
                    dashboard.loadDashboard();
                }
            } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initDashboardMethods',message:'Error loading dashboard',data:{errorMessage:error.message,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                console.error('Error loading dashboard:', error);
            }
        }
        
        // Initialize when DOM is ready
        function initializeDashboard() {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initializeDashboard',message:'initializeDashboard called',data:{alpineDefined:typeof Alpine !== 'undefined',readyState:document.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (typeof Alpine === 'undefined') {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initializeDashboard',message:'Alpine not defined, retrying',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                setTimeout(initializeDashboard, 50);
                return;
            }
            
            // Wait for Alpine to be ready
            if (document.readyState === 'loading') {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:initializeDashboard',message:'DOM loading, waiting for DOMContentLoaded',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(initDashboardMethods, 100);
                });
            } else {
                // Try multiple times to ensure Alpine is ready
                let attempts = 0;
                const tryInit = () => {
                    attempts++;
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:tryInit',message:'tryInit attempt',data:{attempt:attempts,alpineDefined:typeof Alpine !== 'undefined',hasAlpineData:typeof Alpine !== 'undefined' && typeof Alpine.$data !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    if (typeof Alpine !== 'undefined' && Alpine.$data) {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:tryInit',message:'Alpine ready, calling initDashboardMethods',data:{attempts:attempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        initDashboardMethods();
                    } else if (attempts < 20) {
                        setTimeout(tryInit, 100);
                    } else {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/dd06f679-21e7-4353-bf9b-14555d932367',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.php:tryInit',message:'Failed to initialize after 20 attempts',data:{attempts:attempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        console.error('Failed to initialize dashboard methods');
                    }
                };
                tryInit();
            }
        }
        
        initializeDashboard();
    </script>
</body>
</html>
