import express from "express";
import { getQuestions, createQuestion, getRandomQuestion } from "../controllers/questionController.js";

const router = express.Router();

// ✅ Listar todas las preguntas
router.get("/", getQuestions);

// ✅ Crear una nueva pregunta
router.post("/", createQuestion);

// ✅ Obtener y emitir una pregunta aleatoria (global)
router.get("/random", getRandomQuestion);

// ✅ Obtener y emitir una pregunta aleatoria para una sala específica
router.get("/random/:gameId", getRandomQuestion);

export default router;
