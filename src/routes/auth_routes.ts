import express, { Router } from "express";
import authController from "../controllers/auth_controller";

const router: Router = express.Router();

// Register a new user
router.post("/register", authController.register.bind(authController));

// Login user
router.post("/login", authController.login.bind(authController));

// Refresh access token
router.post("/refresh", authController.refresh.bind(authController));

// Logout user
// router.post("/logout", authController.logout.bind(authController));

export default router;