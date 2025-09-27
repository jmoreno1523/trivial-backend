// models/GameHistory.js
import mongoose from "mongoose";

const gameHistorySchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true },
    winner: { type: String, required: true },
    players: [
      {
        username: String,
        status: { type: String, enum: ["alive", "eliminated"] }
      }
    ],
    category: { type: String, default: "General" } // 👈 nuevo campo, no rompe lo anterior
  },
  { timestamps: true }
);

export default mongoose.model("GameHistory", gameHistorySchema);

;
