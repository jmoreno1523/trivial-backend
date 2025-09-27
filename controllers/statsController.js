import User from "../models/User.js";
import Game from "../models/Game.js";
import GameHistory from "../models/GameHistory.js";

// 📊 Endpoint para Dashboard (solo totales rápidos)
export const getDashboard = async (req, res) => {
  try {
    const totalGames = await GameHistory.countDocuments(); // usamos historial
    const totalUsers = await User.countDocuments();
    const totalWinners = await GameHistory.countDocuments({
      winner: { $ne: null, $ne: "Nadie" }
    });

    console.log("📊 Dashboard endpoint funcionando ✅");

    res.json({ totalGames, totalUsers, totalWinners });
  } catch (error) {
    console.error("❌ Error en getDashboard:", error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// 📊 Función reutilizable (Dashboard + Ranking)
export async function getStatsData() {
  try {
    const totalGames = await GameHistory.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalWinners = await GameHistory.countDocuments({
      winner: { $ne: null, $ne: "Nadie" }
    });

    // 🏆 Ranking desde GameHistory
    const rankingAgg = await GameHistory.aggregate([
      { $match: { winner: { $ne: null, $ne: "Nadie" } } },
      { $group: { _id: "$winner", victories: { $sum: 1 } } },
      { $sort: { victories: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",          // colección de usuarios
          localField: "_id",      // _id = winner
          foreignField: "_id",    // relaciona con User._id
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          username: { $ifNull: ["$user.username", "$_id"] },
          victories: 1
        }
      }
    ]);

    return { totalGames, totalUsers, totalWinners, ranking: rankingAgg };
  } catch (err) {
    console.error("❌ Error en getStatsData:", err);
    return { totalGames: 0, totalUsers: 0, totalWinners: 0, ranking: [] };
  }
}

// 🏆 Endpoint para Ranking
export const getRanking = async (req, res) => {
  try {
    const { ranking } = await getStatsData();

    console.log("🏆 Ranking generado ✅");

    res.json(ranking);
  } catch (error) {
    console.error("❌ Error en getRanking:", error);
    res.status(500).json({ message: "Error al obtener ranking" });
  }
};

// 🎮 Endpoint para Partidas Activas
export const getActiveGames = async (req, res) => {
  try {
    const activeGames = await Game.find({ status: { $in: ["waiting", "in_progress"] } })
      .select("roomCode status players createdAt category")
      .populate("players.userId", "username");

    const mapped = activeGames.map((g) => ({
      id: g._id,
      roomCode: g.roomCode || String(g._id).slice(-6),
      status: g.status,
      category: g.category ?? "General", // 👈 añadimos categoría
      createdAt: g.createdAt,
      players: (g.players || []).map((p) => ({
        userId: p.userId?._id ?? p.userId,
        username: p.userId?.username ?? p.name ?? "Anónimo",
        status: p.status ?? "unknown",
        score: p.score ?? 0,
        ready: !!p.ready,
      })),
    }));

    res.json(mapped);
  } catch (error) {
    console.error("❌ Error en getActiveGames:", error);
    res.status(500).json({ message: "Error al obtener partidas activas" });
  }
};

// 📜 Endpoint para resumen de partidas
export const getQuestionsResults = async (req, res) => {
  try {
    const histories = await GameHistory.find()
      .select("roomCode winner createdAt rounds category")
      .lean();

    const summary = histories.map((h) => ({
      _id: h._id,
      roomCode: h.roomCode || String(h._id).slice(-6),
      winner: h.winner ?? "Nadie",
      category: h.category ?? "General", // 👈 añadimos categoría
      createdAt: h.createdAt,
      roundsCount: Array.isArray(h.rounds) ? h.rounds.length : 0,
    }));

    res.json(summary);
  } catch (error) {
    console.error("❌ Error en getQuestionsResults:", error);
    res.status(500).json({ message: "Error al obtener preguntas y resultados" });
  }
};

// 📜 Endpoint para detalle de partida
export const getQuestionsResultsByGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!gameId) return res.status(400).json({ message: "gameId requerido" });

    const history = await GameHistory.findById(gameId).lean();
    if (!history) return res.status(404).json({ message: "Historial no encontrado" });

    // 👇 añadimos categoría en el detalle
    res.json({
      ...history,
      category: history.category ?? "General"
    });
  } catch (error) {
    console.error("❌ Error en getQuestionsResultsByGame:", error);
    res.status(500).json({ message: "Error al obtener detalle de la partida" });
  }
};

// 📊 Endpoint para estadísticas por categoría
export const getCategoriesStats = async (req, res) => {
  try {
    const categoriesAgg = await GameHistory.aggregate([
      { $match: { category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$category",
          totalGames: { $sum: 1 },
          totalWinners: {
            $sum: {
              $cond: [{ $and: [{ $ne: ["$winner", null] }, { $ne: ["$winner", "Nadie"] }] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalGames: -1 } }
    ]);

    res.json(
      categoriesAgg.map((c) => ({
        category: c._id || "General",
        totalGames: c.totalGames,
        totalWinners: c.totalWinners,
      }))
    );
  } catch (error) {
    console.error("❌ Error en getCategoriesStats:", error);
    res.status(500).json({ message: "Error al obtener estadísticas por categoría" });
  }
};
