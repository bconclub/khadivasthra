import type { Order } from '@/types';
import { variantLabel, comboLabel } from "./order-item";

const STORE = {
  name: 'KHADI VASTHRA',
  address1: 'Syppies Complex, Kurumassery (P.O),',
  address2: 'Kurumassery, Aluva, Ernakulam, Kerala',
  pincode: '683579',
  phone: '+91 8714090510',
};

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function esc(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function inr(n: number): string {
  return '₹' + Number(n).toLocaleString('en-IN');
}

// ─── TAX INVOICE (A4) ───────────────────────────────────────────────

function generateInvoiceHTML(order: Order): string {
  const isCod = order.payment_method === 'cod';
  const codCharges = Number(order.cod_charges) || 0;

  const itemRows = order.items.map((item, i) => `
    <tr>
      <td class="cell cell-num">${i + 1}</td>
      <td class="cell cell-product">${esc(item.product_name)}${
        variantLabel(item) ? `<br><span class="variant">${esc(variantLabel(item))}</span>` : ""
      }${
        comboLabel(item) ? `<br><span class="variant">Combo: ${esc(comboLabel(item))}</span>` : ""
      }</td>
      <td class="cell cell-center">${item.quantity}</td>
      <td class="cell cell-right">${inr(item.price)}</td>
      <td class="cell cell-right">${inr(item.subtotal)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice - ${esc(order.order_number)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color:#222; }
  @page { size:A4; margin:12mm 15mm; }
  @media print {
    body { padding:0; }
    .no-print { display:none !important; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    .logo-footer { display:flex !important; background:#000 !important; }
    .logo-footer img { display:inline-block !important; visibility:visible !important; }
  }
  .invoice { max-width:720px; margin:0 auto; border:2px solid #222; }
  .section { padding:14px 20px; border-bottom:2px solid #222; }
  .section:last-child { border-bottom:none; }

  .title-bar { background:#222; color:#fff; text-align:center; padding:10px 20px; font-size:18px; font-weight:700; letter-spacing:3px; }

  .store-info { font-size:13px; line-height:1.6; }
  .store-name { font-size:16px; font-weight:700; margin-bottom:2px; }

  .meta-grid { display:flex; flex-wrap:wrap; gap:4px 24px; font-size:13px; line-height:1.6; }
  .meta-grid b { font-weight:600; }

  .bill-to-label { font-size:11px; font-weight:700; letter-spacing:1.5px; color:#666; margin-bottom:6px; }
  .bill-to { font-size:13px; line-height:1.6; }
  .bill-to .name { font-size:14px; font-weight:700; }

  .items-label { font-size:11px; font-weight:700; letter-spacing:1.5px; color:#666; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead tr { background:#f5f5f5; }
  th { padding:8px 10px; text-align:left; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #222; }
  th.r { text-align:right; }
  th.c { text-align:center; }
  .cell { padding:10px; border-bottom:1px solid #ddd; vertical-align:top; }
  .cell-num { width:36px; text-align:center; }
  .cell-product { }
    .variant{font-size:10px;font-weight:700;color:#E8657B;}
  .cell-center { text-align:center; width:50px; }
  .cell-right { text-align:right; width:90px; }

  .totals { display:flex; flex-direction:column; align-items:flex-end; gap:4px; font-size:13px; }
  .totals .row { display:flex; gap:20px; min-width:240px; justify-content:space-between; }
  .totals .row.grand { border-top:2px solid #222; padding-top:8px; margin-top:4px; font-size:16px; font-weight:700; }

  .terms { font-size:11px; color:#666; line-height:1.6; }
  .terms-label { font-size:11px; font-weight:700; letter-spacing:1px; color:#666; margin-bottom:4px; }

  .footer { text-align:center; padding:16px 20px; background:#fafafa; border-top:2px solid #222; }
  .footer-brand { font-size:16px; font-weight:700; letter-spacing:2px; color:#222; }
  .footer-thanks { font-size:12px; color:#888; margin-top:4px; }
</style>
</head>
<body>
<div class="invoice">
  <!-- Title -->
  <div class="title-bar">TAX INVOICE</div>

  <!-- Store Info -->
  <div class="section store-info">
    <div class="store-name">${STORE.name}</div>
    <div>${STORE.address1}</div>
    <div>${STORE.address2}</div>
    <div>Pin: ${STORE.pincode} &nbsp;|&nbsp; Ph: ${STORE.phone}</div>
  </div>

  <!-- Invoice Meta -->
  <div class="section meta-grid">
    <div><b>Invoice No:</b> ${esc(order.order_number)}</div>
    <div><b>Date:</b> ${fmt(order.created_at)}</div>
    <div><b>Payment:</b> ${isCod ? 'COD' : 'PREPAID'}</div>
    ${order.article_number ? `<div><b>Article No:</b> ${esc(order.article_number)}</div>` : ''}
  </div>

  <!-- Bill To -->
  <div class="section">
    <div class="bill-to-label">BILL TO</div>
    <div class="bill-to">
      <div class="name">${esc(order.customer_name)}</div>
      <div>${esc(order.customer_address)}</div>
      <div>${esc(order.customer_city)}, ${esc(order.customer_state)}</div>
      <div>Pin: ${esc(order.customer_pincode)} &nbsp;|&nbsp; Ph: ${esc(order.customer_phone)}</div>
    </div>
  </div>

  <!-- Items -->
  <div class="section">
    <div class="items-label">ITEMS</div>
    <table>
      <thead>
        <tr>
          <th class="c">#</th>
          <th>Product</th>
          <th class="c">Qty</th>
          <th class="r">Rate</th>
          <th class="r">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="section">
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${inr(order.subtotal)}</span></div>
      <div class="row"><span>Shipping</span><span>${inr(order.shipping || 0)}</span></div>
      ${codCharges > 0 ? `<div class="row"><span>COD Charges (1.6%)</span><span>${inr(codCharges)}</span></div>` : ''}
      <div class="row grand"><span>GRAND TOTAL</span><span>${inr(order.total)}</span></div>
    </div>
    ${isCod ? `<div style="margin-top:8px;font-size:12px;color:#666;">COD Settlement: ${(order.settlement_status || 'pending').toUpperCase()}</div>` : ''}
  </div>

  <!-- Terms -->
  <div class="section terms">
    <div class="terms-label">Terms &amp; Conditions</div>
    <div>&bull; Goods once sold will not be returned</div>
    <div>&bull; Subject to Ernakulam jurisdiction</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">${STORE.name}</div>
    <div class="footer-thanks">Thank you for your purchase!</div>
  </div>
</div>

<div class="no-print" style="text-align:center;margin-top:24px;display:flex;gap:12px;justify-content:center;">
  <button onclick="window.print()" style="padding:10px 24px;background:#222;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Print Invoice</button>
  <button onclick="(async()=>{try{await navigator.share({title:'Invoice ${esc(order.order_number)}',text:'Invoice from KHADI VASTHRA',url:window.location.href});}catch(e){navigator.clipboard?.writeText(window.location.href).then(()=>alert('Link copied!'));}})();" style="padding:10px 24px;background:#4b5563;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Share Invoice</button>
</div>
</body>
</html>`;
}

// ─── SHIPPING STICKER (4x6 inch) ────────────────────────────────────

function generateStickerHTML(order: Order): string {
  const isCod = order.payment_method === 'cod';
  const codCharges = Number(order.cod_charges) || 0;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const totalPcs = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemLines = order.items.map((item) =>
    `<div class="item-row"><span>${esc(item.product_name)}${
      variantLabel(item) ? ` <b>${esc(variantLabel(item))}</b>` : ""
    }${
      comboLabel(item) ? ` [${esc(comboLabel(item))}]` : ""
    } x${item.quantity}</span><span>${inr(item.subtotal)}</span></div>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Sticker - ${esc(order.order_number)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; color:#000 !important; -webkit-text-fill-color:#000 !important; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color:#000; }
  @page { size:3.93in 5.9in; margin:3mm; }
  @media print {
    body { padding:0; }
    .no-print { display:none !important; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    .logo-footer { display:flex !important; background:#000 !important; }
    .logo-footer img { display:inline-block !important; visibility:visible !important; }
  }
  .sticker { width:3.87in; margin:0 auto; border:2px solid #000; font-size:12px; }
  .row-section { padding:10px 12px; border-bottom:2px solid #000; }
  .row-section:last-child { border-bottom:none; }

  /* Top bar */
  .top-bar { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:2px solid #000; font-size:13px; font-weight:700; }
  .checkbox-group { display:flex; gap:16px; }
  .cb { display:inline-flex; align-items:center; gap:4px; }
  .cb-box { width:16px; height:16px; border:2px solid #000; display:inline-flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; }
  .cb-box.checked { background:#000; color:#fff; }

  /* Article Number */
  .article-no { font-size:12px; font-weight:600; color:#000; padding:6px 12px; border-bottom:2px solid #000; }

  /* From */
  .from-label, .to-label { font-size:10px; font-weight:700; letter-spacing:1px; color:#000; margin-bottom:4px; }
  .from-section { font-size:11px; line-height:1.5; }
  .from-name { font-weight:700; font-size:12px; }

  /* To */
  .to-section { line-height:1.5; }
  .to-name { font-size:15px; font-weight:900; margin-bottom:2px; }
  .to-addr { font-size:12px; }
  .to-city { font-size:14px; font-weight:800; margin-top:4px; }
  .to-state { font-size:12px; }
  .to-phone { font-size:12px; margin-top:4px; }

  /* Items & Total */
  .items-section { font-size:11px; line-height:1.4; }
  .items-heading { font-size:10px; font-weight:700; letter-spacing:1px; color:#000; margin-bottom:4px; }
  .item-row { display:flex; justify-content:space-between; padding:2px 0; }
  .items-total { display:flex; justify-content:space-between; border-top:1px solid #000; margin-top:4px; padding-top:4px; font-size:12px; font-weight:800; }

  /* Logo footer */
  .logo-footer { display:flex !important; justify-content:space-between; align-items:center; padding:8px 12px; border-top:2px solid #000; background:#000 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  .logo-footer img { height:36px; width:auto; display:inline-block !important; visibility:visible !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
</style>
</head>
<body>
<div class="sticker">
  <!-- Top: COD / PREPAID -->
  <div class="top-bar">
    <div class="checkbox-group">
      <span class="cb"><span class="cb-box${isCod ? ' checked' : ''}">${isCod ? '✓' : ''}</span> COD</span>
      <span class="cb"><span class="cb-box${!isCod ? ' checked' : ''}">${!isCod ? '✓' : ''}</span> PREPAID</span>
      ${isCod ? `<span style="font-size:14px; margin-left:8px;">${inr(order.total)}</span>` : ''}
    </div>
    <span style="font-size:11px; font-weight:700; letter-spacing:0.5px;">CID: 1248959333</span>
  </div>

  <!-- Article Number (COD only) -->
  ${isCod && order.article_number ? `<div class="article-no">Article No: ${esc(order.article_number)}</div>` : ''}

  <!-- From -->
  <div class="row-section from-section">
    <div class="from-label">From,</div>
    <div class="from-name">${STORE.name}</div>
    <div>${STORE.address1}</div>
    <div>${STORE.address2}</div>
    <div>Pin: ${STORE.pincode} &nbsp; Ph: ${STORE.phone}</div>
  </div>

  <!-- To -->
  <div class="row-section to-section">
    <div class="to-label">To,</div>
    <div class="to-name">${esc(order.customer_name)}</div>
    <div class="to-addr">${esc(order.customer_address)}</div>
    <div class="to-city">${esc(order.customer_city)}, ${esc(order.customer_state)}</div>
    <div class="to-phone">Pin: ${esc(order.customer_pincode)} &nbsp;|&nbsp; Ph: ${esc(order.customer_phone)}</div>
  </div>

  <!-- Items & Total -->
  <div class="row-section items-section">
    <div class="items-heading">${totalPcs} ITEM${totalPcs !== 1 ? 'S' : ''}</div>
    ${itemLines}
    ${codCharges > 0 ? `<div class="item-row"><span>COD Charges (1.6%)</span><span>${inr(codCharges)}</span></div>` : ''}
    <div class="items-total"><span>Total</span><span>${inr(order.total)}</span></div>
  </div>

  <!-- Logo Footer -->
  <div class="logo-footer" style="display:flex !important; justify-content:space-between; align-items:center; padding:8px 12px; border-top:2px solid #000; background:#000 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;">
    <img src="${origin}/logo_languages/Artboard%201.webp" alt="Khadi Vasthra logo 1" style="height:36px; width:auto; display:inline-block !important; visibility:visible !important;" />
    <img src="${origin}/logo_languages/Artboard%202.webp" alt="Khadi Vasthra logo 2" style="height:36px; width:auto; display:inline-block !important; visibility:visible !important;" />
    <img src="${origin}/logo_languages/Artboard%203.webp" alt="Khadi Vasthra logo 3" style="height:36px; width:auto; display:inline-block !important; visibility:visible !important;" />
    <img src="${origin}/logo_languages/Artboard%204.webp" alt="Khadi Vasthra logo 4" style="height:36px; width:auto; display:inline-block !important; visibility:visible !important;" />
  </div>
</div>

<div class="no-print" style="text-align:center;margin-top:24px;">
  <button onclick="window.print()" style="padding:10px 24px;background:#222;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Print Sticker</button>
  <p style="margin-top:12px;font-size:12px;color:#666;">Tip: Enable "Print backgrounds" and "Print images" in your browser print settings for best results.</p>
</div>
</body>
</html>`;
}

// ─── BULK PRINT ─────────────────────────────────────────────────────

function generateBulkHTML(orders: Order[], type: 'invoice' | 'sticker'): string {
  const generator = type === 'invoice' ? generateInvoiceHTML : generateStickerHTML;

  const pages = orders.map((order) => {
    const html = generator(order);
    const bodyMatch = html.match(/<body>([\s\S]*?)<div class="no-print"/);
    return bodyMatch ? bodyMatch[1] : '';
  });

  const pageSize = type === 'invoice'
    ? '@page { size:A4; margin:12mm 15mm; }'
    : '@page { size:3.93in 5.9in; margin:3mm; }';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Bulk ${type === 'invoice' ? 'Invoices' : 'Stickers'} (${orders.length})</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color:#222; padding:20px; }
  .page-break { page-break-after:always; margin-bottom:30px; }
  .page-break:last-child { page-break-after:avoid; margin-bottom:0; }
  @media print {
    body { padding:0; }
    .no-print { display:none !important; }
    .page-break { margin-bottom:0; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    .logo-footer { display:flex !important; background:#000 !important; }
    .logo-footer img { display:inline-block !important; visibility:visible !important; }
  }
  ${pageSize}

  /* Invoice styles (duplicated for bulk context) */
  .invoice { max-width:720px; margin:0 auto; border:2px solid #222; }
  .section { padding:14px 20px; border-bottom:2px solid #222; }
  .section:last-child { border-bottom:none; }
  .title-bar { background:#222; color:#fff; text-align:center; padding:10px 20px; font-size:18px; font-weight:700; letter-spacing:3px; }
  .store-info { font-size:13px; line-height:1.6; }
  .store-name { font-size:16px; font-weight:700; margin-bottom:2px; }
  .meta-grid { display:flex; flex-wrap:wrap; gap:4px 24px; font-size:13px; line-height:1.6; }
  .meta-grid b { font-weight:600; }
  .bill-to-label { font-size:11px; font-weight:700; letter-spacing:1.5px; color:#666; margin-bottom:6px; }
  .bill-to { font-size:13px; line-height:1.6; }
  .bill-to .name { font-size:14px; font-weight:700; }
  .items-label { font-size:11px; font-weight:700; letter-spacing:1.5px; color:#666; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead tr { background:#f5f5f5; }
  th { padding:8px 10px; text-align:left; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #222; }
  th.r { text-align:right; } th.c { text-align:center; }
  .cell { padding:10px; border-bottom:1px solid #ddd; vertical-align:top; }
  .cell-num { width:36px; text-align:center; }
  .cell-center { text-align:center; width:50px; }
  .cell-right { text-align:right; width:90px; }
  .totals { display:flex; flex-direction:column; align-items:flex-end; gap:4px; font-size:13px; }
  .totals .row { display:flex; gap:20px; min-width:240px; justify-content:space-between; }
  .totals .row.grand { border-top:2px solid #222; padding-top:8px; margin-top:4px; font-size:16px; font-weight:700; }
  .terms { font-size:11px; color:#666; line-height:1.6; }
  .terms-label { font-size:11px; font-weight:700; letter-spacing:1px; color:#666; margin-bottom:4px; }
  .footer { text-align:center; padding:16px 20px; background:#fafafa; border-top:2px solid #222; }
  .footer-brand { font-size:16px; font-weight:700; letter-spacing:2px; color:#222; }
  .footer-thanks { font-size:12px; color:#888; margin-top:4px; }

  /* Sticker styles (duplicated for bulk context) */
  .sticker { width:3.87in; margin:0 auto; border:2px solid #000; font-size:12px; }
  .row-section { padding:10px 12px; border-bottom:2px solid #000; }
  .row-section:last-child { border-bottom:none; }
  .top-bar { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:2px solid #000; font-size:13px; font-weight:700; }
  .checkbox-group { display:flex; gap:16px; }
  .cb { display:inline-flex; align-items:center; gap:4px; }
  .cb-box { width:16px; height:16px; border:2px solid #000; display:inline-flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; }
  .cb-box.checked { background:#000; color:#fff; }
  .article-no { font-size:12px; font-weight:600; color:#000; padding:6px 12px; border-bottom:2px solid #000; }
  .from-label, .to-label { font-size:10px; font-weight:700; letter-spacing:1px; color:#000; margin-bottom:4px; }
  .from-section { font-size:11px; line-height:1.5; }
  .from-name { font-weight:700; font-size:12px; }
  .to-section { line-height:1.5; }
  .to-name { font-size:15px; font-weight:900; margin-bottom:2px; }
  .to-addr { font-size:12px; }
  .to-city { font-size:14px; font-weight:800; margin-top:4px; }
  .to-state { font-size:12px; }
  .to-phone { font-size:12px; margin-top:4px; }
  .items-section { font-size:11px; line-height:1.4; }
  .items-heading { font-size:10px; font-weight:700; letter-spacing:1px; color:#000; margin-bottom:4px; }
  .item-row { display:flex; justify-content:space-between; padding:2px 0; }
  .items-total { display:flex; justify-content:space-between; border-top:1px solid #000; margin-top:4px; padding-top:4px; font-size:12px; font-weight:800; }
  .logo-footer { display:flex !important; justify-content:space-between; align-items:center; padding:8px 12px; border-top:2px solid #000; background:#000 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .logo-footer img { height:36px; width:auto; display:inline-block !important; visibility:visible !important; }
</style>
</head>
<body>
  ${pages.map((p) => `<div class="page-break">${p}</div>`).join('\n')}
  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#222;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Print All (${orders.length})</button>
    <p style="margin-top:12px;font-size:12px;color:#666;">Tip: Enable "Print backgrounds" and "Print images" in your browser print settings for best results.</p>
  </div>
</body>
</html>`;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────

export function printOrder(order: Order, type: 'invoice' | 'sticker') {
  const html = type === 'invoice' ? generateInvoiceHTML(order) : generateStickerHTML(order);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printOrders(orders: Order[], type: 'invoice' | 'sticker') {
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
