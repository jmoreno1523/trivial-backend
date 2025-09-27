// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  online:   { type: Boolean, default: false },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    wins:        { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);

