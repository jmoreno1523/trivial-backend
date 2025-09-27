// controllers/gameController.js
import Game from "../models/Game.js";
import GameHistory from "../models/GameHistory.js";
import { getStatsData } from "./statsController.js";

// Obtener todas las salas
export const getGames = async (req, res) => {
  try {
    const games = await Game.find().populate("questions");
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear sala manual
export const createGame = (io) => async (req, res) => {
  try {
    const newGame = new Game(req.body);
    await newGame.save();

    io.emit("roomsUpdated"); // notificar a todos
    res.status(201).json(newGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Finalizar partida y guardar historial
export const endGame = (io) => async (req, res) => {
  try {
    const { gameId, winnerId } = req.body;

    // 🔹 Actualizar partida a "finished" y asignar ganador
    const game = await Game.findByIdAndUpdate(
      gameId,
      { status: "finished", winnerId },
      { new: true }
    ).populate("winnerId", "username email");

    if (!game) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }

    // 🔹 Guardar historial
    const gameHistory = new GameHistory({
      gameId: game._id.toString(),              // requerido
      winner: game.winnerId?.username || "N/A", // requerido
      players: game.players.map((p) => ({
        username: p.name || "Desconocido",
        status: p.status,
      })),
    });

    await gameHistory.save();

    // 🔹 Notificar a todos
    io.emit("gameOver", { gameId, winner: game.winnerId?.username });
    io.emit("roomsUpdated");
    io.emit("statsUpdated", await getStatsData());

    res.json({ game, gameHistory });
  } catch (err) {
    console.error("❌ endGame:", err);
    res.status(500).json({ error: err.message });
  }
};

// Limpiar TODAS las salas (solo pruebas)
export const clearGames = (io) => async (req, res) => {
  try {
    await Game.deleteMany();
    io.emit("roomsUpdated");
    res.json({ message: "Todas las salas eliminadas" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* -----------------------------------------
   📡 NUEVO: Emisión de eventos para LiveResults
   ----------------------------------------- */

// Lanzar una nueva pregunta
export const sendQuestion = (io, gameId, question) => {
  io.to(gameId).emit("newQuestion", {
    text: question.text,
    options: question.options,
    timeLimit: question.timeLimit || 10,
  });
};

// Actualizar lista de jugadores
export const updatePlayersStatus = (io, gameId, players) => {
  io.to(gameId).emit("updatePlayers", players);
};

// Resultado de una ronda
export const sendRoundResult = (io, gameId, result) => {
  io.to(gameId).emit("roundResult", result);
};

// Terminar partida (separado de endGame REST)
export const sendGameOver = (io, gameId, result) => {
  io.to(gameId).emit("gameOver", result);
};

