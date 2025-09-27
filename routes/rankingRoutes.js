import express from "express";
import GameHistory from "../models/GameHistory.js";

const router = express.Router();

// 📊 GET /api/ranking
router.get("/", async (req, res) => {
  try {
    const ranking = await GameHistory.aggregate([
      { $match: { winner: { $ne: null, $ne: "Nadie" } } }, // solo partidas con ganador válido
      { $group: { _id: "$winner", victories: { $sum: 1 } } },
      { $sort: { victories: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",           // colección de usuarios
          localField: "_id",       // _id aquí es el winner
          foreignField: "_id",     // lo relacionamos con User._id
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          username: { $ifNull: ["$user.username", "$_id"] }, // si no encuentra user, muestra el id
          victories: 1
        }
      }
    ]);

    res.json(ranking);
  } catch (err) {
    console.error("❌ Error obteniendo ranking:", err);
    res.status(500).json({ error: "Error obteniendo ranking" });
  }
});

export default router;



