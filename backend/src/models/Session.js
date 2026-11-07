import mongoose from "mongoose";
import { SPORTS, MARKS, SESSION_STATUSES } from "../constants.js";

const attendanceSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    mark: { type: String, enum: MARKS, default: null }, // null = not marked yet
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    sport: { type: String, enum: SPORTS, required: true },
    status: { type: String, enum: SESSION_STATUSES, default: "open" },
    attendance: { type: [attendanceSchema], default: [] },
  },
  { timestamps: true }
);

// One session per sport per date, within an academy
sessionSchema.index({ academyId: 1, sport: 1, date: 1 }, { unique: true });

export default mongoose.models.Session ?? mongoose.model("Session", sessionSchema);
