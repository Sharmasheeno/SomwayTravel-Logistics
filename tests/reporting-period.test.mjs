import assert from "node:assert/strict";
import test from "node:test";

import { calendarMonthRange } from "../server/lib/reportingPeriod.js";

test("financial trend month includes the complete calendar month", () => {
  assert.deepEqual(calendarMonthRange(2026, 7), {
    from: "2026-08-01",
    to: "2026-08-31",
    label: "Aug",
  });
});

test("financial trend month handles leap years and year boundaries", () => {
  assert.equal(calendarMonthRange(2024, 1).to, "2024-02-29");
  assert.deepEqual(calendarMonthRange(2026, -1), {
    from: "2025-12-01",
    to: "2025-12-31",
    label: "Dec",
  });
});
