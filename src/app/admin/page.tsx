"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getDashboardStats } from "@/lib/services/admin";
import { getOrders } from "@/lib/services/orders";
import {
  Package, FolderOpen, ShoppingCart, IndianRupee, Loader2, Eye,
  BarChart3, ShoppingBasket, TrendingUp, Clock, CheckCircle2, XCircle,
  Search, Banknote, CreditCard, Wallet,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";

type DateRange = "all" | "this_month" | "last_month" | "custom";

export default function AdminDashboardPage() {
  const { data: stats, loading: loadingStats } = useSupabaseQuery(getDashboardStats);
  const { data: orders, loading: loadingOrders } = useSupabaseQuery(getOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateBounds = useMemo(() => {
    const now = new Date();
    if (dateRange === "this_month") {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    }
    if (dateRange === "last_month") {
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    }
    if (dateRange === "custom") {
      if (!customStart && !customEnd) return null;
      return { start: customStart ? new Date(customStart + "T00:00:00") : new Date(0), end: customEnd ? new Date(customEnd + "T23:59:59.999") : new Date() };
    }
    return null;
  }, [dateRange, customStart, customEnd]);

  // Orders within selected date range (or all if "all time")
  const ordersInRange = useMemo(() => {
    if (!orders) return [];
    if (!dateBounds) return orders;
    return orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= dateBounds.start && d <= dateBounds.end;
    });
  }, [orders, dateBounds]);

  // Compute filtered stats from ordersInRange (overrides server stats when range != all)
  const filteredStats = useMemo(() => {
    if (dateRange === "all") return null;
    const active = ordersInRange.filter((o) => ["confirmed", "shipped", "delivered", "billed"].includes(o.status));
    const totalRevenue = active.reduce((s, o) => s + Number(o.total), 0);
    const codRevenue = active.filter((o) => o.payment_method === "cod" && o.settlement_status === "settled").reduce((s, o) => s + Number(o.total), 0);
    const codPending = active.filter((o) => o.payment_method === "cod" && (o.settlement_status === "pending" || !o.settlement_status)).reduce((s, o) => s + Number(o.total), 0);
    const prepaidRevenue = active.filter((o) => o.payment_method !== "cod").reduce((s, o) => s + Number(o.total), 0);
    const totalOrderValue = ordersInRange.reduce((s, o) => s + Number(o.total), 0);
    const abandoned = ordersInRange.filter((o) => (o.status === "pending" || o.status === "cancelled") && o.payment_status !== "paid");
    const abandonedValue = abandoned.reduce((s, o) => s + Number(o.total), 0);
    return {
      totalOrders: ordersInRange.length,
      pendingOrders: ordersInRange.filter((o) => o.status === "pending").length,
      confirmedOrders: ordersInRange.filter((o) => o.status === "confirmed").length,
      cancelledOrders: ordersInRange.filter((o) => o.status === "cancelled").length,
      codOrders: ordersInRange.filter((o) => o.payment_method === "cod").length,
      prepaidOrders: ordersInRange.filter((o) => o.payment_method !== "cod").length,
      totalRevenue, codRevenue, codPending, prepaidRevenue,
      totalOrderValue, abandonedCarts: abandoned.length, abandonedValue,
    };
  }, [ordersInRange, dateRange]);

  // Use filteredStats if a date range is selected, otherwise server stats
  const displayStats = filteredStats ?? stats;

  // Filter orders based on search query (within the date range)
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return ordersInRange.slice(0, 5);
    const query = searchQuery.toLowerCase().trim();
    return ordersInRange.filter(order => (
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_phone.includes(query)
    ));
  }, [ordersInRange, searchQuery]);

  const displayOrders = searchQuery.trim() ? filteredOrders : ordersInRange.slice(0, 5);
  const isSearching = searchQuery.trim().length > 0;

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome to Khadi Vasthra Admin</p>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">Showing</span>
          {([
            { key: "all", label: "All time" },
            { key: "this_month", label: "This month" },
            { key: "last_month", label: "Last month" },
            { key: "custom", label: "Custom" },
          ] as { key: DateRange; label: string }[]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateRange === opt.key
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {dateRange === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              <span className="text-gray-400 text-sm">→</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          )}
        </div>

        {/* Revenue Stats - Row 1 */}
        {loadingStats ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Revenue Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Revenue"
                value={`₹${(displayStats?.totalRevenue ?? 0).toLocaleString()}`}
                icon={IndianRupee}
                color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                subtitle="Confirmed/shipped/delivered"
              />
              <StatCard
                label="COD Revenue"
                value={`₹${(displayStats?.codRevenue ?? 0).toLocaleString()}`}
                icon={Banknote}
                color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                subtitle="Settled COD"
              />
              <StatCard
                label="COD Pending"
                value={`₹${(displayStats?.codPending ?? 0).toLocaleString()}`}
                icon={Wallet}
                color="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                subtitle="Awaiting settlement"
              />
              <StatCard
                label="Prepaid Revenue"
                value={`₹${(displayStats?.prepaidRevenue ?? 0).toLocaleString()}`}
                icon={CreditCard}
                color="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                subtitle="Online payments"
              />
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Cart Abandon"
                value={`₹${(displayStats?.abandonedValue ?? 0).toLocaleString()}`}
                icon={ShoppingBasket}
                color="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                subtitle={`${displayStats?.abandonedCarts ?? 0} abandoned carts`}
              />
              <StatCard
                label="Total Orders"
                value={displayStats?.totalOrders ?? 0}
                icon={ShoppingCart}
                color="bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
                href="/admin/orders"
                subtitle="All orders"
              />
              <StatCard
                label="COD Orders"
                value={displayStats?.codOrders ?? 0}
                icon={Banknote}
                color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                subtitle="Cash on delivery"
              />
              <StatCard
                label="Prepaid Orders"
                value={displayStats?.prepaidOrders ?? 0}
                icon={CreditCard}
                color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                subtitle="Online payment"
              />
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniStat icon={Package} label="Products" value={stats?.totalProducts ?? 0} href="/admin/products" />
              <MiniStat icon={FolderOpen} label="Categories" value={stats?.totalCategories ?? 0} href="/admin/categories" />
              <MiniStat icon={Clock} label="Pending" value={displayStats?.pendingOrders ?? 0} />
              <MiniStat icon={CheckCircle2} label="Confirmed" value={displayStats?.confirmedOrders ?? 0} />
              <MiniStat icon={XCircle} label="Cancelled" value={displayStats?.cancelledOrders ?? 0} />
              <MiniStat icon={TrendingUp} label="Order Value" value={`₹${(displayStats?.totalOrderValue ?? 0).toLocaleString()}`} />
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search orders by ID, name, or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Recent Orders / Search Results */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {isSearching ? `Search Results (${displayOrders.length})` : (dateRange === "all" ? "Recent Orders" : `Orders — ${dateRange === "this_month" ? "This month" : dateRange === "last_month" ? "Last month" : "Custom range"} (${ordersInRange.length})`)}
            </h2>
            <Link href="/admin/orders" className="text-sm text-coral hover:underline">
              View all
            </Link>
          </div>

          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-coral" />
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              {isSearching ? 'No orders found matching your search' : 'No orders yet'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayOrders.map((order) => (
                <Link key={order.id} href="/admin/orders" className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Product thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border border-gray-200 dark:border-gray-600">
                    {order.items?.[0]?.product_image ? (
                      <Image
                        src={order.items[0].product_image}
                        alt=""
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-500">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-coral font-medium">{order.order_number}</span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate">{order.customer_name}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {order.items?.map((i) => i.product_name).join(", ")}
                    </p>
                  </div>
                  {/* Amount */}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">₹{Number(order.total).toLocaleString()}</span>
                  {/* Badges */}
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.payment_status} />
                  {/* Date */}
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap hidden lg:block">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/products" className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center">
            <Package className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage Products</span>
          </Link>
          <Link href="/admin/categories" className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center">
            <FolderOpen className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage Categories</span>
          </Link>
          <Link href="/admin/orders" className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center">
            <ShoppingCart className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Orders</span>
          </Link>
          <Link href="/" target="_blank" className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center">
            <Eye className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Store</span>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, icon: Icon, color, href, subtitle }: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href?: string;
  subtitle?: string;
}) {
  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow p-5">
      <div className={`inline-flex p-2.5 rounded-lg ${color} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function MiniStat({ icon: Icon, label, value, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  href?: string;
}) {
  const content = (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-bold text-gray-900 dark:text-white ml-auto">{value}</span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "paid" ? "Paid" : status === "failed" ? "Failed" : "Unpaid"}
    </span>
  );
}
