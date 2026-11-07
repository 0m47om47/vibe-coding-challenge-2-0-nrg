import mongoose from "mongoose";
import { SPORTS } from "../constants.js";

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 3, max: 100 },
    sport: { type: String, enum: SPORTS, required: true },
    // Optional profile (AGENTS.md §3). Missing means not set.
    photoUrl: { type: String },
    heightCm: { type: Number, min: 50, max: 250 },
    weightKg: { type: Number, min: 10, max: 250 },
    nationality: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Player ?? mongoose.model("Player", playerSchema);
