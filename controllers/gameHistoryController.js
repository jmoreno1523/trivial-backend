import GameHistory from "../models/GameHistory.js";
import Game from "../models/Game.js";

// ⚡ Guardar historial de una partida terminada
export const saveGameHistory = async (gameId) => {
  try {
    const game = await Game.findById(gameId).lean();
    if (!game) return null;

    const history = new GameHistory({
      gameId: game._id.toString(),
      winner: game.winnerId ? game.winnerId.toString() : "Nadie",
      players: game.players.map((p) => ({
        username: p.name,
        status: p.status,
      })),
      category: game.category || "General",   // 👈 guardamos la categoría
    });

    await history.save();
    console.log("✅ Historial guardado con categoría:", history.category);

    return history;
  } catch (error) {
    console.error("❌ Error guardando historial:", error);
    return null;
  }
};
