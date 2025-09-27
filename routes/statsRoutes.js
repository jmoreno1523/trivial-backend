// routes/statsRoutes.js
import express from "express";
import {
  getDashboard,
  getRanking,
  getActiveGames,
  getQuestionsResults,
  getQuestionsResultsByGame,
  getCategoriesStats   // 👈 nuevo import
} from "../controllers/statsController.js";

const router = express.Router();

// 📊 GET /api/stats (estadísticas globales)
router.get("/", getDashboard);

// 🏆 GET /api/stats/ranking (ranking de ganadores)
router.get("/ranking", getRanking);

// 🎮 GET /api/stats/active (partidas activas con jugadores conectados)
router.get("/active", getActiveGames);

// 📂 GET /api/stats/categories (estadísticas por categoría)
router.get("/categories", getCategoriesStats);  // 👈 nueva ruta

// 📜 GET /api/stats/questions (resumen de preguntas y resultados)
router.get("/questions", getQuestionsResults);

// 📜 GET /api/stats/questions/:gameId (detalle de preguntas/respuestas por partida)
router.get("/questions/:gameId", getQuestionsResultsByGame);

export default router;
