import express from "express";
import mongoose from "mongoose";
import Client from "../models/Client.js";
import { requireUser } from "../middleware/auth.js";
import { clientHistory } from "../lib/clientIdentity.js";
import { toPlain } from "../lib/agencyData.js";

const router = express.Router();

router.get("/:id/history", requireUser, async (req, res) => {
  const clauses = [{ id: req.params.id }];
  if (mongoose.isValidObjectId(req.params.id)) clauses.push({ _id: req.params.id });
  const client = await Client.findOne({ $or: clauses });
  if (!client) return res.status(404).json({ error: "Client not found." });
  const history = await clientHistory(client._id, req.user);
  return res.json({
    client: toPlain(client),
    tickets: history.tickets.map(toPlain),
    visas: history.visas.map(toPlain),
    cargo: history.cargo.map(toPlain),
  });
});

export default router;
