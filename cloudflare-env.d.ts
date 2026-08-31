declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}

type Fetcher = {
  fetch: typeof fetch;
};

type D1Database = unknown;
