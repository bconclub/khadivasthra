"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
  ImageIcon,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin-dark-mode");
    if (stored === "true") setDark(true);
  }, []);

  const toggle = () => {
    setDark((prev) => {
      localStorage.setItem("admin-dark-mode", String(!prev));
      return !prev;
    });
  };

  return { dark, toggle };
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!user) {
    router.push("/admin/login");
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/admin/login");
  };

  return (
    <div className={cn("min-h-screen flex", dark ? "dark" : "")}>
      <div className="min-h-screen flex flex-1 bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <Link href="/admin" className="text-xl font-bold text-coral font-serif">
              Khadi Vasthra
            </Link>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Admin Panel</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-coral/10 text-coral"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 w-full transition-colors"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {dark ? "Light Mode" : "Dark Mode"}
            </button>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 px-4 truncate">
              {user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 w-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 shadow-sm">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/admin" className="text-lg font-bold text-coral font-serif">
              Khadi Vasthra
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDark}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-coral/10 hover:text-coral transition-colors"
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-coral/10 hover:text-coral transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-2 shadow-lg max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-coral/10 text-coral" : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 w-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 lg:overflow-y-auto">
          <div className="lg:p-8 p-4 pt-18 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
