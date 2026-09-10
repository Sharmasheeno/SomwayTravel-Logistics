import test from "node:test";
import assert from "node:assert/strict";
import { buildReceiptHtml } from "../app/lib/receipt.mjs";

const receipt = { agencyName: "SomWay", ref: "REF-01", client: "Client", currency: "USD", amount: 620, paymentStatus: "unpaid", details: [["Route", "Mogadishu → Nairobi"]], cost: 499, profit: 121, amountPaid: 33, balance: 587, notes: "Internal cost 499" };
for (const kind of ["ticket", "visa", "cargo"]) {
  test(`${kind} receipt shows total only and never renders internal finance or notes`, () => {
    const html = buildReceiptHtml({ ...receipt, kind });
    assert.match(html, /Total amount/);
    assert.match(html, /USD 620\.00/);
    assert.doesNotMatch(html, /Agency cost|Profit|Balance|499|121|587|Internal cost/);
    assert.match(html, new RegExp(`sheet ${kind}`));
    assert.doesNotMatch(html, /✓ unpaid/);
  });
}
test("receipt escapes client and attribute values", () => {
  const html = buildReceiptHtml({ ...receipt, kind: "cargo", client: '<script>alert("x")</script>' }, 'x" onerror="alert(1)');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /x&quot; onerror=&quot;alert\(1\)/);
});
test("partial and unpaid receipts never claim full payment", () => {
  for (const status of ["unpaid", "partial"]) assert.doesNotMatch(buildReceiptHtml({ ...receipt, paymentStatus: status }), /✓/);
  assert.match(buildReceiptHtml({ ...receipt, paymentStatus: "paid" }), /✓ paid/);
});
