const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const countryForContext = (context = {}) => {
  const country = String(context.country || "").trim().toLowerCase();
  const branch = String(context.branchCountry || context.branchName || context.office || "").trim().toLowerCase();
  if (country === "so" || country.includes("somalia") || branch.includes("somalia") || branch.includes("mogadishu") || branch.includes("hargeisa")) return "SO";
  if (country === "ke" || country.includes("kenya") || branch.includes("kenya") || branch.includes("nairobi")) return "KE";
  return "";
};

export const normalizePhoneDetails = (value, context = {}) => {
  const raw = String(value || "").trim();
  if (!raw) return { input: raw, normalizedPhone: "", isValid: false, country: "", reason: "missing" };

  let digits = digitsOnly(raw);
  if (raw.trim().startsWith("00")) digits = digits.replace(/^00/, "");
  if (raw.trim().startsWith("+")) {
    if (digits.startsWith("252") && digits.length >= 11 && digits.length <= 12) return { input: raw, normalizedPhone: `+${digits}`, isValid: true, country: "SO", reason: "international" };
    if (digits.startsWith("254") && digits.length === 12) return { input: raw, normalizedPhone: `+${digits}`, isValid: true, country: "KE", reason: "international" };
    return { input: raw, normalizedPhone: "", isValid: false, country: "", reason: "unsupported international phone" };
  }
  if (digits.startsWith("252") && digits.length >= 11 && digits.length <= 12) return { input: raw, normalizedPhone: `+${digits}`, isValid: true, country: "SO", reason: "international" };
  if (digits.startsWith("254") && digits.length === 12) return { input: raw, normalizedPhone: `+${digits}`, isValid: true, country: "KE", reason: "international" };

  const country = countryForContext(context);
  if (country === "SO") {
    const local = digits.replace(/^0/, "");
    if (/^6\d{8}$/.test(local)) return { input: raw, normalizedPhone: `+252${local}`, isValid: true, country: "SO", reason: "somalia local" };
  }
  if (country === "KE") {
    const local = digits.replace(/^0/, "");
    if (/^7\d{8}$/.test(local) || /^1\d{8}$/.test(local)) return { input: raw, normalizedPhone: `+254${local}`, isValid: true, country: "KE", reason: "kenya local" };
  }

  return { input: raw, normalizedPhone: "", isValid: false, country, reason: "unresolved local phone" };
};

export const normalizePhone = (value, context = {}) => normalizePhoneDetails(value, context).normalizedPhone;
