import Question from "../models/Question.js";

// ✅ Obtener todas las preguntas
export const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    console.error("❌ Error obteniendo preguntas:", err);
    res.status(500).json({ error: "Error al obtener preguntas" });
  }
};

// ✅ Crear una nueva pregunta
export const createQuestion = async (req, res) => {
  try {
    if (!req.body.text || !req.body.options || req.body.correctIndex === undefined) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const question = new Question(req.body);
    await question.save();

    // ⚡ Notificar en tiempo real que hay una nueva pregunta
    if (req.io) {
      req.io.emit("questionCreated", question); // 🔔 evento global
    }

    res.json(question);
  } catch (err) {
    console.error("❌ Error creando pregunta:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Obtener una pregunta aleatoria (para LiveResults / juegos)
export const getRandomQuestion = async (req, res) => {
  try {
    const count = await Question.countDocuments();
    if (count === 0) {
      return res.status(404).json({ error: "No hay preguntas disponibles" });
    }

    const random = Math.floor(Math.random() * count);
    const question = await Question.findOne().skip(random);

    if (question) {
      if (req.io) {
        const { gameId } = req.params; // 👈 tomamos el gameId desde la URL
        if (gameId) {
          // 🎯 Emitir solo a la sala específica
          req.io.to(gameId).emit("newQuestion", {
            text: question.text,
            options: question.options,
            timeLimit: 10, // ⏱ segundos para responder
          });
        } else {
          // 🔔 fallback global si no hay gameId
          req.io.emit("newQuestion", {
            text: question.text,
            options: question.options,
            timeLimit: 10,
          });
        }
      }

      res.json(question);
    } else {
      res.status(404).json({ error: "No se pudo obtener la pregunta" });
    }
  } catch (err) {
    console.error("❌ Error obteniendo pregunta aleatoria:", err);
    res.status(500).json({ error: err.message });
  }
};

