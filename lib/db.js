import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3").verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, "app.db");
const db = new sqlite3.Database(DB_PATH);

function init() {
  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

  const createGames = `
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1 TEXT ,
      player2 TEXT ,
      deck TEXT ,
      currentTurn INTEGER ,
      lastTake TEXT,
      player1Score TEXT,
      player2Score TEXT,
      player1Hand TEXT,
      player2Hand TEXT,
      cardsOnTable TEXT,
      status TEXT ,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(player1) REFERENCES users(username),
      FOREIGN KEY(player2) REFERENCES users(username)
    )`;
  const createInvitations = `
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user TEXT NOT NULL,
      to_user TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(from_user) REFERENCES users(username),
      FOREIGN KEY(to_user) REFERENCES users(username)
    )`;
  db.serialize(() => {
    db.run(createUsers);
    db.run(createGames);
    db.run(createInvitations);
  });
}

export { db, init };
