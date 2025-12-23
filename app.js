import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";

import { init } from "./lib/db.js";
import authRouter from "./routes/auth.js";
import gameRouter from "./routes/game.js";
import { setupSocket } from "./lib/socket-helper.js";
import { verifyToken, TOKEN_COOKIE } from "./lib/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

init();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/game", gameRouter);

app.get("/", (req, res) => {
  const token = req.cookies && req.cookies[TOKEN_COOKIE];
  const data = token ? verifyToken(token) : null;
  const currentUser = data && data.username ? data.username : null;
  if (!currentUser) {
    return res.redirect("/auth");
  }

  res.render("main", {
    cookies: req.cookies,
    currentUser,
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  setupSocket(wss, ws, req);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
