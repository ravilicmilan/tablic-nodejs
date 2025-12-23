import express from "express";
import {
  signup,
  login,
  logout,
  renderAuthPage,
} from "../controllers/authController.js";

const router = express.Router();
router.get("/", renderAuthPage);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
