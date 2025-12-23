import { db } from "../lib/db.js";
import bcrypt from "bcrypt";

export async function createUser(username, password) {
  const hashed = await bcrypt.hash(password, 10);
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      "INSERT INTO users (username, password) VALUES (?, ?)",
    );
    stmt.run(username, hashed, function (err) {
      stmt.finalize();
      if (err) return reject(err);
      resolve({ id: this.lastID, username });
    });
  });
}

export function findUserByUsername(username) {
  // console.log("FIND USERNAME DB::::", username);
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id, username, password FROM users WHERE username = ?",
      [username],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      },
    );
  });
}

export async function verifyPassword(user, password) {
  if (!user) return false;
  return await bcrypt.compare(password, user.password);
}
