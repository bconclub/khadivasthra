<?php
/**
 * Admin Dashboard
 * Khadi Vasthra Admin Panel
 */

require_once __DIR__ . '/includes/auth-check.php';

$csrfToken = generateCSRF();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Khadi Vasthra</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="bg-gray-100" x-data="{ 
    activeTab: 'dashboard',
    products: [],
    categories: [],
    settings: {},
    csrfToken: '<?php echo $csrfToken; ?>',
    loading: false,
    notification: { show: false, message: '', type: 'success' },
    showProductModal: false,
    showCategoryModal: false,
    showSettingsModal: false,
    editingProduct: null,
    editingCategory: null,
    productForm: {
        name: '',
        category: '',
        price: '',
        description: '',
        image: '',
        isFeatured: false,
        inStock: true
    },
    categoryForm: {
        name: '',
        description: ''
    }
}">
    <!-- Navigation -->
    <nav class="bg-red-800 text-white shadow-lg">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold">Khadi Vasthra Admin</h1>
                <div class="flex items-center space-x-4">
                    <span class="text-sm">Welcome, Admin</span>
                    <button @click="logout()" class="bg-red-900 hover:bg-red-950 px-4 py-2 rounded transition">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Tabs -->
    <div class="bg-white shadow">
        <div class="container mx-auto px-4">
            <div class="flex space-x-1">
                <button @click="activeTab = 'dashboard'; loadDashboard()" 
                    :class="activeTab === 'dashboard' ? 'border-b-2 border-red-800 text-red-800' : 'text-gray-600'"
                    class="px-6 py-4 font-medium transition">
                    Dashboard
                </button>
                <button @click="activeTab = 'products'; loadProducts()" 
                    :class="activeTab === 'products' ? 'border-b-2 border-red-800 text-red-800' : 'text-gray-600'"
                    class="px-6 py-4 font-medium transition">
                    Products
                </button>
                <button @click="activeTab = 'categories'; loadCategories()" 
                    :class="activeTab === 'categories' ? 'border-b-2 border-red-800 text-red-800' : 'text-gray-600'"
                    class="px-6 py-4 font-medium transition">
                    Categories
                </button>
                <button @click="activeTab = 'settings'; loadSettings()" 
                    :class="activeTab === 'settings' ? 'border-b-2 border-red-800 text-red-800' : 'text-gray-600'"
                    class="px-6 py-4 font-medium transition">
                    Settings
                </button>
            </div>
        </div>
    </div>

    <!-- Notification -->
    <div x-show="notification.show" 
         x-cloak
         :class="notification.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'"
         class="border px-4 py-3 rounded relative m-4"
         x-transition>
        <span x-text="notification.message"></span>
        <button @click="notification.show = false" class="absolute top-0 right-0 px-4 py-3">×</button>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
        <!-- Dashboard Tab -->
        <div x-show="activeTab === 'dashboard'" x-cloak>
            <h2 class="text-3xl font-bold mb-6">Dashboard Overview</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-gray-600 text-sm font-medium mb-2">Total Products</h3>
                    <p class="text-3xl font-bold text-red-800" x-text="products.length"></p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-gray-600 text-sm font-medium mb-2">Total Categories</h3>
                    <p class="text-3xl font-bold text-red-800" x-text="categories.length"></p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-gray-600 text-sm font-medium mb-2">Featured Products</h3>
                    <p class="text-3xl font-bold text-red-800" x-text="products.filter(p => p.isFeatured).length"></p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-xl font-bold mb-4">Quick Actions</h3>
                <div class="flex flex-wrap gap-4">
                    <button @click="activeTab = 'products'; loadProducts(); showProductModal = true" 
                        class="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded transition">
                        Add New Product
                    </button>
                    <button @click="activeTab = 'categories'; loadCategories(); showCategoryModal = true" 
                        class="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded transition">
                        Add New Category
                    </button>
                    <button @click="activeTab = 'settings'; loadSettings()" 
                        class="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded transition">
                        Update Settings
                    </button>
                </div>
            </div>
        </div>

        <!-- Products Tab -->
        <div x-show="activeTab === 'products'" x-cloak>
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Products</h2>
                <button @click="openProductModal()" 
                    class="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded transition">
                    Add Product
                </button>
            </div>
            
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <template x-for="product in products" :key="product.id">
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <img :src="product.image || '/images/placeholder.jpg'" 
                                             :alt="product.name"
                                             class="h-16 w-16 object-cover rounded">
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900" x-text="product.name"></div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-500" x-text="product.category"></div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-900">₹<span x-text="product.price"></span></div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span :class="product.isFeatured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                                              class="px-2 py-1 text-xs rounded" 
                                              x-text="product.isFeatured ? 'Yes' : 'No'"></span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span :class="product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                                              class="px-2 py-1 text-xs rounded" 
                                              x-text="product.inStock ? 'In Stock' : 'Out of Stock'"></span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button @click="editProduct(product)" class="text-red-600 hover:text-red-900 mr-4">Edit</button>
                                        <button @click="deleteProduct(product.id)" class="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            </template>
                            <tr x-show="products.length === 0">
                                <td colspan="7" class="px-6 py-4 text-center text-gray-500">No products found</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Categories Tab -->
        <div x-show="activeTab === 'categories'" x-cloak>
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Categories</h2>
                <button @click="openCategoryModal()" 
                    class="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded transition">
                    Add Category
                </button>
            </div>
            
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <template x-for="category in categories" :key="category.id">
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900" x-text="category.name"></div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-500" x-text="category.slug"></div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm text-gray-500" x-text="category.description || '-'"></div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button @click="editCategory(category)" class="text-red-600 hover:text-red-900 mr-4">Edit</button>
                                        <button @click="deleteCategory(category.id)" class="text-red-600 hover:text-red-900">Delete</button>
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

        <!-- Settings Tab -->
        <div x-show="activeTab === 'settings'" x-cloak>
            <h2 class="text-3xl font-bold mb-6">Site Settings</h2>
            
            <div class="bg-white rounded-lg shadow p-6">
                <form @submit.prevent="saveSettings()" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                        <input type="text" x-model="settings.storeName" 
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
                        <input type="text" x-model="settings.whatsapp" 
                               placeholder="91XXXXXXXXXX"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea x-model="settings.address" rows="3"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                        <input type="email" x-model="settings.email" 
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Instagram Handle</label>
                        <input type="text" x-model="settings.instagram" 
                               placeholder="khadivasthra"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                    </div>
                    <button type="submit" 
                            class="bg-red-800 hover:bg-red-900 text-white px-6 py-2 rounded-lg transition">
                        Save Settings
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- Product Modal -->
    <div x-show="showProductModal" 
         x-cloak
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
         @click.self="showProductModal = false">
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <h3 class="text-2xl font-bold mb-4" x-text="editingProduct ? 'Edit Product' : 'Add Product'"></h3>
                <form @submit.prevent="saveProduct()" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                        <input type="text" x-model="productForm.name" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                        <select x-model="productForm.category" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                            <option value="">Select Category</option>
                            <template x-for="cat in categories" :key="cat.id">
                                <option :value="cat.name" x-text="cat.name"></option>
                            </template>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
                        <input type="number" x-model="productForm.price" step="0.01" min="0" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea x-model="productForm.description" rows="3"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                        <input type="file" @change="uploadProductImage($event)" accept="image/*"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                        <div x-show="productForm.image" class="mt-2">
                            <img :src="productForm.image" alt="Preview" class="h-32 w-32 object-cover rounded">
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <label class="flex items-center">
                            <input type="checkbox" x-model="productForm.isFeatured"
                                   class="mr-2">
                            <span class="text-sm text-gray-700">Featured Product</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" x-model="productForm.inStock"
                                   class="mr-2">
                            <span class="text-sm text-gray-700">In Stock</span>
                        </label>
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button type="button" @click="showProductModal = false; editingProduct = null; resetProductForm()"
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg">
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
        <div class="bg-white rounded-lg max-w-md w-full">
            <div class="p-6">
                <h3 class="text-2xl font-bold mb-4" x-text="editingCategory ? 'Edit Category' : 'Add Category'"></h3>
                <form @submit.prevent="saveCategory()" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                        <input type="text" x-model="categoryForm.name" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea x-model="categoryForm.description" rows="3"
                                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"></textarea>
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button type="button" @click="showCategoryModal = false; editingCategory = null; resetCategoryForm()"
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <script>
        // Alpine.js data and methods
        document.addEventListener('alpine:init', () => {
            Alpine.data('dashboard', () => ({
                // Data is already in x-data, methods below
            }));
        });

        // Helper functions
        async function apiCall(url, options = {}) {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            return response.json();
        }

        // Dashboard methods
        window.loadDashboard = function() {
            const dashboard = Alpine.$data(document.querySelector('[x-data]'));
            dashboard.loadProducts();
            dashboard.loadCategories();
        };

        window.loadProducts = async function() {
            const dashboard = Alpine.$data(document.querySelector('[x-data]'));
            try {
                const data = await apiCall('api/products.php');
                dashboard.products = data.products || [];
            } catch (error) {
                dashboard.showNotification('Failed to load products', 'error');
            }
        };

        window.loadCategories = async function() {
            const dashboard = Alpine.$data(document.querySelector('[x-data]'));
            try {
                const data = await apiCall('api/categories.php');
                dashboard.categories = data.categories || [];
            } catch (error) {
                dashboard.showNotification('Failed to load categories', 'error');
            }
        };

        window.loadSettings = async function() {
            const dashboard = Alpine.$data(document.querySelector('[x-data]'));
            try {
                const data = await apiCall('api/settings.php');
                dashboard.settings = data;
            } catch (error) {
                dashboard.showNotification('Failed to load settings', 'error');
            }
        };

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            const dashboard = Alpine.$data(document.querySelector('[x-data]'));
            loadDashboard();
        });
    </script>
    <script>
        // Extended Alpine.js methods
        const dashboardElement = document.querySelector('[x-data]');
        
        // Add methods to Alpine component
        Object.assign(Alpine.$data(dashboardElement), {
            showNotification(message, type = 'success') {
                this.notification = { show: true, message, type };
                setTimeout(() => {
                    this.notification.show = false;
                }, 3000);
            },
            
            async loadProducts() {
                try {
                    const response = await fetch('api/products.php');
                    const data = await response.json();
                    this.products = data.products || [];
                } catch (error) {
                    this.showNotification('Failed to load products', 'error');
                }
            },
            
            async loadCategories() {
                try {
                    const response = await fetch('api/categories.php');
                    const data = await response.json();
                    this.categories = data.categories || [];
                } catch (error) {
                    this.showNotification('Failed to load categories', 'error');
                }
            },
            
            async loadSettings() {
                try {
                    const response = await fetch('api/settings.php');
                    const data = await response.json();
                    this.settings = data;
                } catch (error) {
                    this.showNotification('Failed to load settings', 'error');
                }
            },
            
            openProductModal() {
                this.resetProductForm();
                this.editingProduct = null;
                this.showProductModal = true;
            },
            
            editProduct(product) {
                this.editingProduct = product;
                this.productForm = {
                    name: product.name || '',
                    category: product.category || '',
                    price: product.price || '',
                    description: product.description || '',
                    image: product.image || '',
                    isFeatured: product.isFeatured || false,
                    inStock: product.inStock !== false
                };
                this.showProductModal = true;
            },
            
            resetProductForm() {
                this.productForm = {
                    name: '',
                    category: '',
                    price: '',
                    description: '',
                    image: '',
                    isFeatured: false,
                    inStock: true
                };
            },
            
            async uploadProductImage(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('image', file);
                
                try {
                    const response = await fetch('api/upload.php', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        this.productForm.image = data.data.path;
                        this.showNotification('Image uploaded successfully');
                    } else {
                        this.showNotification(data.error || 'Upload failed', 'error');
                    }
                } catch (error) {
                    this.showNotification('Failed to upload image', 'error');
                }
            },
            
            async saveProduct() {
                const payload = {
                    name: this.productForm.name,
                    category: this.productForm.category,
                    price: this.productForm.price,
                    description: this.productForm.description,
                    image: this.productForm.image,
                    isFeatured: this.productForm.isFeatured ? 'true' : 'false',
                    inStock: this.productForm.inStock ? 'true' : 'false',
                    csrf_token: this.csrfToken
                };
                
                if (this.editingProduct) {
                    payload._method = 'PUT';
                    payload.id = this.editingProduct.id;
                }
                
                try {
                    const response = await fetch('api/products.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(payload).toString()
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(data.message);
                        this.showProductModal = false;
                        this.editingProduct = null;
                        this.resetProductForm();
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
                    
                    const response = await fetch('api/products.php', {
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
            
            editCategory(category) {
                this.editingCategory = category;
                this.categoryForm = {
                    name: category.name || '',
                    description: category.description || ''
                };
                this.showCategoryModal = true;
            },
            
            resetCategoryForm() {
                this.categoryForm = {
                    name: '',
                    description: ''
                };
            },
            
            async saveCategory() {
                const payload = {
                    ...this.categoryForm,
                    csrf_token: this.csrfToken
                };
                
                if (this.editingCategory) {
                    payload._method = 'PUT';
                    payload.id = this.editingCategory.id;
                }
                
                try {
                    const response = await fetch('api/categories.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(payload).toString()
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(data.message);
                        this.showCategoryModal = false;
                        this.editingCategory = null;
                        this.resetCategoryForm();
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
                    
                    const response = await fetch('api/categories.php', {
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
            
            async saveSettings() {
                const payload = {
                    ...this.settings,
                    csrf_token: this.csrfToken
                };
                
                try {
                    const response = await fetch('api/settings.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(payload).toString()
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.showNotification(data.message);
                        this.settings = data.data;
                    } else {
                        this.showNotification(data.error || 'Failed to save settings', 'error');
                    }
                } catch (error) {
                    this.showNotification('Failed to save settings', 'error');
                }
            },
            
            async logout() {
                try {
                    const formData = new URLSearchParams({
                        action: 'logout'
                    });
                    
                    await fetch('api/auth.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: formData.toString()
                    });
                    
                    window.location.href = 'index.php';
                } catch (error) {
                    window.location.href = 'index.php';
                }
            }
        });
        
        // Load initial data
        document.addEventListener('DOMContentLoaded', () => {
            const dashboard = Alpine.$data(dashboardElement);
            dashboard.loadProducts();
            dashboard.loadCategories();
            dashboard.loadSettings();
        });
    </script>
</body>
</html>

