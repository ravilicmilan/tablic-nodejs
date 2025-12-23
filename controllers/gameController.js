import { findGameById } from "../models/game.js";
import { getObjFromDB } from "../utils/game.js";

export function getGameById(req, res) {
  console.log("CURENT USER IN GAME CONTROLLER:", req.user);
  const gameId = req.params.gameId;
  findGameById(gameId, (game) => {
    if (!game) {
      return res.redirect("/");
    }

    if (
      game.player1 !== req.user.username &&
      game.player2 !== req.user.username
    ) {
      console.log(
        "USER IS NOT PART OF THIS GAME!!",
        game.player1,
        game.player2,
        req.user.username,
      );
      return res.redirect("/");
    }

    const gameData = getObjFromDB(game);
    res.render("game", {
      gameId: game.id,
      gameData,
      currentUser: req.user.username,
    });
  });
}
