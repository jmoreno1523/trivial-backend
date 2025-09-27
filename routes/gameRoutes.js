// routes/gameRoutes.js
import express from "express";
import {
  getGames,
  createGame,
  endGame,
  clearGames
} from "../controllers/gameController.js";

export default function gameRoutes(io) {
  const router = express.Router();

  // 📌 Obtener todas las salas
  router.get("/", getGames);

  // 📌 Crear sala manual
  router.post("/", createGame(io));

  // 📌 Finalizar partida y guardar historial
  router.post("/end", endGame(io));

  // 📌 Limpiar TODAS las salas (solo pruebas)
  router.delete("/clear", clearGames(io));

  return router;
}
