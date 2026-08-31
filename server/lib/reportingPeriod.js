const pad = (value) => String(value).padStart(2, "0");

export const calendarMonthRange = (year, monthIndex) => {
  const month = new Date(Date.UTC(year, monthIndex, 1));
  const normalizedYear = month.getUTCFullYear();
  const normalizedMonth = month.getUTCMonth();
  const lastDay = new Date(Date.UTC(normalizedYear, normalizedMonth + 1, 0)).getUTCDate();
  const prefix = `${normalizedYear}-${pad(normalizedMonth + 1)}`;

  return {
    from: `${prefix}-01`,
    to: `${prefix}-${pad(lastDay)}`,
    label: month.toLocaleString("en", { month: "short", timeZone: "UTC" }),
  };
};
