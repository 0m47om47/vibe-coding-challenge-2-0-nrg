import mongoose from "mongoose";
import { SPORTS } from "../constants.js";

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 3, max: 100 },
    sport: { type: String, enum: SPORTS, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Player ?? mongoose.model("Player", playerSchema);
