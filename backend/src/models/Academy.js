import mongoose from "mongoose";
import { SPORTS } from "../constants.js";

// One sports academy. Every user, player, session and match belongs to exactly one (AGENTS.md §3).
const academySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Lower-case copy of the name, so "Dumka Sports Academy" and "dumka sports academy" cannot both exist.
    nameKey: { type: String, required: true, unique: true },
    town: { type: String, trim: true },
    sports: { type: [{ type: String, enum: SPORTS }], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Academy ?? mongoose.model("Academy", academySchema);
