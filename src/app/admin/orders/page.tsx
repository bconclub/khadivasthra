"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getOrders, updateOrderStatus, updateOrder, checkPaymentStatus } from "@/lib/services/orders";
import { deleteOrder } from "@/lib/services/admin";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus, Product, PaymentMethod, PaymentStatus } from "@/types";
import { Loader2, ChevronDown, ChevronUp, Trash2, CreditCard, Package, Plus, Search, X, Minus, Pencil, Printer, FileText, Tag, CheckSquare, Download } from "lucide-react";
import { printOrder, printOrders } from "@/lib/print-order";
import Image from "next/image";
import toast from "react-hot-toast";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "confirmed", "billed", "shipped", "delivered", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  billed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cod: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

type DateRangeKey = "3d" | "7d" | "14d" | "30d" | "all" | "custom";

function getDateBounds(key: DateRangeKey, customStart: string, customEnd: string): { start: Date; end: Date } | null {
  if (key === "all") return null;
  const now = new Date();
  if (key === "custom") {
    if (!customStart && !customEnd) return null;
    const start = customStart ? new Date(customStart + "T00:00:00") : new Date(0);
    const end = customEnd ? new Date(customEnd + "T23:59:59.999") : new Date();
    return { start, end };
  }
  const days = key === "3d" ? 3 : key === "7d" ? 7 : key === "14d" ? 14 : 30;
  return { start: new Date(now.getTime() - days * 86_400_000), end: now };
}

function ordersToCsvBlob(orders: Order[]): Blob {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = [
    "Order Number", "Date", "Customer Name", "Phone", "Email",
    "Address", "City", "State", "Pincode",
    "Items", "Subtotal", "Shipping", "COD Charges", "Total",
    "Status", "Payment Status", "Payment Method",
    "Article Number", "Settlement Status", "Amount Received", "Settlement Date",
    "Razorpay Order ID", "Razorpay Payment ID", "Notes",
  ];
  const rows = orders.map((o) => [
    o.order_number, new Date(o.created_at).toLocaleString(),
    o.customer_name, o.customer_phone, o.customer_email || "",
    o.customer_address, o.customer_city, o.customer_state, o.customer_pincode,
    (o.items || []).map((i) => `${i.product_name} x${i.quantity}`).join("; "),
    Number(o.subtotal), Number(o.shipping), Number(o.cod_charges || 0), Number(o.total),
    o.status, o.payment_status, o.payment_method,
    o.article_number || "", o.settlement_status || "",
    o.amount_received != null ? Number(o.amount_received) : "",
    o.settlement_date || "",
    o.razorpay_order_id || "", o.razorpay_payment_id || "",
    o.notes || "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
  return new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
}

// --- Check Pending Modal ---
function CheckPendingModal({ orders, onClose, onComplete }: { orders: Order[]; onClose: () => void; onComplete: () => void }) {
  const [range, setRange] = useState<DateRangeKey>("3d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const bounds = getDateBounds(range, customStart, customEnd);
  const matching = orders.filter((o) => {
    if (o.payment_status !== "pending") return false;
    if (!bounds) return true;
    const d = new Date(o.created_at);
    return d >= bounds.start && d <= bounds.end;
  });

  const handleStart = async () => {
    if (matching.length === 0) {
      toast("No pending orders in this range", { icon: "ℹ️" });
      return;
    }
    setProgress({ done: 0, total: matching.length });
    let confirmed = 0, errors = 0;
    for (let i = 0; i < matching.length; i++) {
      try {
        const r = await checkPaymentStatus(matching[i].id);
        if (r.reconciled) confirmed++;
      } catch { errors++; }
      setProgress({ done: i + 1, total: matching.length });
    }
    setProgress(null);
    if (confirmed > 0) {
      toast.success(`${confirmed} payment${confirmed === 1 ? "" : "s"} confirmed out of ${matching.length}`);
      onComplete();
    } else {
      toast(`Checked ${matching.length} order${matching.length === 1 ? "" : "s"} — no new payments found${errors > 0 ? ` (${errors} failed)` : ""}`, { icon: "ℹ️" });
    }
    onClose();
  };

  const rangeOptions: { key: DateRangeKey; label: string }[] = [
    { key: "3d", label: "Last 3 days" },
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "30d", label: "Last 30 days" },
    { key: "all", label: "All time" },
    { key: "custom", label: "Custom range" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Check Pending Payments</h2>
          <button onClick={onClose} disabled={progress !== null} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Date range</label>
            <div className="grid grid-cols-2 gap-2">
              {rangeOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRange(opt.key)}
                  disabled={progress !== null}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${range === opt.key ? "bg-coral text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {range === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
          )}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
            <p className="text-blue-700 dark:text-blue-400 font-medium">{matching.length} pending order{matching.length === 1 ? "" : "s"} in this range</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Each order will be checked against Razorpay individually. ~1 second per order.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} disabled={progress !== null} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50">Cancel</button>
          <button
            onClick={handleStart}
            disabled={progress !== null || matching.length === 0}
            className="px-5 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {progress ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking {progress.done}/{progress.total}…</> : <><CreditCard className="w-4 h-4" /> Check {matching.length}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Download Orders Modal ---
function DownloadOrdersModal({ orders, onClose }: { orders: Order[]; onClose: () => void }) {
  const [statuses, setStatuses] = useState<Set<string>>(new Set(STATUS_OPTIONS));
  const [paymentMethods, setPaymentMethods] = useState<Set<string>>(new Set(["cod", "online"]));
  const [range, setRange] = useState<DateRangeKey>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const bounds = getDateBounds(range, customStart, customEnd);
  const matching = orders.filter((o) => {
    if (!statuses.has(o.status)) return false;
    if (!paymentMethods.has(o.payment_method)) return false;
    if (bounds) {
      const d = new Date(o.created_at);
      if (d < bounds.start || d > bounds.end) return false;
    }
    return true;
  });

  const toggleStatus = (s: string) => {
    setStatuses((prev) => { const next = new Set(prev); next.has(s) ? next.delete(s) : next.add(s); return next; });
  };
  const togglePayment = (m: string) => {
    setPaymentMethods((prev) => { const next = new Set(prev); next.has(m) ? next.delete(m) : next.add(m); return next; });
  };

  const handleDownload = () => {
    if (matching.length === 0) { toast("No orders matching filters", { icon: "ℹ️" }); return; }
    const blob = ordersToCsvBlob(matching);
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${dateStr}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${matching.length} order${matching.length === 1 ? "" : "s"}`);
    onClose();
  };

  const rangeOptions: { key: DateRangeKey; label: string }[] = [
    { key: "all", label: "All time" },
    { key: "3d", label: "Last 3 days" },
    { key: "7d", label: "Last 7 days" },
    { key: "14d", label: "Last 14 days" },
    { key: "30d", label: "Last 30 days" },
    { key: "custom", label: "Custom range" },
  ];

  const selectAll = () => setStatuses(new Set(STATUS_OPTIONS));
  const selectNone = () => setStatuses(new Set());

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg my-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Download Orders</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Order status</label>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-coral hover:underline">Select all</button>
                <button onClick={selectNone} className="text-gray-400 hover:underline">None</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <label key={s} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm capitalize ${statuses.has(s) ? "border-coral bg-coral/5 text-gray-900 dark:text-white" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"}`}>
                  <input type="checkbox" checked={statuses.has(s)} onChange={() => toggleStatus(s)} className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Payment method</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: "cod", label: "COD" }, { key: "online", label: "Online" }].map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${paymentMethods.has(key) ? "border-coral bg-coral/5 text-gray-900 dark:text-white" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"}`}>
                  <input type="checkbox" checked={paymentMethods.has(key)} onChange={() => togglePayment(key)} className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Date range</label>
            <div className="grid grid-cols-3 gap-2">
              {rangeOptions.map((opt) => (
                <button key={opt.key} onClick={() => setRange(opt.key)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${range === opt.key ? "bg-coral text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
              </div>
            )}
          </div>
          <div className="bg-coral/5 rounded-lg p-3 text-sm">
            <p className="text-coral font-medium">{matching.length} order{matching.length === 1 ? "" : "s"} match these filters</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button onClick={handleDownload} disabled={matching.length === 0} className="px-5 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Download className="w-4 h-4" /> Download {matching.length}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Create Order Modal ---
interface OrderLineItem {
  product: Product;
  quantity: number;
}

interface CustomerLookupOrder {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
}

function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OrderStatus>("confirmed");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("cod");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [shipping, setShipping] = useState<number | "">("");
  const [articleNumber, setArticleNumber] = useState("");
  const [settlementStatus, setSettlementStatus] = useState<string>("pending");
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [settlementDate, setSettlementDate] = useState("");
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  // Product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemDiscount, setCustomItemDiscount] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(8);
    setSearchResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addProduct = (product: Product) => {
    const existing = lineItems.find((li) => li.product.id === product.id);
    if (existing) {
      setLineItems(lineItems.map((li) => li.product.id === product.id ? { ...li, quantity: li.quantity + 1 } : li));
    } else {
      setLineItems([...lineItems, { product, quantity: 1 }]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const openCustomItemForm = (name: string) => {
    setCustomItemName(name.trim());
    setCustomItemPrice("");
    setCustomItemDiscount("");
    setShowCustomItemForm(true);
    setShowSearch(false);
  };

  const resetCustomItemForm = () => {
    setShowCustomItemForm(false);
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemDiscount("");
  };

  const addCustomItem = () => {
    const nameValue = customItemName.trim();
    const price = Number(customItemPrice);
    const discountPercent = customItemDiscount.trim() === "" ? 0 : Number(customItemDiscount);

    if (!nameValue) {
      toast.error("Enter a custom item name");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid original price");
      return;
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      toast.error("Discount must be between 0 and 100");
      return;
    }

    const finalPrice = Math.round(price * (1 - discountPercent / 100) * 100) / 100;
    const customProduct = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: nameValue,
      price: finalPrice,
      compare_price: discountPercent > 0 ? price : null,
      discount_percent: discountPercent > 0 ? discountPercent : undefined,
      image_url: null,
      in_stock: true,
    } as unknown as Product & { discount_percent?: number };

    addProduct(customProduct);
    resetCustomItemForm();
  };

  const updateQty = (productId: string, delta: number) => {
    setLineItems(lineItems.map((li) => {
      if (li.product.id !== productId) return li;
      const newQty = li.quantity + delta;
      return newQty < 1 ? li : { ...li, quantity: newQty };
    }));
  };

  const removeItem = (productId: string) => {
    setLineItems(lineItems.filter((li) => li.product.id !== productId));
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.product.price * li.quantity, 0);
  const isCodCreate = paymentMethod === "cod";
  const shippingAmount = shipping === "" ? 0 : shipping;
  const codCharges = isCodCreate ? Math.round((subtotal + shippingAmount) * 0.016) : 0;
  const total = subtotal + shippingAmount + codCharges;

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setPaymentStatus(method === "cod" ? "cod" : "paid");
  };

  const loadCustomerDetails = async () => {
    const phoneDigits = phone.replace(/\D/g, "").slice(-10);
    if (phoneDigits.length !== 10) {
      toast.error("Enter a valid 10-digit phone number first");
      return;
    }

    setLoadingCustomer(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_name, customer_phone, customer_email, customer_address, customer_city, customer_state, customer_pincode")
        .ilike("customer_phone", `%${phoneDigits}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const matchingOrder = (data as CustomerLookupOrder[] | null)?.find(
        (order) => order.customer_phone.replace(/\D/g, "").slice(-10) === phoneDigits
      );

      if (!matchingOrder) {
        toast.error("No previous customer found for this phone number");
        return;
      }

      setName(matchingOrder.customer_name || "");
      setEmail(matchingOrder.customer_email || "");
      setAddress(matchingOrder.customer_address || "");
      setCity(matchingOrder.customer_city || "");
      setState(matchingOrder.customer_state || "");
      setPincode(matchingOrder.customer_pincode || "");
      toast.success("Customer details loaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load customer details");
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
      toast.error("Please fill all required customer fields");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const orderNumber = `KV-${dateStr}-${random}`;

      const items = lineItems.map((li) => ({
        // Custom items have synthetic IDs not in the products table — store as null
        product_id: li.product.id.startsWith("custom-") ? null : li.product.id,
        product_name: li.product.name,
        product_image: li.product.image_url || null,
        price: li.product.price,
        compare_price: li.product.compare_price || null,
        discount_percent: (li.product as Product & { discount_percent?: number }).discount_percent || null,
        quantity: li.quantity,
        subtotal: li.product.price * li.quantity,
      }));

      const { error } = await supabase.from("orders").insert({
        order_number: orderNumber,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || null,
        customer_address: address.trim(),
        customer_city: city.trim(),
        customer_state: state.trim(),
        customer_pincode: pincode.trim(),
        items,
        subtotal,
        shipping: shippingAmount,
        cod_charges: codCharges,
        total,
        status,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        article_number: articleNumber.trim() || null,
        settlement_status: settlementStatus,
        amount_received: amountReceived !== "" ? Number(amountReceived) : null,
        settlement_date: settlementDate || null,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      toast.success(`Order ${orderNumber} created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent";
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Order</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Customer Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <div className="flex gap-2">
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" />
                  <button
                    type="button"
                    onClick={loadCustomerDetails}
                    disabled={loadingCustomer}
                    className="shrink-0 px-3 py-2 rounded-lg border border-coral/30 text-coral text-sm font-medium hover:bg-coral/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {loadingCustomer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Load
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Email</label>
                <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address *</label>
                <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input className={inputCls} value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
              </div>
              <div>
                <label className={labelCls}>Pincode *</label>
                <input className={inputCls} value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="6-digit pincode" />
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Products</h3>
            <div ref={searchRef} className="relative mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={`${inputCls} pl-9`}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Search products to add..."
                />
              </div>
              {showSearch && searchQuery.trim().length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 text-left"
                    >
                      <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                        {p.image_url ? (
                          <Image src={p.image_url} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">₹{p.price.toLocaleString()}{!p.in_stock ? " · Out of stock" : ""}</p>
                      </div>
                      <Plus className="w-4 h-4 text-coral flex-shrink-0" />
                    </button>
                  ))}
                  {/* Always show "Add as custom item" footer when there's a search query */}
                  <button
                    onClick={() => {
                      openCustomItemForm(searchQuery);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left border-t border-gray-200 dark:border-gray-600 ${searchResults.length === 0 ? "bg-coral/5" : "hover:bg-coral/5"}`}
                  >
                    <div className="w-8 h-8 rounded bg-coral/10 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-coral" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-coral font-medium truncate">
                        {searchResults.length === 0 ? `Add "${searchQuery.trim()}" as custom item` : `Not in list? Add "${searchQuery.trim()}" as custom item`}
                      </p>
                      <p className="text-xs text-gray-400">Enter price and optional discount — won&apos;t be saved to catalog</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {showCustomItemForm && (
              <div className="mb-3 rounded-lg border border-coral/20 bg-coral/5 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Custom Product Name</label>
                    <input
                      className={inputCls}
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Original Price</label>
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={inputCls}
                      value={customItemDiscount}
                      onChange={(e) => setCustomItemDiscount(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Final price: ₹{(() => {
                      const price = Number(customItemPrice) || 0;
                      const discount = customItemDiscount.trim() === "" ? 0 : Number(customItemDiscount) || 0;
                      return Math.round(price * (1 - discount / 100) * 100) / 100;
                    })().toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetCustomItemForm}
                      className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-700 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addCustomItem}
                      className="px-3 py-2 text-sm font-medium text-white bg-coral hover:bg-coral/90 rounded-lg"
                    >
                      Add Custom Item
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected items */}
            {lineItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No products added yet</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map((li) => {
                  const isCustom = li.product.id.startsWith("custom-");
                  const customDiscountPercent = (li.product as Product & { discount_percent?: number }).discount_percent;
                  const originalPrice = li.product.compare_price;
                  return (
                  <div key={li.product.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-600 flex-shrink-0">
                      {li.product.image_url ? (
                        <Image src={li.product.image_url} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {li.product.name}
                        {isCustom && <span className="ml-2 text-[10px] uppercase tracking-wide text-coral bg-coral/10 px-1.5 py-0.5 rounded">Custom</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {originalPrice && originalPrice > li.product.price ? (
                          <>
                            <span className="line-through">₹{originalPrice.toLocaleString()}</span>{" "}
                            <span>₹{li.product.price.toLocaleString()} each</span>
                            {customDiscountPercent && <span className="ml-1 text-green-600">{customDiscountPercent}% off</span>}
                          </>
                        ) : (
                          <>₹{li.product.price.toLocaleString()} each</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(li.product.id, -1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                      <span className="w-6 text-center text-sm font-medium text-gray-900 dark:text-white">{li.quantity}</span>
                      <button onClick={() => updateQty(li.product.id, 1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Plus className="w-3.5 h-3.5 text-gray-500" /></button>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">₹{(li.product.price * li.quantity).toLocaleString()}</span>
                    <button onClick={() => removeItem(li.product.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"><X className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                  );
                })}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Order Status & Payment */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Status & Payment</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Order Status</label>
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Status</label>
                <select className={inputCls} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                  {PAYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Method</label>
                <select className={inputCls} value={paymentMethod} onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}>
                  <option value="cod">COD</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shipping & Total */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Shipping & Total</h3>
            <div className={`grid ${isCodCreate ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              <div>
                <label className={labelCls}>Shipping Cost</label>
                <input
                  type="number"
                  className={inputCls}
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value === "" ? "" : Number(e.target.value))}
                  min={0}
                />
              </div>
              {isCodCreate && (
                <div>
                  <label className={labelCls}>Article Number (India Post)</label>
                  <input className={inputCls} value={articleNumber} onChange={(e) => setArticleNumber(e.target.value)} placeholder="Enter India Post article number" />
                </div>
              )}
            </div>
            <div className="mt-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Shipping</span><span>₹{shippingAmount.toLocaleString()}</span></div>
              {isCodCreate && <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>COD Charges (1.6%)</span><span>₹{codCharges.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
            </div>
          </div>

          {/* COD Settlement - only for COD orders */}
          {isCodCreate && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">COD Settlement</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={settlementStatus} onChange={(e) => setSettlementStatus(e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="settled">Settled</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Amount Received</label>
                  <input type="number" className={inputCls} value={amountReceived} onChange={(e) => setAmountReceived(e.target.value === "" ? "" : Number(e.target.value))} placeholder="₹" min={0} />
                </div>
                <div>
                  <label className={labelCls}>Settlement Date</label>
                  <input type="date" className={inputCls} value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order notes (optional)" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Edit Order Modal ---
const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["pending", "paid", "failed", "cod"];

interface EditLineItem {
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
}

function EditOrderModal({ order, onClose, onUpdated }: { order: Order; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState(order.customer_name);
  const [phone, setPhone] = useState(order.customer_phone);
  const [email, setEmail] = useState(order.customer_email || "");
  const [address, setAddress] = useState(order.customer_address);
  const [city, setCity] = useState(order.customer_city);
  const [state, setState] = useState(order.customer_state);
  const [pincode, setPincode] = useState(order.customer_pincode);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.payment_status);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.payment_method);
  const [notes, setNotes] = useState(order.notes || "");
  const [shipping, setShipping] = useState<number | "">(Number(order.shipping) || "");
  const [articleNumber, setArticleNumber] = useState(order.article_number || "");
  const [settlementStatus, setSettlementStatus] = useState<string>(order.settlement_status || "pending");
  const [amountReceived, setAmountReceived] = useState(order.amount_received != null ? Number(order.amount_received) : "");
  const [settlementDate, setSettlementDate] = useState(order.settlement_date || "");
  const [submitting, setSubmitting] = useState(false);

  // Editable line items
  const [lineItems, setLineItems] = useState<EditLineItem[]>(
    (order.items || []).map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      price: Number(item.price),
      quantity: item.quantity,
    }))
  );

  // Product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(8);
    setSearchResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addProduct = (product: Product) => {
    const existing = lineItems.find((li) => li.product_id === product.id);
    if (existing) {
      setLineItems(lineItems.map((li) => li.product_id === product.id ? { ...li, quantity: li.quantity + 1 } : li));
    } else {
      setLineItems([...lineItems, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        price: product.price,
        quantity: 1,
      }]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const getLineItemKey = (item: EditLineItem) => item.product_id || `custom-${item.product_name}-${item.price}`;

  const updateQty = (itemKey: string, delta: number) => {
    setLineItems(lineItems.map((li) => {
      if (getLineItemKey(li) !== itemKey) return li;
      const newQty = li.quantity + delta;
      return newQty < 1 ? li : { ...li, quantity: newQty };
    }));
  };

  const removeItem = (itemKey: string) => {
    setLineItems(lineItems.filter((li) => getLineItemKey(li) !== itemKey));
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0);
  const isCodEdit = paymentMethod === "cod";
  const shippingAmount = shipping === "" ? 0 : shipping;
  const codCharges = isCodEdit ? Math.round((subtotal + shippingAmount) * 0.016) : 0;
  const total = subtotal + shippingAmount + codCharges;

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
      toast.error("Please fill all required customer fields");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const items = lineItems.map((li) => ({
        // Custom items (synthetic IDs) aren't real products in the catalog — store product_id as null
        product_id: li.product_id?.startsWith("custom-") ? null : li.product_id,
        product_name: li.product_name,
        product_image: li.product_image,
        price: li.price,
        quantity: li.quantity,
        subtotal: li.price * li.quantity,
      }));

      await updateOrder(order.id, {
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || null,
        customer_address: address.trim(),
        customer_city: city.trim(),
        customer_state: state.trim(),
        customer_pincode: pincode.trim(),
        items,
        subtotal,
        shipping: shippingAmount,
        cod_charges: codCharges,
        total,
        status,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        article_number: articleNumber.trim() || null,
        settlement_status: settlementStatus,
        amount_received: amountReceived !== "" ? Number(amountReceived) : null,
        settlement_date: settlementDate || null,
        notes: notes.trim() || null,
      });

      toast.success(`Order ${order.order_number} updated`);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent";
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Order {order.order_number}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Customer Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Email</label>
                <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address *</label>
                <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input className={inputCls} value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Pincode *</label>
                <input className={inputCls} value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Products — editable */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Products</h3>
            <div ref={searchRef} className="relative mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={`${inputCls} pl-9`}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Search products to add..."
                />
              </div>
              {showSearch && searchQuery.trim().length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 text-left"
                    >
                      <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                        {p.image_url ? (
                          <Image src={p.image_url} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">₹{p.price.toLocaleString()}</p>
                      </div>
                      <Plus className="w-4 h-4 text-coral flex-shrink-0" />
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const priceStr = window.prompt(`Add "${searchQuery.trim()}" as a custom item.\n\nEnter price (₹):`, "");
                      if (priceStr === null) return;
                      const price = Number(priceStr);
                      if (!Number.isFinite(price) || price < 0) {
                        toast.error("Invalid price");
                        return;
                      }
                      const customId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                      setLineItems([...lineItems, {
                        product_id: customId,
                        product_name: searchQuery.trim(),
                        product_image: null,
                        price,
                        quantity: 1,
                      }]);
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowSearch(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left border-t border-gray-200 dark:border-gray-600 ${searchResults.length === 0 ? "bg-coral/5" : "hover:bg-coral/5"}`}
                  >
                    <div className="w-8 h-8 rounded bg-coral/10 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-coral" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-coral font-medium truncate">
                        {searchResults.length === 0 ? `Add "${searchQuery.trim()}" as custom item` : `Not in list? Add "${searchQuery.trim()}" as custom item`}
                      </p>
                      <p className="text-xs text-gray-400">Enter a price — won&apos;t be saved to catalog</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {lineItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No products — add items above</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map((li) => {
                  const itemKey = getLineItemKey(li);
                  return (
                  <div key={itemKey} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-600 flex-shrink-0">
                      {li.product_image ? (
                        <Image src={li.product_image} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{li.product_name}</p>
                      <p className="text-xs text-gray-400">₹{li.price.toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(itemKey, -1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                      <span className="w-6 text-center text-sm font-medium text-gray-900 dark:text-white">{li.quantity}</span>
                      <button onClick={() => updateQty(itemKey, 1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Plus className="w-3.5 h-3.5 text-gray-500" /></button>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">₹{(li.price * li.quantity).toLocaleString()}</span>
                    <button onClick={() => removeItem(itemKey)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"><X className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                  );
                })}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-900 dark:text-white">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Order Status & Payment */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Status & Payment</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Order Status</label>
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Status</label>
                <select className={inputCls} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                  {PAYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Method</label>
                <select className={inputCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  <option value="cod">COD</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shipping & Total */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Shipping & Total</h3>
            <div className={`grid ${isCodEdit ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              <div>
                <label className={labelCls}>Shipping Cost</label>
                <input
                  type="number"
                  className={inputCls}
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value === "" ? "" : Number(e.target.value))}
                  min={0}
                />
              </div>
              {isCodEdit && (
              <div>
                <label className={labelCls}>Article Number (India Post)</label>
                <input className={inputCls} value={articleNumber} onChange={(e) => setArticleNumber(e.target.value)} placeholder="Enter India Post article number" />
              </div>
              )}
            </div>
            <div className="mt-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Shipping</span><span>₹{shippingAmount.toLocaleString()}</span></div>
              {isCodEdit && <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>COD Charges (1.6%)</span><span>₹{codCharges.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
            </div>
          </div>

          {/* COD Settlement - only for COD orders */}
          {isCodEdit && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">COD Settlement</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={settlementStatus} onChange={(e) => setSettlementStatus(e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="settled">Settled</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Amount Received</label>
                  <input type="number" className={inputCls} value={amountReceived} onChange={(e) => setAmountReceived(e.target.value === "" ? "" : Number(e.target.value))} placeholder="₹" min={0} />
                </div>
                <div>
                  <label className={labelCls}>Settlement Date</label>
                  <input type="date" className={inputCls} value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order notes (optional)" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Orders Page ---
export default function AdminOrdersPage() {
  const { data: orders, loading, refetch } = useSupabaseQuery(getOrders);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<"all" | "this_month" | "last_month" | "custom">("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null);
  const [showCheckPendingModal, setShowCheckPendingModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const allOrders = orders || [];

  // Compute date bounds for current selection
  const monthBounds = (() => {
    const now = new Date();
    if (dateRange === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (dateRange === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (dateRange === "custom") {
      if (!customStart && !customEnd) return null;
      const start = customStart ? new Date(customStart + "T00:00:00") : new Date(0);
      const end = customEnd ? new Date(customEnd + "T23:59:59.999") : new Date();
      return { start, end };
    }
    return null;
  })();

  // Filter orders by search, status, and date range
  const filtered = allOrders.filter((order) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_phone.includes(query);

    const matchesStatus = !statusFilter
      ? true
      : statusFilter === "cod"
        ? order.payment_method === "cod"
        : order.status === statusFilter;

    if (monthBounds) {
      const d = new Date(order.created_at);
      if (d < monthBounds.start || d > monthBounds.end) return false;
    }

    return matchesSearch && matchesStatus;
  });

  const markAsBilled = async (orderIds: string[]) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "billed" })
      .in("id", orderIds);
    if (!error) refetch();
  };

  const handleBulkStatusChange = async (newStatus: OrderStatus) => {
    if (selectedOrders.size === 0) return;
    const orderIds = Array.from(selectedOrders);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .in("id", orderIds);
      if (error) throw error;
      toast.success(`${orderIds.length} order(s) updated to ${newStatus}`);
      setSelectedOrders(new Set());
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

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

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Delete order ${orderNumber}? This cannot be undone.`)) return;
    try {
      await deleteOrder(orderId);
      toast.success(`Order ${orderNumber} deleted`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete order");
    }
  };

  const handleCheckPayment = async (orderId: string) => {
    setCheckingPayment(orderId);
    try {
      const result = await checkPaymentStatus(orderId);
      if (result.reconciled) {
        toast.success(`Payment confirmed! ${result.message}`);
        refetch();
      } else {
        toast(`${result.message}`, { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check payment");
    } finally {
      setCheckingPayment(null);
    }
  };

  const pendingPaymentCount = allOrders.filter((o) => o.payment_status === "pending").length;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{allOrders.length} total orders</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedOrders.size > 0 && (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedOrders.size} selected</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkStatusChange(e.target.value as OrderStatus);
                        e.target.value = "";
                      }
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
                  >
                    <option value="" disabled>Change status…</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const selected = allOrders.filter((o) => selectedOrders.has(o.id));
                      printOrders(selected, "invoice");
                      markAsBilled(selected.map((o) => o.id));
                    }}
                    className="px-3 py-2 bg-coral/10 text-coral rounded-lg text-sm font-medium hover:bg-coral/20 transition-colors flex items-center gap-1.5"
                    title="Print invoices"
                  >
                    <FileText className="w-4 h-4" /> Invoices
                  </button>
                  <button
                    onClick={() => {
                      const selected = allOrders.filter((o) => selectedOrders.has(o.id));
                      printOrders(selected, "sticker");
                    }}
                    className="px-3 py-2 bg-coral/10 text-coral rounded-lg text-sm font-medium hover:bg-coral/20 transition-colors flex items-center gap-1.5"
                    title="Print stickers"
                  >
                    <Tag className="w-4 h-4" /> Stickers
                  </button>
                  <button
                    onClick={() => setSelectedOrders(new Set())}
                    className="px-2 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            {pendingPaymentCount > 0 && (
              <button
                onClick={() => setShowCheckPendingModal(true)}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                title="Check Razorpay for payments on pending orders (with date range)"
              >
                <CreditCard className="w-4 h-4" /> Check Pending ({pendingPaymentCount})
              </button>
            )}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              title="Download orders with custom filters"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              onClick={() => setShowCreateOrder(true)}
              className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Order
            </button>
          </div>
        </div>

        {showCreateOrder && (
          <CreateOrderModal onClose={() => setShowCreateOrder(false)} onCreated={refetch} />
        )}
        {editingOrder && (
          <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onUpdated={refetch} />
        )}
        {showCheckPendingModal && (
          <CheckPendingModal orders={allOrders} onClose={() => setShowCheckPendingModal(false)} onComplete={refetch} />
        )}
        {showDownloadModal && (
          <DownloadOrdersModal orders={allOrders} onClose={() => setShowDownloadModal(false)} />
        )}

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by Order ID, Name, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">When</span>
          {[
            { key: "all", label: "All time" },
            { key: "this_month", label: "This month" },
            { key: "last_month", label: "Last month" },
            { key: "custom", label: "Custom" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key as typeof dateRange)}
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

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !statusFilter ? "bg-coral text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            All ({filtered.length})
          </button>
          {STATUS_OPTIONS.map((status) => {
            const count = allOrders.filter((o) => o.status === status).length;
            const isBilled = status === "billed";
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? (isBilled ? "bg-green-600 text-white" : "bg-coral text-white")
                    : (isBilled ? "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700")
                }`}
              >
                {status} ({allOrders.filter((o) => o.status === status).filter((o) => {
                  const query = searchQuery.toLowerCase().trim();
                  return !query ||
                    o.order_number.toLowerCase().includes(query) ||
                    o.customer_name.toLowerCase().includes(query) ||
                    o.customer_phone.includes(query);
                }).length})
              </button>
            );
          })}
          <button
            onClick={() => setStatusFilter("cod")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "cod"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            COD ({allOrders.filter((o) => o.payment_method === "cod").filter((o) => {
              const query = searchQuery.toLowerCase().trim();
              return !query ||
                o.order_number.toLowerCase().includes(query) ||
                o.customer_name.toLowerCase().includes(query) ||
                o.customer_phone.includes(query);
            }).length})
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-400 shadow-sm border border-gray-200 dark:border-gray-700">
            No orders found
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-3 px-4 md:px-6">
              <input
                type="checkbox"
                checked={filtered.length > 0 && filtered.every((o) => selectedOrders.has(o.id))}
                onChange={() => {
                  const allSelected = filtered.every((o) => selectedOrders.has(o.id));
                  setSelectedOrders((prev) => {
                    const next = new Set(prev);
                    filtered.forEach((o) => allSelected ? next.delete(o.id) : next.add(o.id));
                    return next;
                  });
                }}
                className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500">Select all ({filtered.length})</span>
            </div>
            {filtered.map((order) => (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Order Header */}
                <div
                  className="px-4 md:px-6 py-3 grid items-center gap-3 md:gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  style={{ gridTemplateColumns: "auto auto minmax(0, 1fr) auto auto auto" }}
                  onClick={() => toggleExpand(order.id)}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedOrders((prev) => {
                        const next = new Set(prev);
                        if (next.has(order.id)) next.delete(order.id);
                        else next.add(order.id);
                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
                  />
                  {/* Product thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
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
                  {/* Order info — minmax(0,1fr) column lets this shrink and truncate */}
                  <div className="min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5 min-w-0">
                      <span className="font-mono text-xs text-coral font-medium flex-shrink-0 whitespace-nowrap">{order.order_number}</span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate min-w-0">{order.customer_name}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {order.items?.map((i) => `${i.product_name} x${i.quantity}`).join(", ")}
                    </p>
                  </div>
                  {/* Amount + badges (right side — guaranteed slot via grid auto column) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">₹{Number(order.total).toLocaleString()}</span>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" title="Shipping charges">
                      Ship ₹{Number(order.shipping || 0).toLocaleString()}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-700"}`}>
                      {order.status}
                    </span>
                    <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${PAYMENT_STYLES[order.payment_status] || "bg-gray-100 text-gray-700"}`}>
                      {order.payment_status === "paid" ? "Paid" : order.payment_status === "cod" ? "COD" : order.payment_status === "failed" ? "Failed" : "Unpaid"}
                    </span>
                    {order.is_billed && (
                      <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Billed
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap hidden lg:block">
                      {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Print button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); printOrder(order, "invoice"); markAsBilled([order.id]); }}
                    className="p-1.5 text-gray-400 hover:text-coral transition-colors flex-shrink-0 hidden md:block"
                    title="Print invoice"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {expandedOrder === order.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>

                {/* Expanded Details */}
                {expandedOrder === order.id && (
                  <div className="px-4 md:px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-6 min-w-0">
                      {/* Customer Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Details</h3>
                        <div className="space-y-2 text-sm text-gray-900 dark:text-gray-200">
                          <p><span className="text-gray-500 dark:text-gray-400">Name:</span> {order.customer_name}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {order.customer_phone}</p>
                          {order.customer_email && (
                            <p><span className="text-gray-500 dark:text-gray-400">Email:</span> {order.customer_email}</p>
                          )}
                          <p><span className="text-gray-500 dark:text-gray-400">Address:</span> {order.customer_address}</p>
                          <p><span className="text-gray-500 dark:text-gray-400">City:</span> {order.customer_city}, {order.customer_state} - {order.customer_pincode}</p>
                          {order.notes && (
                            <p><span className="text-gray-500 dark:text-gray-400">Notes:</span> {order.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment Details</h3>
                        <div className="space-y-2 text-sm mb-4 text-gray-900 dark:text-gray-200">
                          <p>
                            <span className="text-gray-500 dark:text-gray-400">Payment Status:</span>{" "}
                            <span className={`font-medium ${
                              order.payment_status === "paid" ? "text-green-600 dark:text-green-400" :
                              order.payment_status === "failed" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
                            }`}>
                              {order.payment_status?.toUpperCase() || "PENDING"}
                            </span>
                          </p>
                          {order.razorpay_order_id && (
                            <p><span className="text-gray-500 dark:text-gray-400">Razorpay Order:</span> {order.razorpay_order_id}</p>
                          )}
                          {order.razorpay_payment_id && (
                            <p><span className="text-gray-500 dark:text-gray-400">Payment ID:</span> {order.razorpay_payment_id}</p>
                          )}
                        </div>
                        {order.payment_status === "pending" && (
                          <button
                            onClick={() => handleCheckPayment(order.id)}
                            disabled={checkingPayment === order.id}
                            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {checkingPayment === order.id ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
                            ) : (
                              <><CreditCard className="w-4 h-4" /> Check Payment</>
                            )}
                          </button>
                        )}
                      </div>

                      {/* COD Details - only for COD orders */}
                      {order.payment_method === "cod" && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">COD Details</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Article Number (India Post)</label>
                            <input
                              defaultValue={order.article_number || ""}
                              placeholder="Enter India Post article number"
                              onBlur={async (e) => {
                                const val = e.target.value.trim() || null;
                                if (val !== (order.article_number || null)) {
                                  await updateOrder(order.id, { article_number: val });
                                  toast.success("Article number saved");
                                  refetch();
                                }
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
                            />
                          </div>

                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 uppercase tracking-wide">COD Settlement</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                                <select
                                  defaultValue={order.settlement_status || "pending"}
                                  onChange={async (e) => {
                                    await updateOrder(order.id, { settlement_status: e.target.value });
                                    toast.success("Settlement status updated");
                                    refetch();
                                  }}
                                  className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="received">Received</option>
                                  <option value="settled">Settled</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount Received</label>
                                <input
                                  type="number"
                                  defaultValue={order.amount_received != null ? Number(order.amount_received) : ""}
                                  placeholder="₹"
                                  onBlur={async (e) => {
                                    const val = e.target.value ? Number(e.target.value) : null;
                                    await updateOrder(order.id, { amount_received: val });
                                    toast.success("Amount saved");
                                    refetch();
                                  }}
                                  className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                  min={0}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Settlement Date</label>
                                <input
                                  type="date"
                                  defaultValue={order.settlement_date || ""}
                                  onChange={async (e) => {
                                    await updateOrder(order.id, { settlement_date: e.target.value || null });
                                    toast.success("Settlement date saved");
                                    refetch();
                                  }}
                                  className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice Number</label>
                            <input
                              defaultValue={order.invoice_number || ""}
                              placeholder="Enter invoice number"
                              onBlur={async (e) => {
                                const val = e.target.value.trim() || null;
                                if (val !== (order.invoice_number || null)) {
                                  await updateOrder(order.id, { invoice_number: val });
                                  toast.success("Invoice number saved");
                                  refetch();
                                }
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Order Items & Status */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Items</h3>
                        <div className="space-y-3 mb-4">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border border-gray-200 dark:border-gray-600">
                                {item.product_image ? (
                                  <Image
                                    src={item.product_image}
                                    alt={item.product_name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-500">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{item.product_name}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Qty: {item.quantity} x ₹{Number(item.price).toLocaleString()}</p>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                ₹{Number(item.subtotal).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-2 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>₹{Number(order.subtotal).toLocaleString()}</span></div>
                            {Number(order.shipping) > 0 && <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Shipping</span><span>₹{Number(order.shipping).toLocaleString()}</span></div>}
                            {Number(order.cod_charges) > 0 && <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>COD Charges (1.6%)</span><span>₹{Number(order.cod_charges).toLocaleString()}</span></div>}
                            <div className="flex justify-between font-bold text-gray-900 dark:text-white"><span>Total</span><span>₹{Number(order.total).toLocaleString()}</span></div>
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Update Status</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="capitalize">
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5"
                            title="Edit order"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => { printOrder(order, "invoice"); markAsBilled([order.id]); }}
                            className="px-3 py-2 bg-coral/10 text-coral rounded-lg text-sm font-medium hover:bg-coral/20 transition-colors flex items-center gap-1.5"
                            title="Print invoice"
                          >
                            <FileText className="w-4 h-4" /> Invoice
                          </button>
                          <button
                            onClick={() => printOrder(order, "sticker")}
                            className="px-3 py-2 bg-coral/10 text-coral rounded-lg text-sm font-medium hover:bg-coral/20 transition-colors flex items-center gap-1.5"
                            title="Print shipping sticker"
                          >
                            <Tag className="w-4 h-4" /> Sticker
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.order_number)}
                            className="px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1.5"
                            title="Delete order"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
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
