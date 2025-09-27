import express from "express";
import { getUsers } from "../controllers/userController.js";

const router = express.Router();

// Ruta: GET /api/users
router.get("/", getUsers);

export default router;

