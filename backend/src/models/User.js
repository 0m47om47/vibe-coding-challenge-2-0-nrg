import mongoose from "mongoose";
import { ROLES, USER_STATUSES } from "../constants.js";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    // Scouts sign in with their email. Left out for players and the coach.
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    // "pending" scouts cannot sign in until the coach approves them.
    status: { type: String, enum: USER_STATUSES, default: "active" },
    // Only for role "player"
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User ?? mongoose.model("User", userSchema);
