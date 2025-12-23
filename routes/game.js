import express from "express";
import { getGameById } from "../controllers/gameController.js";
import { requireAuth } from "../lib/auth.js";

const router = express.Router();
router.get("/:gameId", requireAuth, getGameById);

export default router;
