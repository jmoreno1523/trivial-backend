// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// 📌 Registrar usuario
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, msg: "Todos los campos son obligatorios" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, msg: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    // -> Crear objeto seguro para devolver (sin password)
    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email
    };

    return res.status(201).json({ success: true, msg: "Usuario registrado correctamente", user: safeUser });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 📌 Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Email y password son obligatorios" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, msg: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, msg: "Credenciales inválidas" });
    }

    // Marcar online (opcional)
    user.online = true;
    await user.save();

    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email
    };

    return res.json({ success: true, msg: "Login exitoso", user: safeUser });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
