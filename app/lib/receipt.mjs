const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export const receiptTitles = {
  ticket: "Airline Ticketing",
  visa: "Visa Assistance",
  cargo: "Air Cargo",
};

// Only customer-facing fields are rendered. Never serialize the source record.
export function buildReceiptHtml(receipt, logoUrl = "/Som-way2.png", autoPrint = false) {
  const kind = Object.hasOwn(receiptTitles, receipt.kind) ? receipt.kind : "cargo";
  const title = receiptTitles[kind];
  const esc = escapeHtml;
  const tagline = { ticket: "Fly further. Travel easier.", visa: "Your journey. Our support.", cargo: "Your cargo. Our commitment." }[kind];
  // Meaningful, print-safe line icons so each receipt is instantly recognisable:
  // a plane for air tickets, a passport for visa assistance, a shipping box for
  // air cargo. Drawn white (currentColor) to sit on the blue circle.
  const icons = {
    // Plane (Lucide "plane") — air ticketing.
    ticket:
      '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
    // Passport: a booklet cover with a globe and spine — visa assistance.
    visa:
      '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><circle cx="12" cy="9.5" r="3.2"/><path d="M8.8 9.5h6.4"/><path d="M12 6.3c1.4 1.9 1.4 4.5 0 6.4c-1.4-1.9-1.4-4.5 0-6.4z"/><path d="M9.5 17.5h5"/></svg>',
    // Package box (Lucide "package") — air cargo.
    cargo:
      '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5.05L20.7 7"/><path d="M12 22.08V12"/></svg>',
  };
  const icon = icons[kind] || icons.cargo;
  const status = String(receipt.paymentStatus || "unpaid");
  const paid = ["paid", "refunded"].includes(status.toLowerCase());
  const details = [
    ["Client name", receipt.client],
    ["Service", title],
    ...(receipt.details || []),
    ["Date", receipt.date],
    ["Branch", receipt.branch],
    ["Payment method", receipt.method || "—"],
  ];
  const amount = `${receipt.currency} ${Number(receipt.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>receipt-${esc(receipt.ref)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#edf4fa;color:#07265a;font-family:Arial,sans-serif;font-size:16px;line-height:1.4}
  .sheet{max-width:520px;margin:20px auto;background:white;border:1px solid #dce7ef;border-radius:20px;overflow:hidden;box-shadow:0 10px 35px #092e6010}
  .brand{background:#062757;padding:18px 26px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand img{width:76%;height:auto;max-height:90px;object-fit:contain}.brand span{font-size:10px;color:white;line-height:1.7}
  main{padding:24px}.heading{display:flex;align-items:center;gap:18px;margin-bottom:24px}.symbol{width:76px;height:76px;border-radius:50%;background:#0671ce;color:white;display:grid;place-items:center;font-size:44px;flex-shrink:0}
  h1{font-size:24px;line-height:1.15;text-transform:uppercase;margin:0}h1 strong{display:block;color:#066bc3;font-size:32px}.tagline{margin:8px 0 0;font-size:14px}
  .reference{background:#edf7ff;border-radius:12px;padding:16px;margin-bottom:14px;display:grid;gap:7px;font-size:14px}.reference div{display:flex;justify-content:space-between;gap:14px}.reference strong{overflow-wrap:anywhere;text-align:right}
  dl{margin:0}dl div{display:grid;grid-template-columns:42% 1fr;gap:12px;border-bottom:1px solid #dce5ed;padding:10px 4px;break-inside:avoid}dt{font-weight:600;font-size:14px}dd{margin:0;overflow-wrap:anywhere}
  .total{background:#edf7ff;border-radius:14px;padding:18px;margin-top:22px;display:flex;align-items:center;justify-content:space-between;gap:12px;break-inside:avoid}.total small{display:block;font-size:15px}.total strong{display:block;font-size:30px;line-height:1.3;color:#001c4a}.status{padding:7px 12px;border-radius:30px;background:${paid ? "#d6f0df;color:#12622b" : "#fff0ce;color:#785300"};font-size:14px;text-transform:capitalize;font-weight:bold}
  .thanks{text-align:center;background:#e7f5ff;border-radius:12px;padding:15px;margin-top:14px;font-size:14px}.thanks strong{display:block;font-size:16px}.served{font-size:12px;margin:12px 0 0;color:#46617e}
  footer{background:#07539d;color:white;padding:22px 26px;display:grid;grid-template-columns:1fr auto;gap:20px;font-size:12px;line-height:1.55;break-inside:avoid}footer strong{font-size:13px}footer p{margin:0 0 10px}footer p:last-child{margin:0}.motto{border-left:1px solid #ffffff70;padding-left:18px;align-self:stretch;display:flex;align-items:center}
  .ticket{max-width:680px;border-radius:12px}.ticket .heading{border-bottom:2px dashed #aad4ef;padding-bottom:20px}.ticket dl{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}.ticket dl div{display:block}.ticket dd{margin-top:5px}.ticket .reference{border-left:5px solid #0879d4}.ticket .symbol{border-radius:12px}
  .visa .heading{flex-direction:column;text-align:center}.visa .symbol{width:64px;height:64px;font-size:38px}.visa main{border-top:5px solid #0796c9}.visa .reference{background:white;border:1px solid #97c8e9}.visa .total{border-left:5px solid #0879d4}
  .toolbar{max-width:680px;margin:16px auto;text-align:center}button{padding:12px 22px;background:#07539d;color:white;border:0;border-radius:8px;font:inherit;cursor:pointer}
  @media(max-width:540px){.sheet{margin:0;border-radius:0}.ticket dl{display:block}main{padding:18px}.total strong{font-size:26px}h1{font-size:20px}h1 strong{font-size:28px}}
  @page{size:A4;margin:10mm}@media print{body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{margin:0 auto;box-shadow:none;border:0}.toolbar{display:none}main{padding-top:18px;padding-bottom:18px}dl div{padding-top:7px;padding-bottom:7px}footer{padding:16px 24px}}
  </style></head><body><article class="sheet ${kind}">
  <header class="brand"><img src="${esc(logoUrl)}" alt="${esc(receipt.agencyName)}"><span>PEOPLE<br>PLACES<br>POSSIBILITIES</span></header>
  <main><div class="heading"><span class="symbol" aria-hidden="true">${icon}</span><div><h1>${title}<strong>Receipt</strong></h1><p class="tagline">${tagline}</p></div></div>
  <div class="reference"><div><span>Receipt number</span><strong>${esc(receipt.ref)}</strong></div>${kind === "cargo" ? `<div><span>Tracking number</span><strong>${esc(receipt.ref)}</strong></div>` : ""}</div>
  <dl>${details.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value || "—")}</dd></div>`).join("")}</dl>
  <div class="total"><div><small>Total amount</small><strong>${esc(amount)}</strong></div><span class="status">${paid ? "✓ " : ""}${esc(status)}</span></div>
  <div class="thanks"><strong>Thank you for choosing SomWay</strong>${tagline}</div><p class="served">Served by ${esc(receipt.served || "Agency team")}</p></main>
  <footer><div><p><strong>Mogadishu Branch</strong><br>Fathi Taleh, Mogadishu Somalia<br>+252615633609 / 0617888038 / 0613471566</p><p><strong>Nairobi Branch</strong><br>+254729690965</p><p>somwaytravel@gmail.com<br>@Somwaytravel</p></div><div class="motto">PEOPLE<br>PLACES<br>POSSIBILITIES</div></footer>
  </article>${autoPrint ? `<div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div><script>window.addEventListener('load',()=>{window.focus();window.print()})</script>` : ""}</body></html>`;
}
