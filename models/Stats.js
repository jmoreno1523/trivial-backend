
import mongoose from "mongoose";

const statsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    gamesPlayed: { type: Number, default: 0 },
    lastWinner: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Stats", statsSchema);
