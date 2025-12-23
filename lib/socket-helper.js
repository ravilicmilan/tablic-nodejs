import {
  createNewGame,
  findGameById,
  reinitializeGame,
  startGame,
  updateGameStateAfterMove,
} from "../models/game.js";
import {
  getAllInvitationsForUser,
  sendGameInvite,
  updateInvitationStatusForUser,
} from "../models/invitations.js";
import { checkIsMoveLegal } from "../utils/game.js";
import { TOKEN_COOKIE, verifyToken } from "./auth.js";

const connectionUser = new Map();
const userCounts = new Map();
const rooms = new Map();
const messages = new Map();

export function setupSocket(wss, ws, req) {
  sendPayload(ws, "welcome", { message: "Welcome to WebSocket server" });

  const cookies = parseCookies(req && req.headers && req.headers.cookie);
  const token = cookies && cookies[TOKEN_COOKIE];
  const data = token ? verifyToken(token) : null;
  const username = data && data.username ? data.username : null;

  if (username) {
    console.log("User connected via WebSocket:", username);
    connectionUser.set(ws, username);
    userCounts.set(username, (userCounts.get(username) || 0) + 1);
    broadcastUserList(wss);
    getAllInvitationsForUser(username, (invitations) => {
      // console.log("INVITATIONS>?>>>>>", invitations);
      if (invitations && invitations.length > 0) {
        // console.log("ALL invitations for", username, invitations);
        sendPayload(ws, "all_invites", { list: invitations });
      }
    });
  }

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "game_invite") {
        // handle game invite
        const targetUser = data.with;
        // let found = false;
        const otherUserSocket = findOtherUserSocket(
          wss,
          ws,
          connectionUser,
          targetUser,
        );
        if (otherUserSocket) {
          sendGameInvite(otherUserSocket, connectionUser.get(ws), targetUser);
        } else {
          sendErrorMessage(ws, `User ${targetUser} not found or not online.`);
        }
      } else if (data.type === "accept_invite") {
        // handle invite acceptance
        const fromUser = data.from;
        console.log(
          `${connectionUser.get(ws)} accepted invite from ${fromUser}`,
        );
        updateInvitationStatusForUser(
          fromUser,
          connectionUser.get(ws),
          "accepted",
        );
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            const clientUser = connectionUser.get(client);
            if (clientUser === fromUser) {
              sendPayload(ws, "invite_accepted", {
                from: connectionUser.get(ws),
              });
            }
          }
        });
      } else if (data.type === "create_game") {
        const withUser = data.with;
        const currentUser = connectionUser.get(ws);
        console.log(
          `${connectionUser.get(ws)} wants to create game with ${withUser}`,
        );
        createNewGame(currentUser, withUser).then((gameId) => {
          sendPayload(ws, "game_created", { gameId, currentUser, withUser });
          rooms.set(gameId, [currentUser, withUser]);
          messages.set(gameId, []);
        });
      } else if (data.type === "join_game") {
        const gameId = data.gameId;
        const currentUser = connectionUser.get(ws);
        const players = rooms.get(gameId) || [];
        findGameById(gameId, (game) => {
          if (game) {
            if (game.player1 === currentUser || game.player2 === currentUser) {
              console.log(`${currentUser} is joining existing game ${gameId}`);
              if (!players.includes(currentUser)) {
                players.push(currentUser);
                rooms.set(gameId, players);
              }

              const messagesArr = messages.get(gameId);
              if (messagesArr && messagesArr.length > 0) {
                sendPayload(ws, "chat_history", { messages: messagesArr });
              }
            } else {
              console.log(`${currentUser} is NOT a player in game ${gameId}`);
              sendErrorMessage(ws, `You are not a player in game ${gameId}.`);
            }
          } else {
            console.log(`Game ${gameId} not found for joining.`);
            sendErrorMessage(ws, `Game ${gameId} not found for joining.`);
          }
        });
      } else if (data.type === "start_game") {
        const gameId = data.gameId;
        const currentUser = connectionUser.get(ws);
        const players = rooms.get(gameId) || [];
        console.log("CURRENT USER::::", currentUser);
        console.log("PLAYERS::::", players);
        if (players.includes(currentUser)) {
          console.log(`${currentUser} started game ${gameId}`);
          // Further logic for starting the game can be added here
          startGame(gameId, currentUser, (gameState) => {
            if (gameState) {
              wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                  const clientUser = connectionUser.get(client);
                  if (players.includes(clientUser)) {
                    sendPayload(client, "game_state_update", {
                      state: gameState,
                    });
                  }
                }
              });
            } else {
              sendErrorMessage(ws, `Failed to start game ${gameId}.`);
            }
          });
        } else {
          sendErrorMessage(ws, `You are not a player in game ${gameId}.`);
        }
      } else if (data.type === "player_move") {
        const gameId = data.gameId;
        const currentUser = connectionUser.get(ws);
        const move = data.move;
        if (checkIsMoveLegal(move.cardsSelected, move.cardPlayed)) {
          const { cardsSelected, cardPlayed } = data.move;
          console.log("LEGAL MOVE UPDATE GAME STATE!");
          updateGameStateAfterMove(
            gameId,
            currentUser,
            move.cardsSelected,
            move.cardPlayed,
            (data) => {
              console.log("AFTER UPDATE>>>>>>>>");

              sendPayload(ws, "game_state_update", { state: data });
              const players = rooms.get(gameId);
              const otherPlayer =
                players[0] === currentUser ? players[1] : players[0];

              const otherPlayerSocket = findOtherUserSocket(
                wss,
                ws,
                connectionUser,
                otherPlayer,
              );
              if (otherPlayerSocket) {
                sendPayload(otherPlayerSocket, "game_state_update", {
                  state: data,
                  otherPlayerMove: { cardsSelected, cardPlayed },
                });
              }
            },
          );
        } else {
          sendErrorMessage(ws, "This is not legal move, play something else!");
        }
        console.log(
          `${currentUser} made move in game ${gameId}: ${JSON.stringify(move)}`,
        );
        // Further logic for processing the move can be added here
      } else if (data && data.type === "reinitialize_game") {
        console.log("REINTIALIZE EXISTING GAME!!!", data.gameId);
        reinitializeGame(data.gameId, (result) => {
          if (!result) {
            sendErrorMessage(ws, "Unable to reinitialize game!");
          } else {
            sendPayload(ws, "game_state_update", { state: result });
          }
        });
      } else if (data && data.type === "chat_message") {
        const messageSender = data.from;
        const players = rooms.get(data.gameId);
        const otherPlayer =
          players[0] === messageSender ? players[1] : players[0];
        const clientSocket = findOtherUserSocket(
          wss,
          ws,
          connectionUser,
          otherPlayer,
        );

        if (clientSocket) {
          let messagesArr = messages.get(data.gameId);
          if (!messagesArr) {
            messagesArr = [];
          }

          const messageObj = {
            type: "chat_message",
            from: messageSender,
            to: otherPlayer,
            message: data.message,
          };
          messagesArr.push(messageObj);
          messages.set(data.gameId, messagesArr);

          sendPayload(clientSocket, "chat_message", {
            from: messageSender,
            to: otherPlayer,
            message: data.message,
          });
        }
      }
    } catch (e) {
      console.log("Invalid message received:", e, message);
    }
  });

  ws.on("close", () => {
    const uname = connectionUser.get(ws);
    if (uname) {
      const count = (userCounts.get(uname) || 1) - 1;
      if (count <= 0) userCounts.delete(uname);
      else userCounts.set(uname, count);
      connectionUser.delete(ws);
      broadcastUserList(wss);
    }
  });
}

function parseCookies(cookieHeader) {
  const map = {};
  if (!cookieHeader) return map;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      map[key] = decodeURIComponent(val);
    }
  });
  return map;
}

function broadcastUserList(wss) {
  const list = Array.from(userCounts.keys());
  const payload = JSON.stringify({ type: "userlist", users: list });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

function findOtherUserSocket(wss, ws, connectionUser, targetUser) {
  let otherUserSocket = null;

  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === 1) {
      const clientUser = connectionUser.get(client);
      if (clientUser === targetUser) {
        console.log(
          `Game invite sent from ${connectionUser.get(ws)} to ${targetUser}`,
        );
        otherUserSocket = client;
      }
    }
  });

  return otherUserSocket;
}

function sendPayload(ws, type, payload) {
  ws.send(JSON.stringify({ type, ...payload }));
}

function sendErrorMessage(ws, message) {
  ws.send(
    JSON.stringify({
      type: "error",
      message,
    }),
  );
}
