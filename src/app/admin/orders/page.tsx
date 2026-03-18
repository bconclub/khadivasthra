"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getOrders, updateOrderStatus, updateOrder, createShiprocketOrder, checkPaymentStatus } from "@/lib/services/orders";
import { deleteOrder } from "@/lib/services/admin";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus, Product, PaymentMethod, PaymentStatus } from "@/types";
import { Loader2, ChevronDown, ChevronUp, Truck, ExternalLink, Trash2, CreditCard, Package, Plus, Search, X, Minus, Pencil } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
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

// --- Create Order Modal ---
interface OrderLineItem {
  product: Product;
  quantity: number;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

      const isCod = paymentMethod === "cod";

      const items = lineItems.map((li) => ({
        product_id: li.product.id,
        product_name: li.product.name,
        product_image: li.product.image_url || null,
        price: li.product.price,
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
        shipping: 0,
        total: subtotal,
        status: "confirmed",
        payment_status: isCod ? "cod" : "paid",
        payment_method: paymentMethod,
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
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" />
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
              <div>
                <label className={labelCls}>Payment Method</label>
                <select className={inputCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  <option value="cod">Cash on Delivery</option>
                  <option value="online">Paid Online</option>
                </select>
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
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg max-h-48 overflow-y-auto">
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
                </div>
              )}
            </div>

            {/* Selected items */}
            {lineItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No products added yet</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map((li) => (
                  <div key={li.product.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-600 flex-shrink-0">
                      {li.product.image_url ? (
                        <Image src={li.product.image_url} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{li.product.name}</p>
                      <p className="text-xs text-gray-400">₹{li.product.price.toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(li.product.id, -1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                      <span className="w-6 text-center text-sm font-medium text-gray-900 dark:text-white">{li.quantity}</span>
                      <button onClick={() => updateQty(li.product.id, 1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Plus className="w-3.5 h-3.5 text-gray-500" /></button>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">₹{(li.product.price * li.quantity).toLocaleString()}</span>
                    <button onClick={() => removeItem(li.product.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"><X className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

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
  product_id: string;
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
  const [shipping, setShipping] = useState(Number(order.shipping));
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

  const updateQty = (productId: string, delta: number) => {
    setLineItems(lineItems.map((li) => {
      if (li.product_id !== productId) return li;
      const newQty = li.quantity + delta;
      return newQty < 1 ? li : { ...li, quantity: newQty };
    }));
  };

  const removeItem = (productId: string) => {
    setLineItems(lineItems.filter((li) => li.product_id !== productId));
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0);
  const total = subtotal + shipping;

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
        product_id: li.product_id,
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
        shipping,
        total,
        status,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
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
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg max-h-48 overflow-y-auto">
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
                </div>
              )}
            </div>

            {lineItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No products — add items above</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map((li) => (
                  <div key={li.product_id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
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
                      <button onClick={() => updateQty(li.product_id, -1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                      <span className="w-6 text-center text-sm font-medium text-gray-900 dark:text-white">{li.quantity}</span>
                      <button onClick={() => updateQty(li.product_id, 1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Plus className="w-3.5 h-3.5 text-gray-500" /></button>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">₹{(li.price * li.quantity).toLocaleString()}</span>
                    <button onClick={() => removeItem(li.product_id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"><X className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                ))}
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Shipping</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Shipping Cost</label>
                <input
                  type="number"
                  className={inputCls}
                  value={shipping}
                  onChange={(e) => setShipping(Number(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div>
                <label className={labelCls}>Order Total</label>
                <p className="px-3 py-2 text-sm font-bold text-gray-900 dark:text-white">₹{total.toLocaleString()}</p>
              </div>
            </div>
          </div>

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
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [creatingShipment, setCreatingShipment] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

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
      // Clear any bad "undefined" shiprocket_order_id so edge function doesn't skip
      await supabase
        .from("orders")
        .update({ shiprocket_order_id: null, shipment_id: null })
        .eq("id", orderId);

      const result = await createShiprocketOrder(orderId);
      toast.success(`Shipment created${result.awb_code ? ` - AWB: ${result.awb_code}` : ""}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shipment");
    } finally {
      setCreatingShipment(null);
    }
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

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{allOrders.length} total orders</p>
          </div>
          <button
            onClick={() => setShowCreateOrder(true)}
            className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Order
          </button>
        </div>

        {showCreateOrder && (
          <CreateOrderModal onClose={() => setShowCreateOrder(false)} onCreated={refetch} />
        )}
        {editingOrder && (
          <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onUpdated={refetch} />
        )}

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !statusFilter ? "bg-coral text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                  statusFilter === status ? "bg-coral text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-400 shadow-sm border border-gray-200 dark:border-gray-700">
            No orders found
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Order Header */}
                <div
                  className="px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => toggleExpand(order.id)}
                >
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
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-coral font-medium">{order.order_number}</span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate">{order.customer_name}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {order.items?.map((i) => `${i.product_name} x${i.quantity}`).join(", ")}
                    </p>
                  </div>
                  {/* Amount */}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">₹{Number(order.total).toLocaleString()}</span>
                  {/* Badges */}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {order.status}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${PAYMENT_STYLES[order.payment_status] || "bg-gray-100 text-gray-700"}`}>
                    {order.payment_status === "paid" ? "Paid" : order.payment_status === "cod" ? "COD" : order.payment_status === "failed" ? "Failed" : "Unpaid"}
                  </span>
                  {/* Date */}
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap hidden md:block">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                  {expandedOrder === order.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>

                {/* Expanded Details */}
                {expandedOrder === order.id && (
                  <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="grid md:grid-cols-2 gap-6">
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
                        {order.payment_status !== "paid" && order.razorpay_order_id && (
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

                      {/* Shipping Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
                          <Truck className="w-4 h-4" /> Shipping Details
                        </h3>
                        {order.shiprocket_order_id && order.shiprocket_order_id !== "undefined" ? (
                          <div className="space-y-2 text-sm text-gray-900 dark:text-gray-200">
                            <p><span className="text-gray-500 dark:text-gray-400">Shiprocket ID:</span> {order.shiprocket_order_id}</p>
                            {order.awb_code && (
                              <p><span className="text-gray-500 dark:text-gray-400">AWB:</span> {order.awb_code}</p>
                            )}
                            {order.courier_name && (
                              <p><span className="text-gray-500 dark:text-gray-400">Courier:</span> {order.courier_name}</p>
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
                        ) : (order.payment_status === "paid" || order.payment_status === "cod") ? (
                          <button
                            onClick={() => handleCreateShipment(order.id)}
                            disabled={creatingShipment === order.id}
                            className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {creatingShipment === order.id ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                            ) : (
                              <><Truck className="w-4 h-4" /> Create Shipment</>
                            )}
                          </button>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500">Payment required before shipping</p>
                        )}
                      </div>

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
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                            <span>Total</span>
                            <span>₹{Number(order.total).toLocaleString()}</span>
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Update Status</h3>
                        <div className="flex items-center gap-3">
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
