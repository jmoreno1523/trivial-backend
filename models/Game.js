import mongoose from "mongoose";

// 📌 Sub-esquema para jugadores
const playerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    name: { type: String, required: true },
    status: { type: String, enum: ["alive", "eliminated"], default: "alive" },
    score: { type: Number, default: 0 },
    ready: { type: Boolean, default: false }, // 👈 Para marcar cuando el jugador está listo
  },
  { _id: false }
);

// 📌 Sub-esquema para preguntas
const questionSchema = new mongoose.Schema(
  {
    text: String,
    options: [String],
    correctIndex: Number,
    category: String,                // 👈 categoría de la pregunta
    correctPlayers: [String],        // 👈 nombres o IDs de jugadores que acertaron
  },
  { _id: false }
);

// 📌 Sub-esquema para registrar acciones en tiempo real
const actionSchema = new mongoose.Schema(
  {
    player: String, // nombre del jugador
    questionIndex: Number,
    answer: Number,
    correct: Boolean,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// 📌 Esquema principal de Game
const gameSchema = new mongoose.Schema(
  {
    players: [playerSchema],
    status: {
      type: String,
      enum: ["waiting", "in_progress", "finished"],
      default: "waiting",
    },
    maxPlayers: { type: Number, default: 2 }, // 👈 Máximo de jugadores
    currentQuestion: { type: Number, default: 0 }, // índice de ronda
    questions: [questionSchema], // Preguntas guardadas en el juego
    actions: [actionSchema], // Registro de todas las jugadas
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // 👈 unificar con backend
  },
  { timestamps: true }
);

export default mongoose.model("Game", gameSchema);
