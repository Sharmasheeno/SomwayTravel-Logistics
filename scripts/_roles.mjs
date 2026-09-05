import { chromium } from "playwright";

const check = async (label, email, password, shot) => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message.slice(0, 120)));
  p.on("console", (m) => {
    if (m.type() === "error" && !/401|429/.test(m.text())) errs.push(m.text().slice(0, 120));
  });
  await p.goto("http://localhost:5173/admin", { waitUntil: "networkidle" });
  await p.locator('input[autocomplete="username"]').fill(email);
  await p.locator('input[type="password"]').fill(password);
  await p.locator('button[type="submit"]').click();
  await p.waitForTimeout(3600);

  const nav = p.locator(".sidebar nav button").filter({ hasText: "Daily Summary" });
  if (!(await nav.count())) {
    console.log(`\n=== ${label}: no Daily Summary in nav ===`);
    await c.close(); await b.close(); return;
  }
  await nav.first().click();
  await p.waitForTimeout(3200);
  await p.locator(".daily-summary-filters input[type=date]").fill("2026-09-01");
  await p.waitForTimeout(3200);

  const branchSelect = p.locator(".daily-summary-filters select").first();
  const body = await p.locator(".ds-main").innerText();
  const out = {
    branchDisabled: await branchSelect.isDisabled(),
    branchValue: await branchSelect.inputValue(),
    branchOptions: (await branchSelect.locator("option").allInnerTexts()).join(","),
    summaryRows: await p.locator(".ds-main .table-wrap tbody tr").count(),
    branchesShown: [...new Set((await p.locator(".ds-charts .table-wrap tbody tr td:first-child").allInnerTexts()).map((t) => t.split("\n")[0]))].join(" / "),
    recalcDayBtn: await p.locator(".ds-checklist-foot button").count(),
    recalcRowBtn: await p.getByRole("button", { name: "Recalculate", exact: true }).count(),
    timelineItems: await p.locator(".ds-timeline li").count(),
    timelineEmpty: await p.locator(".ds-timeline-panel .empty").count(),
    showsDirectCost: /Direct Cost/i.test(body),
    showsProfit: /Total Profit/i.test(body),
    panelTitles: (await p.locator(".ds-charts .panel-head h3").allInnerTexts()).join(" | "),
    kpiFoot: (await p.locator(".daily-summary-kpis .metric-foot").allInnerTexts()).map((t) => t.replace(/\n/g, " ")).slice(0, 3).join(" ; "),
    footLines: await p.evaluate(() => {
      const el = document.querySelector(".daily-summary-kpis .metric-foot");
      return el ? Math.round(el.getBoundingClientRect().height) : 0;
    }),
    overflow: await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2),
  };
  console.log(`\n=== ${label} ===`);
  for (const [k, v] of Object.entries(out)) console.log(`  ${k}: ${v}`);
  console.log("  errors:", errs.length ? JSON.stringify([...new Set(errs)].slice(0, 3)) : "(none)");
  if (shot) await p.screenshot({ path: shot, fullPage: true });
  await c.close();
  await b.close();
};

const shotDir = process.argv[2] || ".";
// Credentials come from the environment so this local check script never
// carries a working login into the repository.
const need = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`Set ${key} before running this check.`);
    process.exit(1);
  }
  return value;
};
await check("OWNER", need("CHECK_OWNER_EMAIL"), need("CHECK_OWNER_PASSWORD"), `${shotDir}/role-owner.png`);
await check("OPERATOR", need("CHECK_OPERATOR_EMAIL"), need("CHECK_OPERATOR_PASSWORD"), `${shotDir}/role-operator.png`);
