"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Package,
  FolderTree,
  Star,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Upload,
  Check,
  Loader2,
  Menu,
  Eye,
  EyeOff,
  ImageOff,
  RefreshCw,
} from "lucide-react";

// Types
interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  comparePrice?: number | null;
  description: string;
  longDescription?: string;
  image: string;
  images?: string[];
  material?: string;
  careInstructions?: string;
  inStock: boolean;
  isFeatured: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  createdAt?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
}

// API base - will work with PHP backend
// In development, PHP runs on port 8080, so use absolute URL
// In production, use relative path (same domain)
const API_BASE = typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '3001')
  ? 'http://localhost:8080/api'
  : '/admin/api';

// Check if we're in dev mode (PHP not available)
let isDevMode = false;

// LocalStorage keys for dev mode
const STORAGE_KEYS = {
  products: "khadi_admin_products",
  categories: "khadi_admin_categories",
  csrfToken: "khadi_admin_csrf_token",
};

// Get data from localStorage (dev mode)
function getLocalData(key: string) {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// Save data to localStorage (dev mode)
function setLocalData(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Get CSRF token from API or localStorage
async function getCsrfToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  
  // Check localStorage first
  const storedToken = localStorage.getItem(STORAGE_KEYS.csrfToken);
  if (storedToken) {
    return storedToken;
  }
  
  // Fetch from API if not in dev mode
  if (!isDevMode) {
    try {
      const res = await fetch(`${API_BASE}/auth.php`, {
        method: "GET",
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.data?.csrf_token || data.csrf_token;
        if (token) {
          localStorage.setItem(STORAGE_KEYS.csrfToken, token);
          return token;
        }
      } else if (res.status === 401) {
        // Auth is disabled or not logged in - generate a client-side token
        // This allows operations to continue when auth is disabled
        const clientToken = 'client-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(STORAGE_KEYS.csrfToken, clientToken);
        return clientToken;
      }
    } catch (error) {
      console.error("Failed to fetch CSRF token:", error);
      // Generate a client-side token as fallback
      const clientToken = 'client-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(STORAGE_KEYS.csrfToken, clientToken);
      return clientToken;
    }
  }
  
  // Generate a client-side token if no token found
  const clientToken = 'client-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(STORAGE_KEYS.csrfToken, clientToken);
  return clientToken;
}

// Helper to convert admin upload paths to backend URL
function getImageUrl(imagePath: string): string {
  if (!imagePath || typeof imagePath !== 'string') return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Skip PHP files and invalid paths - don't convert them
  if (imagePath.includes('.php') || imagePath.includes('dashboard') || imagePath.includes('index.php')) {
    return '';
  }
  
  // If it's an admin upload path, convert to backend URL in development
  if (imagePath.startsWith('/admin/uploads/')) {
    // Validate it's an image file
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasValidExtension = validExtensions.some(ext => imagePath.toLowerCase().endsWith(ext));
    
    if (hasValidExtension && typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '3001')) {
      return `http://localhost:8080${imagePath}`;
    }
  }
  
  return imagePath;
}

// Helper component for admin product images with error handling
function AdminProductImage({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);
  
  if (imageError || !src || src.trim() === '') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-red-400" title="Image failed to load">
        <ImageOff className="w-4 h-4" />
        <span className="text-[8px] mt-0.5 font-medium">Error</span>
      </div>
    );
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      unoptimized
      onError={() => setImageError(true)}
    />
  );
}

// Fallback data loader for development mode (when PHP isn't available)
async function fetchWithFallback(endpoint: string) {
  // First check localStorage for dev mode data
  const localData = getLocalData(STORAGE_KEYS[endpoint as keyof typeof STORAGE_KEYS]);
  
  try {
    const res = await fetch(`${API_BASE}/${endpoint}.php`);
    // Check if we got a valid JSON response (PHP working)
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      isDevMode = false;
      return await res.json();
    }
    throw new Error("Not JSON response");
  } catch {
    // Fallback to localStorage or static JSON data for development
    isDevMode = true;
    console.log(`PHP not available, loading local data for ${endpoint}`);
    
    // If we have localStorage data, use it
    if (localData) {
      if (endpoint === "products") {
        return { products: Array.isArray(localData) ? localData : localData.products || [] };
      }
      if (endpoint === "categories") {
        return { categories: Array.isArray(localData) ? localData : localData.categories || [] };
      }
    }
    
    // Otherwise load from static JSON and save to localStorage
    try {
      const staticRes = await fetch(`/data/${endpoint}.json`);
      const data = await staticRes.json();
      // Save to localStorage for future edits
      setLocalData(STORAGE_KEYS[endpoint as keyof typeof STORAGE_KEYS], data);
      // Normalize the response format
      if (endpoint === "products") {
        return { products: Array.isArray(data) ? data : data.products || [] };
      }
      if (endpoint === "categories") {
        return { categories: Array.isArray(data) ? data : data.categories || [] };
      }
      return data;
    } catch {
      return endpoint === "products" ? { products: [] } : { categories: [] };
    }
  }
}

// Save product (works in both dev and production)
async function saveProduct(product: Product, isNew: boolean): Promise<{ success: boolean; product?: Product; error?: string }> {
  if (isDevMode) {
    // Dev mode: save to localStorage
    const localData = getLocalData(STORAGE_KEYS.products) || { products: [] };
    const products = localData.products || localData;
    
    if (isNew) {
      const newProduct = {
        ...product,
        id: "prod_" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      products.push(newProduct);
      setLocalData(STORAGE_KEYS.products, { products });
      return { success: true, product: newProduct };
    } else {
      const index = products.findIndex((p: Product) => p.id === product.id);
      if (index !== -1) {
        products[index] = { ...products[index], ...product };
        setLocalData(STORAGE_KEYS.products, { products });
        return { success: true, product: products[index] };
      }
      return { success: false, error: "Product not found" };
    }
  }
  
  // Production: use PHP API
  try {
    const csrfToken = await getCsrfToken();
    
    const method = isNew ? "POST" : "PUT";
    const url = isNew ? `${API_BASE}/products.php` : `${API_BASE}/products.php?id=${product.id}`;
    
    // For both POST and PUT, send as form data (PHP expects $_POST for POST and parse_str for PUT)
    const formData = new FormData();
    Object.entries(product).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (value !== null && value !== undefined) {
        // Convert booleans to strings
        if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, String(value));
        }
      }
    });
    if (csrfToken) formData.append('csrf_token', csrfToken);
    
    // For PUT, we need to send as URL-encoded string (not FormData) since PHP uses parse_str
    const body = method === "PUT"
      ? (() => {
          const params = new URLSearchParams();
          Object.entries(product).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              params.append(key, JSON.stringify(value));
            } else if (value !== null && value !== undefined) {
              if (typeof value === 'boolean') {
                params.append(key, value ? 'true' : 'false');
              } else {
                params.append(key, String(value));
              }
            }
          });
          if (csrfToken) params.append('csrf_token', csrfToken);
          return params.toString();
        })()
      : formData;
    
    const res = await fetch(url, {
      method,
      headers: method === "PUT" ? { "Content-Type": "application/x-www-form-urlencoded" } : {},
      body,
      credentials: 'include'
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: errorData.error || `Failed to save: ${res.status}` };
    }
    
    return await res.json();
  } catch (error: any) {
    return { success: false, error: "Failed to save: " + (error.message || "Network error") };
  }
}

// Delete product
async function deleteProduct(id: string): Promise<{ success: boolean }> {
  if (isDevMode) {
    const localData = getLocalData(STORAGE_KEYS.products) || { products: [] };
    const products = (localData.products || localData).filter((p: Product) => p.id !== id);
    setLocalData(STORAGE_KEYS.products, { products });
    return { success: true };
  }
  
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${API_BASE}/products.php?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: csrfToken ? `csrf_token=${encodeURIComponent(csrfToken)}` : '',
      credentials: 'include'
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false };
    }
    return await res.json();
  } catch {
    return { success: false };
  }
}

// Save category
async function saveCategory(category: Category, isNew: boolean): Promise<{ success: boolean; category?: Category; error?: string }> {
  if (isDevMode) {
    const localData = getLocalData(STORAGE_KEYS.categories) || { categories: [] };
    const categories = localData.categories || localData;
    
    if (isNew) {
      const newCategory = {
        ...category,
        id: "cat_" + Date.now(),
      };
      categories.push(newCategory);
      setLocalData(STORAGE_KEYS.categories, { categories });
      return { success: true, category: newCategory };
    } else {
      const index = categories.findIndex((c: Category) => c.id === category.id);
      if (index !== -1) {
        categories[index] = { ...categories[index], ...category };
        setLocalData(STORAGE_KEYS.categories, { categories });
        return { success: true, category: categories[index] };
      }
      return { success: false, error: "Category not found" };
    }
  }
  
  try {
    const csrfToken = await getCsrfToken();
    const method = isNew ? "POST" : "PUT";
    const url = isNew ? `${API_BASE}/categories.php` : `${API_BASE}/categories.php?id=${category.id}`;
    
    // For POST, use FormData; for PUT, use URL-encoded string
    const body = method === "POST"
      ? (() => {
          const formData = new FormData();
          Object.entries(category).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              if (typeof value === 'boolean') {
                formData.append(key, value ? 'true' : 'false');
              } else {
                formData.append(key, String(value));
              }
            }
          });
          if (csrfToken) formData.append('csrf_token', csrfToken);
          return formData;
        })()
      : (() => {
          const params = new URLSearchParams();
          Object.entries(category).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              if (typeof value === 'boolean') {
                params.append(key, value ? 'true' : 'false');
              } else {
                params.append(key, String(value));
              }
            }
          });
          if (csrfToken) params.append('csrf_token', csrfToken);
          return params.toString();
        })();
    
    const res = await fetch(url, {
      method,
      headers: method === "PUT" ? { "Content-Type": "application/x-www-form-urlencoded" } : {},
      body,
      credentials: 'include'
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, error: errorData.error || `Failed to save: ${res.status}` };
    }
    
    return await res.json();
  } catch (error: any) {
    return { success: false, error: "Failed to save: " + (error.message || "Network error") };
  }
}

// Delete category
async function deleteCategory(id: string): Promise<{ success: boolean }> {
  if (isDevMode) {
    const localData = getLocalData(STORAGE_KEYS.categories) || { categories: [] };
    const categories = (localData.categories || localData).filter((c: Category) => c.id !== id);
    setLocalData(STORAGE_KEYS.categories, { categories });
    return { success: true };
  }
  
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${API_BASE}/categories.php?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: csrfToken ? `csrf_token=${encodeURIComponent(csrfToken)}` : '',
      credentials: 'include'
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false };
    }
    return await res.json();
  } catch {
    return { success: false };
  }
}

// Update product featured status
async function updateProductFeatured(id: string, isFeatured: boolean): Promise<{ success: boolean }> {
  if (isDevMode) {
    const localData = getLocalData(STORAGE_KEYS.products) || { products: [] };
    const products = localData.products || localData;
    const index = products.findIndex((p: Product) => p.id === id);
    if (index !== -1) {
      products[index].isFeatured = isFeatured;
      setLocalData(STORAGE_KEYS.products, { products });
      return { success: true };
    }
    return { success: false };
  }
  
  try {
    await fetch(`${API_BASE}/products.php?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured }),
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Admin Panel Component
export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "categories" | "featured">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("khadi_admin_token");
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("khadi_admin_token");
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-cream border-r border-cream/50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
          <div className="p-6 border-b border-cream/50">
            <Image
              src="/Khadi Vasthra White Transparnt.png"
              alt="Khadi Vasthra"
              width={160}
              height={50}
              className="object-contain"
            />
            <p className="text-xs text-text-muted mt-1">Admin Panel</p>
          </div>

        <nav className="p-4 space-y-2">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "featured", label: "Featured", icon: Star },
            { id: "products", label: "Products", icon: Package },
            { id: "categories", label: "Categories", icon: FolderTree },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as typeof activeTab);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? "bg-coral text-white"
                  : "text-text hover:bg-coral/10"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cream/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-text hover:bg-coral/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold text-text capitalize">{activeTab}</h2>
          <div className="text-sm text-text-muted">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === "dashboard" && <DashboardTab key={activeTab} />}
          {activeTab === "products" && <ProductsTab />}
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "featured" && <FeaturedTab />}
        </div>
      </main>
    </div>
  );
}

// Login Page Component
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // PHP API expects form data with action=login
      const formData = new FormData();
      formData.append('action', 'login');
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/auth.php`, {
        method: "POST",
        credentials: 'include', // Important for session cookies
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("khadi_admin_token", data.token || "authenticated");
        // Store CSRF token if provided
        const csrfToken = data.data?.csrf_token || data.csrf_token;
        if (csrfToken) {
          localStorage.setItem(STORAGE_KEYS.csrfToken, csrfToken);
        }
        onLogin();
      } else {
        setError(data.error || "Invalid password");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Fallback for local development without PHP
      if (password === "admin123") {
        localStorage.setItem("khadi_admin_token", "authenticated");
        onLogin();
      } else {
        setError("Invalid password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-coral font-serif mb-2">Khadi Vasthra</h1>
          <p className="text-text-muted">Admin Panel Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent pr-12"
                placeholder="Enter admin password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-coral text-white py-3 rounded-lg font-semibold hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Default password: <code className="bg-gray-100 px-2 py-1 rounded">admin123</code>
        </p>
      </div>
    </div>
  );
}

// Sync Button Component
function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    
    try {
      const res = await fetch(`${API_BASE}/products.php?sync=true`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (res.ok) {
        setSyncMessage('Products synced successfully!');
        setTimeout(() => setSyncMessage(null), 3000);
        // Trigger refresh
        window.dispatchEvent(new Event('productUpdated'));
      } else {
        setSyncMessage('Sync failed. Please try again.');
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (error) {
      setSyncMessage('Sync failed. Please try again.');
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        <RefreshCw className={`w-5 h-5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="font-medium text-text">{isSyncing ? 'Syncing...' : 'Sync to Frontend'}</span>
      </button>
      {syncMessage && (
        <div className={`absolute top-full left-0 right-0 mt-2 p-2 rounded text-sm text-center ${
          syncMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {syncMessage}
        </div>
      )}
    </div>
  );
}

// Dashboard Tab
function DashboardTab() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    featuredProducts: 0,
    inStockProducts: 0,
    missingImages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Listen for product updates from other tabs
    const handleProductUpdate = () => {
      loadStats();
    };
    
    window.addEventListener('productUpdated', handleProductUpdate);
    window.addEventListener('categoryUpdated', handleProductUpdate);
    
    return () => {
      window.removeEventListener('productUpdated', handleProductUpdate);
      window.removeEventListener('categoryUpdated', handleProductUpdate);
    };
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        fetchWithFallback("products"),
        fetchWithFallback("categories"),
      ]);

      const products = productsData.products || [];
      const categories = categoriesData.categories || [];

      // Check for missing images - check if image field is empty OR if image file doesn't exist
      const missingImagesProducts: Product[] = [];
      
      // First, filter products with empty/null/undefined image fields
      const productsWithEmptyImages = products.filter((p: Product) => {
        const imageValue = p.image;
        if (!('image' in p) || imageValue === null || imageValue === undefined) {
          return true;
        }
        if (typeof imageValue !== 'string') {
          return true;
        }
        if (imageValue.trim() === '') {
          return true;
        }
        return false;
      });

      missingImagesProducts.push(...productsWithEmptyImages);

      // Then, check if image files exist for products with file paths (not data URIs)
      const productsWithFilePaths = products.filter((p: Product) => {
        if (!p.image || typeof p.image !== 'string') return false;
        // Skip base64 data URIs and external URLs
        if (p.image.startsWith('data:') || p.image.startsWith('http://') || p.image.startsWith('https://')) {
          return false;
        }
        return true;
      });

      // Check each image file exists by making HTTP requests
      const imageCheckPromises = productsWithFilePaths.map(async (p: Product) => {
        const imagePath = p.image;
        if (!imagePath || imagePath.startsWith('data:') || imagePath.startsWith('http')) {
          return { product: p, exists: true };
        }
        
        try {
          // Try to load the image to see if it exists
          // Use HEAD request first, fallback to GET if HEAD fails
          let response: Response;
          try {
            response = await fetch(imagePath, { method: 'HEAD', cache: 'no-cache' });
          } catch {
            // HEAD might not be supported, try GET with small timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            try {
              response = await fetch(imagePath, { method: 'GET', cache: 'no-cache', signal: controller.signal });
            } catch {
              response = new Response(null, { status: 404, statusText: 'Not Found' });
            } finally {
              clearTimeout(timeoutId);
            }
          }
          
          const exists = response.ok && response.status !== 404;
          return { product: p, exists };
        } catch (error) {
          // If we can't check (e.g., network error, timeout), mark as missing
          return { product: p, exists: false };
        }
      });

      const imageCheckResults = await Promise.all(imageCheckPromises);
      const productsWithMissingFiles = imageCheckResults
        .filter(result => !result.exists)
        .map(result => result.product);

      missingImagesProducts.push(...productsWithMissingFiles);

      setStats({
        totalProducts: products.length,
        totalCategories: categories.length,
        featuredProducts: products.filter((p: Product) => p.isFeatured).length,
        inStockProducts: products.filter((p: Product) => p.inStock !== false).length,
        missingImages: missingImagesProducts.length,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: "Total Products", value: stats.totalProducts, color: "bg-coral", icon: Package },
          { label: "Categories", value: stats.totalCategories, color: "bg-orange", icon: FolderTree },
          { label: "Featured", value: stats.featuredProducts, color: "bg-yellow-500", icon: Star },
          { label: "In Stock", value: stats.inStockProducts, color: "bg-green-500", icon: Check },
          { label: "Missing Images", value: stats.missingImages, color: stats.missingImages > 0 ? "bg-red-500" : "bg-gray-400", icon: ImageOff },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-3xl font-bold text-text mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-text mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = "/admin?tab=products&action=add"}
            className="flex items-center gap-3 p-4 bg-coral/10 rounded-lg hover:bg-coral/20 transition-colors"
          >
            <Plus className="w-5 h-5 text-coral" />
            <span className="font-medium text-text">Add New Product</span>
          </button>
          <button
            onClick={() => window.location.href = "/admin?tab=categories&action=add"}
            className="flex items-center gap-3 p-4 bg-orange/10 rounded-lg hover:bg-orange/20 transition-colors"
          >
            <FolderTree className="w-5 h-5 text-orange" />
            <span className="font-medium text-text">Add Category</span>
          </button>
          <SyncButton />
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <Eye className="w-5 h-5 text-green-600" />
            <span className="font-medium text-text">View Store</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Products Tab
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        fetchWithFallback("products"),
        fetchWithFallback("categories"),
      ]);

      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const result = await deleteProduct(id);
    if (result.success) {
      setProducts(products.filter((p) => p.id !== id));
      // Trigger event to refresh dashboard stats
      window.dispatchEvent(new Event('productUpdated'));
    } else {
      alert("Failed to delete product");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="bg-coral text-white px-6 py-2 rounded-lg font-semibold hover:bg-coral-dark transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text">Image</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text">Price</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-text">Featured</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className={`w-12 h-16 rounded-lg overflow-hidden relative ${product.image ? 'bg-gray-100' : 'bg-red-50 border-2 border-dashed border-red-300'}`}>
                      {product.image ? (
                        <AdminProductImage src={getImageUrl(product.image)} alt={product.name} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-red-400" title="No image - click to edit">
                          <Upload className="w-4 h-4" />
                          <span className="text-[8px] mt-0.5 font-medium">No img</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-text truncate max-w-[200px]">{product.name}</p>
                    <p className="text-sm text-text-muted truncate max-w-[200px]">{product.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-cream rounded-full text-sm">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-orange">₹{product.price}</span>
                    {product.comparePrice && (
                      <span className="ml-2 text-sm text-text-muted line-through">
                        ₹{product.comparePrice}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        product.inStock !== false
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.inStock !== false ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.isFeatured && (
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No products found
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            loadData();
            setShowModal(false);
            setEditingProduct(null);
            // Trigger event to refresh dashboard stats
            window.dispatchEvent(new Event('productUpdated'));
          }}
        />
      )}
    </div>
  );
}

// Product Modal
function ProductModal({
  product,
  categories,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    slug: "",
    category: categories[0]?.name || "",
    price: 0,
    comparePrice: null,
    description: "",
    longDescription: "",
    image: "",
    material: "",
    careInstructions: "",
    inStock: true,
    isFeatured: false,
    isNew: false,
    isBestSeller: false,
    ...product,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: product ? formData.slug : generateSlug(name),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);
      formDataUpload.append("type", "main"); // Main product image
      
      // Use product ID if editing, or generate one from slug if new
      const productId = product?.id || (formData.slug ? formData.slug.replace(/-/g, '_') : `prod_${Date.now()}`);
      formDataUpload.append("productId", productId);
      
      // Pass product name for filename (preferred over product ID)
      const productName = formData.name || product?.name;
      if (productName) {
        formDataUpload.append("productName", productName);
      }

      const res = await fetch(`${API_BASE}/upload.php`, {
        method: "POST",
        body: formDataUpload,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (data.success) {
        // Use the standardized path from API
        setFormData({ ...formData, image: data.data?.path || data.path });
      } else {
        alert(data.error || "Upload failed. Please use the Image URL input field to enter the image path manually.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      // Fallback: use local preview (but don't save blob URL to formData - it's in browser memory)
      // Instead, alert user to manually upload via URL input
      alert("Upload failed: " + (error.message || "Please use the Image URL input field to enter the image path manually."));
      const reader = new FileReader();
      reader.onloadend = () => {
        // Preview only - don't save blob URL
        // setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const productData = {
        ...formData,
        id: product?.id || "",
      } as Product;
      
      const result = await saveProduct(productData, !product);

      if (result.success) {
        onSave();
      } else {
        alert(result.error || "Failed to save product");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text">
            {product ? "Edit Product" : "Add New Product"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Price *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                required
                min="0"
              />
            </div>

            {/* Compare Price */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Compare Price</label>
              <input
                type="number"
                value={formData.comparePrice || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    comparePrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                min="0"
              />
            </div>

            {/* Material */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Material</label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="e.g., 100% Cotton"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text mb-2">Short Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Long Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text mb-2">Long Description</label>
              <textarea
                value={formData.longDescription}
                onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                rows={4}
              />
            </div>

            {/* Care Instructions */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text mb-2">Care Instructions</label>
              <textarea
                value={formData.careInstructions}
                onChange={(e) => setFormData({ ...formData, careInstructions: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
                rows={2}
                placeholder="e.g., Hand wash separately in cold water. Do not bleach."
              />
            </div>

            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text mb-2">Product Image</label>
              <div className="flex gap-4 items-start">
                <div className={`w-24 h-32 rounded-lg overflow-hidden relative border-2 border-dashed ${formData.image ? 'bg-gray-100 border-gray-300' : 'bg-red-50 border-red-300'}`}>
                  {formData.image ? (
                    <Image
                      src={getImageUrl(formData.image)}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-400">
                      <Upload className="w-8 h-8" />
                      <span className="text-xs mt-1 font-medium text-center">Upload<br/>Image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      isUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploading ? "Uploading..." : "Upload Image"}
                  </label>
                  <p className="mt-2 text-sm text-text-muted">Or enter image URL:</p>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                    placeholder="/images/products/{productId}.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "inStock", label: "In Stock" },
                { key: "isFeatured", label: "Featured" },
                { key: "isNew", label: "New Arrival" },
                { key: "isBestSeller", label: "Best Seller" },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div
                    onClick={() =>
                      setFormData({
                        ...formData,
                        [toggle.key]: !formData[toggle.key as keyof typeof formData],
                      })
                    }
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      formData[toggle.key as keyof typeof formData]
                        ? "bg-coral"
                        : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        formData[toggle.key as keyof typeof formData]
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </div>
                  <span className="text-sm">{toggle.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-coral text-white rounded-lg font-semibold hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {product ? "Update Product" : "Add Product"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Categories Tab
function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchWithFallback("categories");
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const result = await deleteCategory(id);
    if (result.success) {
      setCategories(categories.filter((c) => c.id !== id));
      // Trigger event to refresh dashboard stats
      window.dispatchEvent(new Event('categoryUpdated'));
    } else {
      alert("Failed to delete category");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">
          {categories.length} Categories
        </h3>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="bg-coral text-white px-6 py-2 rounded-lg font-semibold hover:bg-coral-dark transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Image</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Description</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text">Order</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className={`w-12 h-12 rounded-lg overflow-hidden relative ${category.image ? 'bg-gray-100' : 'bg-amber-50 border border-dashed border-amber-300'}`}>
                      {category.image ? (
                        <AdminProductImage src={getImageUrl(category.image)} alt={category.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-400">
                          <Upload className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text">{category.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-text-muted">{category.slug}</code>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-text-muted truncate max-w-[200px]">
                      {category.description || "No description"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium">
                      {category.displayOrder}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        category.isActive !== false
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {category.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setShowModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No categories found. Add your first category!
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
          onSave={() => {
            loadCategories();
            setShowModal(false);
            setEditingCategory(null);
            // Trigger event to refresh dashboard stats
            window.dispatchEvent(new Event('categoryUpdated'));
          }}
        />
      )}
    </div>
  );
}

// Category Modal
function CategoryModal({
  category,
  onClose,
  onSave,
}: {
  category: Category | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Category>>({
    name: "",
    slug: "",
    description: "",
    image: "",
    displayOrder: 1,
    isActive: true,
    ...category,
  });
  const [isLoading, setIsLoading] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: category ? formData.slug : generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const categoryData = {
        ...formData,
        id: category?.id || "",
      } as Category;
      
      const result = await saveCategory(categoryData, !category);

      if (result.success) {
        onSave();
      } else {
        alert(result.error || "Failed to save category");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text">
            {category ? "Edit Category" : "Add New Category"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Image URL
            </label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
              placeholder="/images/categories/..."
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) =>
                setFormData({ ...formData, displayOrder: Number(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-transparent"
              min="1"
            />
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                formData.isActive ? "bg-coral" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.isActive ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm">Active</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-coral text-white rounded-lg font-semibold hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {category ? "Update" : "Add Category"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Featured Tab
function FeaturedTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchWithFallback("products");
      const prods = data.products || [];
      setProducts(prods);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Only show featured products
  const featuredProducts = products.filter((p) => p.isFeatured);

  const handleRemoveFeatured = async (productId: string) => {
    const result = await updateProductFeatured(productId, false);
    if (result.success) {
      // Update local state
      setProducts(products.map(p => 
        p.id === productId ? { ...p, isFeatured: false } : p
      ));
    } else {
      alert("Failed to remove from featured");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text">
            Featured Products
          </h3>
          <p className="text-sm text-text-muted">
            Products currently shown in the featured section ({featuredProducts.length} products)
          </p>
        </div>
        <p className="text-sm text-text-muted">
          To add/remove featured products, edit the product in the Products tab
        </p>
      </div>

      {/* Featured Products List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Image</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Product Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Price</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-text">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {featuredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className={`w-10 h-14 rounded-lg overflow-hidden relative ${product.image ? 'bg-gray-100' : 'bg-red-50 border border-dashed border-red-300'}`}>
                      {product.image ? (
                        <AdminProductImage src={getImageUrl(product.image)} alt={product.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-red-400">
                          <Upload className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text truncate max-w-[200px]">{product.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-muted">{product.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-orange">₹{product.price}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemoveFeatured(product.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from featured"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {featuredProducts.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No featured products. Mark products as featured in the Products tab.
          </div>
        )}
      </div>
    </div>
  );
}
