import { db } from "../lib/db.js";
import {
  arrDiff,
  getObjFromDB,
  initalDeal,
  initializeDeck,
  checkForGameOver,
  scoreGame,
  shuffleDeck,
  dealAgain,
} from "../utils/game.js";

export function createNewGame(player1, player2) {
  const checkIfGameExistsSql = `SELECT * FROM games 
    WHERE (player1 = ? AND player2 = ? OR player1 = ? AND player2 = ?) 
    AND status = 'ongoing'`;
  return new Promise((resolve, reject) => {
    db.get(
      checkIfGameExistsSql,
      [player1, player2, player2, player1],
      (err, row) => {
        if (err) {
          console.error("Error checking existing game:", err);
          reject(err);
        } else if (row) {
          console.log(
            `Game already exists between ${player1} and ${player2} with ID ${row.id}`,
          );
          resolve(row.id);
        } else {
          // No existing game, create a new one
          const sql = `INSERT INTO games (player1, player2,  currentTurn, status) VALUES (?, ?, ?, ?)`;
          db.run(sql, [player1, player2, player1, "ongoing"], function (err) {
            if (err) {
              console.error("Error creating new game:", err);
              reject(err);
            } else {
              console.log(
                `New game created between ${player1} and ${player2} with ID ${this.lastID}`,
              );
              resolve(this.lastID);
            }
          });
        }
      },
    );
  });
}

export function findGameById(gameId, callback) {
  const sql = `SELECT * FROM games WHERE id = ?`;
  db.get(sql, [gameId], (err, row) => {
    if (err) {
      console.error("Error fetching game by ID:", err);
      callback(null);
    } else {
      callback(row);
    }
  });
}

export function updateGameState(gameId, gameState, callback) {
  const sql = `
    UPDATE games SET 
      deck = ?, currentTurn = ?, 
      player1Score = ?, player2Score = ?, 
      cardsOnTable = ?, lastTake = ?,
      player1Hand = ?, player2Hand = ?, 
      status = ? 
    WHERE id = ?
  `;
  db.run(
    sql,
    [
      JSON.stringify(gameState.deck),
      gameState.currentTurn,
      JSON.stringify(gameState.player1Score),
      JSON.stringify(gameState.player2Score),
      JSON.stringify(gameState.cardsOnTable),
      gameState.lastTake,
      JSON.stringify(gameState.player1Hand),
      JSON.stringify(gameState.player2Hand),
      gameState.status,
      gameId,
    ],
    function (err) {
      if (err) {
        console.error("Error updating game state:", err);
        callback(false);
      } else {
        console.log(`Game ID ${gameId} state updated successfully.`);
        callback(true);
      }
    },
  );
}

export function startGame(gameId, startingPlayer, callback) {
  const sql = `SELECT * FROM games WHERE id = ?`;
  db.get(sql, [gameId], (err, row) => {
    if (err) {
      console.error("Error fetching game for starting:", err);
      callback(false);
    } else if (!row) {
      console.error("Game not found for starting:", gameId);
      callback(false);
    } else {
      const deck = initializeDeck();
      const shuffledDeck = shuffleDeck(deck);
      const cards = initalDeal(shuffledDeck);
      const gameState = {
        deck: cards.remainingDeck,
        currentTurn: startingPlayer,
        player1Score: { points: 0, recke: 0, capturedCards: [], score: [] },
        player2Score: { points: 0, recke: 0, capturedCards: [], score: [] },
        cardsOnTable: cards.cardsOnTable,
        player1Hand: cards.player1Hand,
        player2Hand: cards.player2Hand,
        lastTake: "",
        player1: row.player1,
        player2: row.player2,
        status: "ongoing",
      };
      updateGameState(gameId, gameState, (success) => {
        if (!success) {
          // Game found, update its status to 'ongoing' and set the starting player
          callback(false);
        } else {
          callback(gameState);
        }
      });
    }
  });
}

export function updateGameStateAfterMove(
  gameId,
  currentUser,
  cardsSelected,
  cardPlayed,
  callback,
) {
  findGameById(gameId, (game) => {
    if (!game) {
      console.error("Error GAME DOES NOT EXISTS WITH THIS ID::", gameId, err);
      callback(false);
      return;
    }

    let currentTurn;

    const obj = getObjFromDB(game);
    const idx = currentUser === obj.player1 ? "1" : "2";
    const playerHandKey = `player${idx}Hand`;
    const playerScoreKey = `player${idx}Score`;

    if (currentUser === obj.player1) {
      currentTurn = obj.player2;
    } else {
      currentTurn = obj.player1;
    }

    obj[playerHandKey] = obj[playerHandKey].filter(
      (c) => c.id !== cardPlayed.id,
    );

    if (cardsSelected.length > 0) {
      const cardsOnTable = [...obj.cardsOnTable];
      const diff = arrDiff(cardsOnTable, cardsSelected);
      obj.cardsOnTable = [...diff];
      const newScore = [
        ...obj[playerScoreKey].capturedCards,
        ...cardsSelected,
        cardPlayed,
      ];
      obj[playerScoreKey].capturedCards = newScore;
      obj.lastTake = obj.currentTurn;
    } else {
      obj.cardsOnTable = [...obj.cardsOnTable, cardPlayed];
    }

    if (obj.cardsOnTable.length === 0) {
      //recka
      obj[playerScoreKey].recke = obj[playerScoreKey].recke + 1;
    }

    if (
      obj.player1Hand.length === 0 &&
      obj.player2Hand.length === 0 &&
      obj.deck.length > 0
    ) {
      // new deal
      const player1Hand = obj.deck.slice(0, 6);
      const player2Hand = obj.deck.slice(6, 12);
      const remainingDeck = obj.deck.slice(12);
      obj.deck = remainingDeck;
      obj.player1Hand = player1Hand;
      obj.player2Hand = player2Hand;
    }

    let objToSend = { ...obj };

    if (
      obj.deck.length === 0 &&
      obj.player1Hand.length === 0 &&
      obj.player2Hand.length === 0
    ) {
      // score game
      const result = scoreGame(obj);
      objToSend = { ...obj, ...result };
      console.log(
        "RESULT AFTER SCORING????",
        objToSend.player1Score.score,
        objToSend.player2Score.score,
      );
    }

    if (checkForGameOver(objToSend)) {
      console.log("GAME OVER!!!!");
      objToSend.status = "completed";
    }

    if (
      objToSend.status === "ongoing" &&
      objToSend.deck.length === 0 &&
      objToSend.player1Hand.length === 0 &&
      objToSend.player2Hand.length === 0
    ) {
      console.log(
        "NOT OVER DEAL AGAIN!!",
        objToSend.player1Score.score,
        objToSend.player2Score.score,
      );
      const gameObj = getObjFromDB(game);
      const data = dealAgain(gameObj);
      objToSend.deck = data.deck;
      objToSend.cardsOnTable = data.cardsOnTable;
      objToSend.player1Hand = data.player1Hand;
      objToSend.player2Hand = data.player2Hand;
      objToSend.player1Score.capturedCards = [];
      objToSend.player2Score.capturedCards = [];
    }

    objToSend.currentTurn = currentTurn;

    // console.log("NEW GAME STATE???", objToSend);

    updateGameState(gameId, objToSend, (success) => {
      if (!success) {
        console.log("ERROR UPDATING GAME STATE AFTER MOVE!!!");
        return callback(false);
      }

      callback(objToSend);
    });
  });
}

export function reinitializeGame(gameId, callback) {
  findGameById(gameId, (game) => {
    if (!game) {
      console.log("GAME DOES NOT EXISTS WITH ID:", gameId);
      return callback(false);
    }
    const gameObj = getObjFromDB(game);
    const gameState = dealAgain(gameObj);

    updateGameState(gameId, gameState, (success) => {
      if (!success) {
        console.log("UNABLE TO UPDATE GAME AFTER REINITIALIZATION::");
        return callback(false);
      }

      callback(gameState);
    });
  });
}
