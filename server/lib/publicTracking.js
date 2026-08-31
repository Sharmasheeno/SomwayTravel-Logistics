import { cargoStatusLabel, normalizeCargoStatus, publicCargoTimeline } from "./cargoWorkflow.js";

export const publicCargoPayload = (item) => ({
  kind: "cargo",
  reference: item.tracking,
  origin: item.origin,
  destination: item.destination,
  status: cargoStatusLabel(item.status),
  statusKey: normalizeCargoStatus(item.status),
  date: item.receivedAt?.slice?.(0, 10) || item.dateIn,
  lastUpdated: item.updatedAt || "",
  timeline: publicCargoTimeline(item),
});

export const publicVisaPayload = (item) => ({
  kind: "visa",
  reference: item.ref,
  destination: item.destination,
  visaType: item.visaType,
  status: item.status,
  date: item.appDate,
  office: item.office,
});
