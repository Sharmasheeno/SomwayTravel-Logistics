export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const responsePreview = (text) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

export const parseApiResponse = async (
  response,
  { method = "GET", path = "API request" } = {},
) => {
  const contentType =
    response.headers.get("content-type") || "unknown content-type";
  const body = await response.text();
  const context = `${String(method).toUpperCase()} ${path} returned ${response.status} ${contentType}`;

  if (!contentType.toLowerCase().includes("json")) {
    const preview = responsePreview(body);
    throw new ApiError(
      preview ? `${context}: ${preview}` : context,
      response.status,
      { contentType, preview },
    );
  }

  let payload = {};
  if (body) {
    try {
      payload = JSON.parse(body);
    } catch {
      throw new ApiError(`${context}: invalid JSON response`, response.status, {
        contentType,
        preview: responsePreview(body),
      });
    }
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      typeof payload.error === "string"
        ? payload.error
        : context;
    throw new ApiError(message, response.status, { contentType });
  }

  return payload;
};
