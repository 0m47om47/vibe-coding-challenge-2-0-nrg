import mongoose from "mongoose";
import { SPORTS } from "../constants.js";

const scoreSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    stats: { type: mongoose.Schema.Types.Mixed, default: {} }, // { statKey: whole number }, keys from SPORT_STATS
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    sport: { type: String, enum: SPORTS, required: true },
    opponent: { type: String, required: true, trim: true },
    scores: { type: [scoreSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Match ?? mongoose.model("Match", matchSchema);
