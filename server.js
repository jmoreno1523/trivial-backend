// ================== IMPORTS ==================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./db/mongo.js";

// Rutas (IMPORTS estáticos que NO requieren io)
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import rankingRoutes from "./routes/rankingRoutes.js"; // ✅ Ranking

// gameRoutes lo importaremos como fábrica MÁS ABAJO (para pasar `io`)
import gameRoutesFactory from "./routes/gameRoutes.js";

// Modelos y helpers
import Game from "./models/Game.js";
import Question from "./models/Question.js";
import GameHistory from "./models/GameHistory.js"; // ✅ nuevo
import { getStatsData } from "./controllers/statsController.js";

// ================== CONFIG ==================
dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// 👉 Middleware global: añade io a req en todas las rutas REST
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rutas REST
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/ranking", rankingRoutes);

// helper central que emite las stats a todos los dashboards
async function broadcastStats(ioInstance) {
  try {
    const stats = await getStatsData();
    ioInstance.emit("statsUpdated", stats);
  } catch (err) {
    console.error("❌ Error emitiendo stats:", err);
  }
}

// Montamos las rutas de "games" ahora que tenemos `io`
app.use("/api/games", gameRoutesFactory(io));

// ================== VARIABLES EN MEMORIA ==================
const activeGames = {};

// ================== SOCKET.IO: eventos ==================
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  // ---------- Crear sala ----------
  socket.on("createRoom", async ({ username, userId, maxPlayers } = {}) => {
    try {
      const roomMax = Number(maxPlayers) || 5;
      const newGame = new Game({
        ownerId: userId || socket.id,
        maxPlayers: roomMax,
        players: [
          {
            userId,
            name: username || "Guest",
            socketId: socket.id,
            status: "alive",
          },
        ],
        status: "waiting",
      });

      await newGame.save();
      socket.join(newGame._id.toString());

      socket.emit("roomCreated", { gameId: newGame._id, game: newGame });
      socket.emit("roomJoined", { gameId: newGame._id, game: newGame });

      io.emit("roomsUpdated");
      await broadcastStats(io);

      console.log("🎮 Nueva sala creada:", newGame._id, "por", username);
    } catch (err) {
      console.error("❌ Error creando sala:", err);
    }
  });

  // ---------- Unirse a sala ----------
  socket.on("joinRoom", async ({ gameId, username, userId } = {}) => {
    try {
      let game = await Game.findById(gameId);
      if (!game) return;

      socket.join(gameId.toString());

      let player = game.players.find(
        (p) =>
          (userId && p.userId?.toString() === userId) || p.name === username
      );

      if (!player) {
        await Game.findByIdAndUpdate(gameId, {
          $push: {
            players: {
              userId,
              name: username,
              socketId: socket.id,
              status: "alive",
            },
          },
        });
      } else {
        await Game.updateOne(
          { _id: gameId, "players.userId": userId },
          {
            $set: {
              "players.$.socketId": socket.id,
              "players.$.status": "alive",
            },
          }
        );
      }

      console.log(`👤 ${username} entró en la sala ${gameId}`);
      game = await Game.findById(gameId);

      io.to(gameId.toString()).emit("updatePlayers", game.players);
      socket.emit("roomJoined", { gameId, game });

      io.emit("roomsUpdated");
      await broadcastStats(io);

      if (game.players.length >= 2 && game.status === "waiting") {
        if (!activeGames[gameId]) {
          activeGames[gameId] = {
            answers: {},
            scores: {},
            timer: null,
            lobbyTimer: null,
            countdown: 0,
          };
        }

        if (!activeGames[gameId].lobbyTimer) {
          startLobbyCountdown(io, gameId, game);
        }
      }
    } catch (err) {
      console.error("❌ Error al unirse a sala:", err);
    }
  });

  // ---------- Responder ----------
  socket.on("answer", async ({ gameId, questionIndex, answer, userId } = {}) => {
    try {
      const game = await Game.findById(gameId);
      if (!game) return;

      const currentIdx = game.currentQuestion || 0;
      if (questionIndex !== currentIdx) return;

      const uid = userId?.toString() || socket.id;
      const player = game.players.find(
        (p) => p.userId?.toString() === uid || p.socketId === socket.id
      );

      if (!player || player.status !== "alive") {
        io.to(socket.id).emit("answerResult", {
          correct: false,
          message: "⛔ Estás eliminado, no puedes responder.",
        });
        return;
      }

      const currentQ = game.questions[currentIdx];
      let correct = false;
      if (!isNaN(answer) && answer >= 0) {
        correct = currentQ.correctIndex === Number(answer);
      } else if (typeof answer === "string") {
        const correctOption = currentQ.options[currentQ.correctIndex];
        correct =
          correctOption.trim().toLowerCase() === answer.trim().toLowerCase();
      }

      const state = activeGames[gameId];
      if (!state) return;

      state.answers[uid] = correct;

      if (correct) {
        if (!state.scores[uid]) state.scores[uid] = 0;
        state.scores[uid] += 1;
        io.to(socket.id).emit("answerResult", {
          correct: true,
          message: "✅ Correcto, sigues en juego",
        });
      } else {
        io.to(socket.id).emit("answerResult", {
          correct: false,
          message: "❌ Incorrecto, podrías ser eliminado al final de la ronda",
        });
      }

      const updatedGame = await Game.findById(gameId);
      if (!updatedGame) return;
      const alive = updatedGame.players.filter((p) => p.status === "alive");

      if (Object.keys(state.answers).length >= alive.length) {
        await endRound(io, gameId, updatedGame);
      }
    } catch (err) {
      console.error("❌ Error procesando respuesta:", err);
    }
  });

  // ---------- Desconexión ----------
  socket.on("disconnect", async () => {
    console.log("🔴 Cliente desconectado:", socket.id);

    const game = await Game.findOne({ "players.socketId": socket.id });
    if (!game) return;

    await Game.updateOne(
      { _id: game._id, "players.socketId": socket.id },
      { $set: { "players.$.status": "eliminated" } }
    );

    const updatedGame = await Game.findById(game._id);
    if (!updatedGame) return;

    const alive = updatedGame.players.filter((p) => p.status === "alive");

    if (alive.length === 0) {
      await Game.findByIdAndDelete(game._id);
      if (activeGames[game._id.toString()]) {
        if (activeGames[game._id.toString()].lobbyTimer) {
          clearInterval(activeGames[game._id.toString()].lobbyTimer);
        }
        if (activeGames[game._id.toString()].timer) {
          clearTimeout(activeGames[game._id.toString()].timer);
        }
        delete activeGames[game._id.toString()];
      }
      io.emit("roomsUpdated");
      await broadcastStats(io);
      console.log(`🗑️ Sala ${game._id} eliminada (vacía).`);
    } else {
      io.to(game._id.toString()).emit("updatePlayers", updatedGame.players);
      await broadcastStats(io);
    }
  });
});

// ================== FUNCIONES AUXILIARES ==================
function startLobbyCountdown(io, gameId, game) {
  let countdown = 15;
  if (!activeGames[gameId]) return;
  activeGames[gameId].countdown = countdown;

  activeGames[gameId].lobbyTimer = setInterval(async () => {
    const g = await Game.findById(gameId);
    if (!g || g.players.filter((p) => p.status === "alive").length < 2) {
      if (activeGames[gameId]?.lobbyTimer) {
        clearInterval(activeGames[gameId].lobbyTimer);
        activeGames[gameId].lobbyTimer = null;
      }
      io.to(gameId).emit("lobbyCountdown", null);
      console.log(`⏹️ Cuenta atrás cancelada en sala ${gameId}`);
      return;
    }

    io.to(gameId).emit("lobbyCountdown", countdown);
    countdown--;

    if (countdown < 0) {
      if (activeGames[gameId]?.lobbyTimer) {
        clearInterval(activeGames[gameId].lobbyTimer);
        activeGames[gameId].lobbyTimer = null;
      }
      startGame(io, gameId);
    }
  }, 1000);
}

async function startGame(io, gameId) {
  let game = await Game.findById(gameId);
  if (!game) return;
  if (game.status !== "waiting") return;

  let questions = await Question.find();
  questions = questions.map((q, idx) => ({
    index: idx,
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
  }));

  game = await Game.findByIdAndUpdate(
    gameId,
    { $set: { status: "in_progress", questions, currentQuestion: 0 } },
    { new: true }
  );

  activeGames[gameId] = { answers: {}, scores: {}, timer: null };
  sendQuestion(io, gameId, game);

  io.emit("roomsUpdated");
  await broadcastStats(io);

  console.log(`🚀 Juego iniciado en sala ${gameId}`);
}

async function sendQuestion(io, gameId, game) {
  if (!game) {
    game = await Game.findById(gameId);
    if (!game) return;
  }

  const idx = game.currentQuestion;
  const q = game.questions[idx];
  if (!q) return;

  if (!activeGames[gameId]) return;
  activeGames[gameId].answers = {};

  io.to(gameId.toString()).emit("newQuestion", {
    index: idx,
    text: q.text,
    options: q.options,
    timeLimit: 10,
  });

  activeGames[gameId].timer = setTimeout(async () => {
    const updated = await Game.findById(gameId);
    await endRound(io, gameId, updated);
  }, 10000);
}

// ================== 🔥 saveGameHistory ==================
async function saveGameHistory(game, result = {}) {
  try {
    const gameId = game?._id?.toString() || new Date().getTime().toString();

    let winnerName = "Nadie";
    if (result?.winner) {
      winnerName =
        result.winner.name || result.winner.username || "Desconocido";
    }

    const players = (game?.players || []).map((p) => ({
      username: p.name || p.username || "Invitado",
      status: p.status || "eliminated",
    }));

    await GameHistory.create({
      gameId,
      winner: winnerName,
      players,
      category: game.category || "General", // ✅ añadimos categoría
    });

    console.log(
      "📦 Partida guardada en GameHistory:",
      gameId,
      "| Categoría:",
      game.category || "General"
    );
  } catch (err) {
    console.error("❌ Error guardando historial:", err);
  }
}

async function endRound(io, gameId, game) {
  const state = activeGames[gameId];
  if (!state) return;

  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }

  if (!game) {
    game = await Game.findById(gameId);
    if (!game) return;
  }

  if (!game.players || game.players.length === 0) return;

  const eliminatedThisRound = [];
  const correctThisRound = [];

  for (const p of game.players) {
    if (p.status !== "alive") continue;

    const uid = p.userId?.toString() || p.socketId;
    const answered = Object.prototype.hasOwnProperty.call(state.answers, uid);

    if (!answered || !state.answers[uid]) {
      await Game.updateOne(
        { _id: gameId, "players.userId": p.userId },
        { $set: { "players.$.status": "eliminated" } }
      );
      eliminatedThisRound.push(p);
    } else {
      correctThisRound.push(p);
    }
  }

  game = await Game.findById(gameId);
  if (!game) return;

  const alive = game.players.filter((p) => p.status === "alive");
  const eliminated = game.players.filter((p) => p.status === "eliminated");

  io.to(gameId.toString()).emit("roundResult", {
    correctPlayers: correctThisRound,
    eliminatedPlayers: eliminatedThisRound,
  });

  io.to(gameId.toString()).emit("updatePlayers", game.players);

  // ================== 🔥 FINAL ==================
  if (alive.length === 1) {
    const result = {
      winner: alive[0],
      eliminated,
      players: game.players,
    };
    io.to(gameId.toString()).emit("gameOver", result);

    await saveGameHistory(game, result);
    await Game.findByIdAndDelete(gameId);

    if (activeGames[gameId]?.lobbyTimer)
      clearInterval(activeGames[gameId].lobbyTimer);
    delete activeGames[gameId];

    io.emit("roomsUpdated");
    await broadcastStats(io);
    console.log(`🏆 Ganador: ${alive[0].name}, sala ${gameId} eliminada`);
    return;
  }

  if (alive.length === 0) {
    const result = {
      winner: null,
      eliminated,
      players: game.players,
      message: "Todos eliminados",
    };
    io.to(gameId.toString()).emit("gameOver", result);

    await saveGameHistory(game, result);
    await Game.findByIdAndDelete(gameId);

    if (activeGames[gameId]?.lobbyTimer)
      clearInterval(activeGames[gameId].lobbyTimer);
    delete activeGames[gameId];

    io.emit("roomsUpdated");
    await broadcastStats(io);
    console.log(`❌ Todos eliminados, sala ${gameId} eliminada`);
    return;
  }

  if (game.currentQuestion >= game.questions.length - 1) {
    const result = {
      winner: null,
      eliminated,
      players: game.players,
      message: "🤝 Empate (varios sobrevivientes).",
    };
    io.to(gameId.toString()).emit("gameOver", result);

    await saveGameHistory(game, result);
    await Game.findByIdAndDelete(gameId);

    if (activeGames[gameId]?.lobbyTimer)
      clearInterval(activeGames[gameId].lobbyTimer);
    delete activeGames[gameId];

    io.emit("roomsUpdated");
    await broadcastStats(io);
    console.log(`🤝 Empate, sala ${gameId} eliminada`);
    return;
  }

  // 🚀 Continuar al siguiente turno
  game.currentQuestion = (game.currentQuestion || 0) + 1;
  game = await Game.findByIdAndUpdate(
    gameId,
    { $set: { currentQuestion: game.currentQuestion } },
    { new: true }
  );
  if (activeGames[gameId]) activeGames[gameId].answers = {};
  sendQuestion(io, gameId, game);
}

// ================== INICIO SERVIDOR ==================
const PORT = process.env.PORT || 4000;

async function init() {
  try {
    await connectDB();
    console.log("✅ Conectado a MongoDB");

    // Para desarrollo: limpiar salas al iniciar
    await Game.deleteMany({});
    console.log("🧹 Todas las salas eliminadas al iniciar");

    server.listen(PORT, () =>
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
    );
  } catch (err) {
    console.error("❌ Error iniciando servidor:", err.message);
    process.exit(1);
  }
}

init();
