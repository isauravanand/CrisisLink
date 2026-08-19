import { Router } from "express";
import { login, getMe, logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public auth endpoints
router.post("/login", login);
router.post("/logout", logout);

// Protected auth endpoint
router.get("/me", requireAuth, getMe);

export default router;
