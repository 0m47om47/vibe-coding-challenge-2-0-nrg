import mongoose from "mongoose";
import { ROLES } from "../constants.js";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    // Only for role "player"
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User ?? mongoose.model("User", userSchema);
