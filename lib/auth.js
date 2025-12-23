import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
export const TOKEN_COOKIE = "token";

export function generateToken(payload, opts = {}) {
  return jwt.sign(
    payload,
    JWT_SECRET,
    Object.assign({ expiresIn: "30d" }, opts),
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[TOKEN_COOKIE];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: "Invalid token" });
  req.user = data;
  next();
}
