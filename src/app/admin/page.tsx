"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getDashboardStats } from "@/lib/services/admin";
import { getOrders } from "@/lib/services/orders";
import {
  Package, FolderOpen, ShoppingCart, IndianRupee, Loader2, Eye,
  BarChart3, ShoppingBasket, XCircle, TrendingUp, Clock, CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { data: stats, loading: loadingStats } = useSupabaseQuery(getDashboardStats);
  const { data: orders, loading: loadingOrders } = useSupabaseQuery(getOrders);

  const recentOrders = (orders || []).slice(0, 5);

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to Khadi Vasthra Admin</p>
        </div>

        {/* Stat Cards */}
        {loadingStats ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : (
          <>
            {/* Primary Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Traffic"
                value={(stats?.totalViews ?? 0).toLocaleString()}
                icon={BarChart3}
                color="bg-cyan-50 text-cyan-600"
                subtitle="Product views"
              />
              <StatCard
                label="Orders"
                value={stats?.totalOrders ?? 0}
                icon={ShoppingCart}
                color="bg-purple-50 text-purple-600"
                href="/admin/orders"
              />
              <StatCard
                label="Lost Carts"
                value={stats?.lostCarts ?? 0}
                icon={ShoppingBasket}
                color="bg-amber-50 text-amber-600"
                subtitle="Unpaid checkouts"
              />
              <StatCard
                label="Revenue"
                value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`}
                icon={IndianRupee}
                color="bg-green-50 text-green-600"
                subtitle="Paid orders"
              />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                label="Products"
                value={stats?.totalProducts ?? 0}
                icon={Package}
                color="bg-blue-50 text-blue-600"
                href="/admin/products"
                small
              />
              <StatCard
                label="Categories"
                value={stats?.totalCategories ?? 0}
                icon={FolderOpen}
                color="bg-green-50 text-green-600"
                href="/admin/categories"
                small
              />
              <StatCard
                label="Pending"
                value={stats?.pendingOrders ?? 0}
                icon={Clock}
                color="bg-yellow-50 text-yellow-600"
                small
              />
              <StatCard
                label="Confirmed"
                value={stats?.confirmedOrders ?? 0}
                icon={CheckCircle2}
                color="bg-blue-50 text-blue-600"
                small
              />
              <StatCard
                label="Total Order Value"
                value={`₹${(stats?.totalOrderValue ?? 0).toLocaleString()}`}
                icon={TrendingUp}
                color="bg-orange-50 text-orange-600"
                small
              />
            </div>
          </>
        )}

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Order</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-mono text-coral">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        ₹{Number(order.total).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-3">
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/products" className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
            <Package className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Manage Products</span>
          </Link>
          <Link href="/admin/categories" className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
            <FolderOpen className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Manage Categories</span>
          </Link>
          <Link href="/admin/orders" className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
            <ShoppingCart className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">View Orders</span>
          </Link>
          <Link href="/" target="_blank" className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
            <Eye className="w-8 h-8 text-coral mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">View Store</span>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, icon: Icon, color, href, subtitle, small }: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href?: string;
  subtitle?: string;
  small?: boolean;
}) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`inline-flex p-2 rounded-lg ${color}`}>
          <Icon className={small ? "w-4 h-4" : "w-5 h-5"} />
        </div>
      </div>
      <p className={`font-bold text-gray-900 ${small ? "text-lg" : "text-2xl"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "paid" ? "Paid" : status === "failed" ? "Failed" : "Unpaid"}
    </span>
  );
}
