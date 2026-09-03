import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, parseApiResponse } from "../app/lib/api-core.js";

test("API parsing reports non-JSON responses with request context", async () => {
  const response = new Response("<!DOCTYPE html><title>Not Found</title>", {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  await assert.rejects(
    () =>
      parseApiResponse(response, {
        method: "POST",
        path: "/api/payments",
      }),
    (error) =>
      error instanceof ApiError &&
      error.status === 404 &&
      /POST \/api\/payments returned 404 text\/html/i.test(error.message),
  );
});

test("API parsing returns JSON and preserves JSON API errors", async () => {
  const success = new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
  assert.deepEqual(
    await parseApiResponse(success, {
      method: "POST",
      path: "/api/payments",
    }),
    { ok: true },
  );

  const failure = new Response(
    JSON.stringify({ error: "Invalid payment method." }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    },
  );
  await assert.rejects(
    () =>
      parseApiResponse(failure, {
        method: "POST",
        path: "/api/payments",
      }),
    /Invalid payment method/,
  );
});
