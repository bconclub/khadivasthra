import type { Order } from '@/types';

const STORE = {
  name: 'KHADI VASTHRA',
  tagline: 'Authentic Kerala Handloom',
  address: 'Kurumassery P.O, Aluva',
  state: 'Kerala - 683579',
  phone: '8714090510',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateInvoiceHTML(order: Order): string {
  const itemsHtml = order.items
    .map(
      (item, i) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;vertical-align:top;">${i + 1}.</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtml(item.product_name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">₹${Number(item.price).toLocaleString('en-IN')}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">₹${Number(item.subtotal).toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${escapeHtml(order.order_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
    @page { size: A4; margin: 15mm; }
  </style>
</head>
<body>
  <div style="max-width:600px;margin:0 auto;border:2px solid #E8657B;border-radius:8px;overflow:hidden;">
    <!-- Header -->
    <div style="background:#E8657B;color:white;padding:24px;text-align:center;">
      <h1 style="font-size:22px;letter-spacing:2px;margin-bottom:4px;">${STORE.name}</h1>
      <p style="font-size:13px;opacity:0.9;">${STORE.tagline}</p>
      <p style="font-size:12px;opacity:0.8;margin-top:4px;">${STORE.address}, ${STORE.state}</p>
      <p style="font-size:12px;opacity:0.8;">Phone: ${STORE.phone}</p>
    </div>

    <!-- Invoice Title -->
    <div style="padding:16px 24px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <h2 style="font-size:16px;color:#E8657B;margin-bottom:2px;">TAX INVOICE</h2>
        <p style="font-size:13px;color:#666;">Order: <strong>${escapeHtml(order.order_number)}</strong></p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:13px;color:#666;">Date: <strong>${formatDate(order.created_at)}</strong></p>
      </div>
    </div>

    <!-- Bill To -->
    <div style="padding:16px 24px;border-bottom:1px solid #eee;">
      <h3 style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Bill To</h3>
      <p style="font-size:14px;font-weight:600;">${escapeHtml(order.customer_name)}</p>
      <p style="font-size:13px;color:#555;margin-top:4px;">${escapeHtml(order.customer_address)}</p>
      <p style="font-size:13px;color:#555;">${escapeHtml(order.customer_city)}, ${escapeHtml(order.customer_state)} - ${escapeHtml(order.customer_pincode)}</p>
      <p style="font-size:13px;color:#555;">Phone: ${escapeHtml(order.customer_phone)}</p>
    </div>

    <!-- Items -->
    <div style="padding:16px 24px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid #E8657B;">
            <th style="padding:8px 0;text-align:left;width:30px;">#</th>
            <th style="padding:8px;text-align:left;">Item</th>
            <th style="padding:8px;text-align:center;width:50px;">Qty</th>
            <th style="padding:8px 0;text-align:right;width:80px;">Price</th>
            <th style="padding:8px 0;text-align:right;width:80px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="margin-top:16px;border-top:2px solid #eee;padding-top:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:4px;">
          <span>Subtotal</span>
          <span>₹${Number(order.subtotal).toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:8px;">
          <span>Shipping</span>
          <span>₹${Number(order.shipping || 0).toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#E8657B;border-top:2px solid #E8657B;padding-top:8px;">
          <span>TOTAL</span>
          <span>₹${Number(order.total).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:12px 24px;border-top:1px solid #eee;background:#faf5f0;display:flex;justify-content:space-between;font-size:12px;color:#888;">
      <span>Payment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'} — ${order.payment_status?.toUpperCase()}</span>
      ${order.shiprocket_order_id && order.shiprocket_order_id !== 'undefined' ? `<span>Shiprocket ID: ${escapeHtml(order.shiprocket_order_id)}</span>` : ''}
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#E8657B;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Print Invoice</button>
  </div>
</body>
</html>`;
}

function generateLabelHTML(order: Order): string {
  const totalPcs = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Label - ${escapeHtml(order.order_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
    @page { size: 4in 6in; margin: 5mm; }
  </style>
</head>
<body>
  <div style="max-width:380px;margin:0 auto;border:2px solid #333;border-radius:4px;overflow:hidden;">
    <!-- From -->
    <div style="padding:16px;border-bottom:2px solid #333;background:#f8f8f8;">
      <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">From</p>
      <p style="font-size:14px;font-weight:700;">${STORE.name}</p>
      <p style="font-size:13px;color:#555;">${STORE.address}</p>
      <p style="font-size:13px;color:#555;">${STORE.state}</p>
      <p style="font-size:13px;color:#555;">Ph: ${STORE.phone}</p>
    </div>

    <!-- To -->
    <div style="padding:20px 16px;border-bottom:2px solid #333;">
      <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">To</p>
      <p style="font-size:16px;font-weight:700;margin-bottom:6px;">${escapeHtml(order.customer_name)}</p>
      <p style="font-size:14px;color:#333;line-height:1.5;">${escapeHtml(order.customer_address)}</p>
      <p style="font-size:16px;font-weight:700;margin-top:6px;">${escapeHtml(order.customer_city).toUpperCase()} - ${escapeHtml(order.customer_pincode)}</p>
      <p style="font-size:14px;color:#555;">${escapeHtml(order.customer_state)}</p>
      <p style="font-size:14px;color:#555;margin-top:6px;">Ph: ${escapeHtml(order.customer_phone)}</p>
    </div>

    <!-- Order Info -->
    <div style="padding:12px 16px;display:flex;justify-content:space-between;font-size:13px;">
      <span><strong>Order:</strong> ${escapeHtml(order.order_number)}</span>
      <span><strong>Items:</strong> ${totalPcs} pc${totalPcs !== 1 ? 's' : ''}</span>
    </div>
    ${order.payment_method === 'cod' ? '<div style="padding:8px 16px;background:#E8657B;color:white;text-align:center;font-weight:700;font-size:14px;letter-spacing:1px;">COD — ₹' + Number(order.total).toLocaleString('en-IN') + '</div>' : ''}
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#E8657B;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Print Label</button>
  </div>
</body>
</html>`;
}

function generateBulkHTML(orders: Order[], type: 'invoice' | 'label'): string {
  const generator = type === 'invoice' ? generateInvoiceHTML : generateLabelHTML;

  // Extract the inner content (between <body> tags) from each order
  const pages = orders.map((order) => {
    const html = generator(order);
    const bodyMatch = html.match(/<body>([\s\S]*?)<div class="no-print"/);
    return bodyMatch ? bodyMatch[1] : '';
  });

  const pageBreakStyle = type === 'invoice'
    ? '@page { size: A4; margin: 15mm; }'
    : '@page { size: 4in 6in; margin: 5mm; }';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bulk ${type === 'invoice' ? 'Invoices' : 'Labels'} (${orders.length})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; }
    .page-break { page-break-after: always; margin-bottom: 30px; }
    .page-break:last-child { page-break-after: avoid; margin-bottom: 0; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .page-break { margin-bottom: 0; }
    }
    ${pageBreakStyle}
  </style>
</head>
<body>
  ${pages.map((p) => `<div class="page-break">${p}</div>`).join('\n')}
  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#E8657B;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Print All (${orders.length})</button>
  </div>
</body>
</html>`;
}

export function printOrder(order: Order, type: 'invoice' | 'label') {
  const html = type === 'invoice' ? generateInvoiceHTML(order) : generateLabelHTML(order);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printOrders(orders: Order[], type: 'invoice' | 'label') {
  if (orders.length === 0) return;
  if (orders.length === 1) {
    printOrder(orders[0], type);
    return;
  }
  const html = generateBulkHTML(orders, type);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
