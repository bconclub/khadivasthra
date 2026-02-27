"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getOrders, updateOrderStatus, createShiprocketOrder } from "@/lib/services/orders";
import type { OrderStatus } from "@/types";
import { Loader2, ChevronDown, ChevronUp, Truck, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function AdminOrdersPage() {
  const { data: orders, loading, refetch } = useSupabaseQuery(getOrders);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [creatingShipment, setCreatingShipment] = useState<string | null>(null);

  const allOrders = orders || [];
  const filtered = statusFilter
    ? allOrders.filter((o) => o.status === statusFilter)
    : allOrders;

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleCreateShipment = async (orderId: string) => {
    setCreatingShipment(orderId);
    try {
      const result = await createShiprocketOrder(orderId);
      toast.success(`Shipment created${result.awb_code ? ` - AWB: ${result.awb_code}` : ""}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shipment");
    } finally {
      setCreatingShipment(null);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-500 mt-1">{allOrders.length} total orders</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !statusFilter ? "bg-coral text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All ({allOrders.length})
          </button>
          {STATUS_OPTIONS.map((status) => {
            const count = allOrders.filter((o) => o.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  statusFilter === status ? "bg-coral text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm border border-gray-200">
            No orders found
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Order Header */}
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex items-center gap-6 flex-wrap">
                    <span className="font-mono text-sm font-medium text-coral">
                      {order.order_number}
                    </span>
                    <span className="text-sm text-gray-900 font-medium">
                      {order.customer_name}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      ₹{Number(order.total).toLocaleString()}
                    </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-700"}`}>
                      {order.status}
                    </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_STYLES[order.payment_status] || "bg-gray-100 text-gray-700"}`}>
                      {order.payment_status === "paid" ? "Paid" : order.payment_status === "failed" ? "Pay Failed" : "Unpaid"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {expandedOrder === order.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Expanded Details */}
                {expandedOrder === order.id && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Customer Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Details</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Name:</span> {order.customer_name}</p>
                          <p><span className="text-gray-500">Phone:</span> {order.customer_phone}</p>
                          {order.customer_email && (
                            <p><span className="text-gray-500">Email:</span> {order.customer_email}</p>
                          )}
                          <p><span className="text-gray-500">Address:</span> {order.customer_address}</p>
                          <p><span className="text-gray-500">City:</span> {order.customer_city}, {order.customer_state} - {order.customer_pincode}</p>
                          {order.notes && (
                            <p><span className="text-gray-500">Notes:</span> {order.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Details</h3>
                        <div className="space-y-2 text-sm mb-4">
                          <p>
                            <span className="text-gray-500">Payment Status:</span>{" "}
                            <span className={`font-medium ${
                              order.payment_status === "paid" ? "text-green-600" :
                              order.payment_status === "failed" ? "text-red-600" : "text-yellow-600"
                            }`}>
                              {order.payment_status?.toUpperCase() || "PENDING"}
                            </span>
                          </p>
                          {order.razorpay_order_id && (
                            <p><span className="text-gray-500">Razorpay Order:</span> {order.razorpay_order_id}</p>
                          )}
                          {order.razorpay_payment_id && (
                            <p><span className="text-gray-500">Payment ID:</span> {order.razorpay_payment_id}</p>
                          )}
                        </div>
                      </div>

                      {/* Shipping Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                          <Truck className="w-4 h-4" /> Shipping Details
                        </h3>
                        {order.shiprocket_order_id ? (
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Shiprocket ID:</span> {order.shiprocket_order_id}</p>
                            {order.awb_code && (
                              <p><span className="text-gray-500">AWB:</span> {order.awb_code}</p>
                            )}
                            {order.courier_name && (
                              <p><span className="text-gray-500">Courier:</span> {order.courier_name}</p>
                            )}
                            {order.tracking_url && (
                              <a
                                href={order.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-coral hover:underline text-sm"
                              >
                                <ExternalLink className="w-3 h-3" /> Track shipment
                              </a>
                            )}
                          </div>
                        ) : order.payment_status === "paid" ? (
                          <button
                            onClick={() => handleCreateShipment(order.id)}
                            disabled={creatingShipment === order.id}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {creatingShipment === order.id ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                            ) : (
                              <><Truck className="w-4 h-4" /> Create Shipment</>
                            )}
                          </button>
                        ) : (
                          <p className="text-sm text-gray-400">Payment required before shipping</p>
                        )}
                      </div>

                      {/* Order Items & Status */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h3>
                        <div className="space-y-2 mb-4">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {item.product_name} x {item.quantity}
                              </span>
                              <span className="font-medium text-gray-900">
                                ₹{Number(item.subtotal).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                            <span>Total</span>
                            <span>₹{Number(order.total).toLocaleString()}</span>
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Update Status</h3>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="capitalize">
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
