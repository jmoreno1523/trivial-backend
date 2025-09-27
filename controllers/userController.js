import User from "../models/User.js";
import { getStatsData } from "./statsController.js";

// Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("❌ getUsers:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// Crear un nuevo usuario
export const createUser = (io) => async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    // Notificar al dashboard que se actualicen las estadísticas
    io.emit("statsUpdated", await getStatsData());

    res.json(user);
  } catch (err) {
    console.error("❌ createUser:", err);
    res.status(500).json({ error: err.message });
  }
};

