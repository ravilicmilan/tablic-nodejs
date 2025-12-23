import {
  createUser,
  findUserByUsername,
  verifyPassword,
} from "../models/user.js";
import { generateToken, TOKEN_COOKIE } from "../lib/auth.js";

function renderAuthPage(req, res) {
  res.render("auth", { currentUser: null });
}

async function signup(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });
  try {
    const user = await createUser(username, password);
    const token = generateToken({ id: user.id, username: user.username });
    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ ok: true, user: { id: user.id, username: user.username } });
  } catch (e) {
    if (e && e.code === "SQLITE_CONSTRAINT")
      return res.status(409).json({ error: "username_taken" });
    res.status(500).json({ error: "internal_error" });
  }
}

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });
  try {
    const user = await findUserByUsername(username);
    const ok = await verifyPassword(user, password);
    console.log("LOGIN:::", user, ok);
    if (!user || !ok)
      return res.status(401).json({ error: "invalid_credentials" });
    const token = generateToken({ id: user.id, username: user.username });
    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ ok: true, user: { id: user.id, username: user.username } });
  } catch (e) {
    console.log("ERROR LOGIN", e);
    res.status(500).json({ error: "internal_error" });
  }
}

function logout(req, res) {
  res.clearCookie(TOKEN_COOKIE);
  res.json({ ok: true });
}

export { signup, login, logout, renderAuthPage };
