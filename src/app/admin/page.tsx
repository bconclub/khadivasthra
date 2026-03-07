"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getDashboardStats } from "@/lib/services/admin";
import { getOrders } from "@/lib/services/orders";
import {
  Package, FolderOpen, ShoppingCart, IndianRupee, Loader2, Eye,
  BarChart3, ShoppingBasket, TrendingUp, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AdminDashboardPage() {
  const { data: stats, loading: loadingStats } = useSupabaseQuery(getDashboardStats);
  const { data: orders, loading: loadingOrders } = useSupabaseQuery(getOrders);

  const recentOrders = (orders || []).slice(0, 5);

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome to Khadi Vasthra Admin</p>
        </div>

        {/* Stat Cards */}
        {loadingStats ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Primary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Traffic"
                value={(stats?.totalViews ?? 0).toLocaleString()}
                icon={BarChart3}
                color="bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
                subtitle="Product views"
              />
              <StatCard
                label="Orders"
                value={stats?.totalOrders ?? 0}
                icon={ShoppingCart}
                color="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                href="/admin/orders"
                subtitle={`${stats?.pendingOrders ?? 0} pending, ${stats?.confirmedOrders ?? 0} confirmed`}
              />
              <StatCard
                label="Cart Abandon"
                value={stats?.abandonedCarts ?? 0}
                icon={ShoppingBasket}
                color="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                subtitle={`₹${(stats?.abandonedValue ?? 0).toLocaleString()} lost`}
              />
              <StatCard
                label="Revenue"
                value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`}
                icon={IndianRupee}
                color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                subtitle={`₹${(stats?.totalOrderValue ?? 0).toLocaleString()} total`}
              />
            </div>
            {/* Secondary Stats */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniStat icon={Package} label="Products" value={stats?.totalProducts ?? 0} href="/admin/products" />
              <MiniStat icon={FolderOpen} label="Categories" value={stats?.totalCategories ?? 0} href="/admin/categories" />
              <MiniStat icon={Clock} label="Pending" value={stats?.pendingOrders ?? 0} />
              <MiniStat icon={CheckCircle2} label="Confirmed" value={stats?.confirmedOrders ?? 0} />
              <MiniStat icon={XCircle} label="Cancelled" value={stats?.cancelledOrders ?? 0} />
              <MiniStat icon={TrendingUp} label="Order Value" value={`₹${(stats?.totalOrderValue ?? 0).toLocaleString()}`} />
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-coral hover:underline">
              View all
            </Link>
          </div>

          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-coral" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              No orders yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentOrders.map((order) => (
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
