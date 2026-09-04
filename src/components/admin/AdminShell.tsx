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
  Users,
  Briefcase,
  Shirt,
  Store,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSection } from "@/types";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; section: AdminSection }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
  { href: "/admin/products", label: "Products", icon: Package, section: "products" },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen, section: "categories" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, section: "orders" },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon, section: "banners" },
  { href: "/admin/looks", label: "Shop the Look", icon: Shirt, section: "looks" },
  { href: "/admin/combos", label: "Combos", icon: Gift, section: "combos" },
  { href: "/admin/wholesale", label: "Wholesale", icon: Store, section: "wholesale" },
  { href: "/admin/settings", label: "Settings", icon: Settings, section: "settings" },
  { href: "/admin/investors", label: "Investors", icon: Briefcase, section: "investors" },
  { href: "/admin/users", label: "Users", icon: Users, section: "users" },
];

// Resolve the permission a given pathname requires (longest prefix wins).
function sectionForPath(pathname: string): AdminSection {
  const match = [...NAV_ITEMS]
    .filter((i) => pathname === i.href || (i.href !== "/admin" && pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.section ?? "dashboard";
}

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
  const { user, profile, ready, signOut, hasPermission } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();

  const navItems = NAV_ITEMS.filter((item) => hasPermission(item.section));
  const firstAllowedHref = navItems[0]?.href;

  // Redirect away from sections the user can't access.
  useEffect(() => {
    if (!ready || !user || !profile) return;
    const required = sectionForPath(pathname);
    if (!hasPermission(required) && firstAllowedHref && pathname !== firstAllowedHref) {
      router.replace(firstAllowedHref);
    }
  }, [ready, user, profile, pathname, hasPermission, firstAllowedHref, router]);

  if (!ready) {
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

  // Logged in but no active admin profile / no permissions at all.
  if (!profile || navItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
        <p className="text-gray-700 font-medium">Your account has no admin access.</p>
        <p className="text-sm text-gray-500">Ask a super admin to grant you section permissions.</p>
        <button
          onClick={async () => { await signOut(); router.push("/admin/login"); }}
          className="text-sm text-coral hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/admin/login");
  };

  // Guard: block rendering protected content the user can't access
  // (redirect above handles navigation; this prevents a flash).
  const requiredSection = sectionForPath(pathname);
  const allowed = hasPermission(requiredSection);

  return (
    <div className={cn("min-h-screen flex", dark ? "dark" : "")}>
      <div className="min-h-screen flex flex-1 bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Desktop Sidebar — fixed overlay, collapses to icons, expands on hover */}
        <aside className="hidden lg:flex lg:flex-col fixed top-0 left-0 h-screen z-50 w-16 hover:w-52 transition-[width] duration-200 ease-in-out overflow-hidden group bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="h-16 px-3 border-b border-gray-100 dark:border-gray-700 flex items-center overflow-hidden">
            <Link href="/admin" className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">K</div>
              <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="text-base font-bold text-coral font-serif whitespace-nowrap">Khadi Vasthra</div>
                <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">Admin Panel <span className="text-gray-300 dark:text-gray-600">v{process.env.NEXT_PUBLIC_APP_VERSION}</span></p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-2 space-y-1 overflow-hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-coral/10 text-coral"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-2 border-t border-gray-100 dark:border-gray-700 space-y-1 overflow-hidden">
            <button
              onClick={toggleDark}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 w-full transition-colors"
            >
              {dark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
              <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150">{dark ? "Light Mode" : "Dark Mode"}</span>
            </button>
            <div className="text-xs text-gray-400 dark:text-gray-500 px-3 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate">
              {user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 w-full transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150">Sign Out</span>
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
              {navItems.map((item) => {
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

        {/* Main Content — offset by collapsed sidebar width */}
        <main className="flex-1 min-w-0 overflow-x-hidden lg:overflow-y-auto lg:pl-16">
          <div className="lg:p-8 p-4 pt-18 lg:pt-8">
            {allowed ? (
              children
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-coral mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting…</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
