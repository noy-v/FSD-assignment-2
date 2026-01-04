import express, { Router } from "express";
import userController from "../controllers/user_controller";

const router: Router = express.Router();

// 1. Create a New User
router.post("/", userController.create);

// 2. Get All Users & 4. Get Users by Email
router.get("/", userController.getAll);

// 3. Get User by ID
router.get("/id/:id", userController.getById);

// Get User by Username
router.get("/username/:username", userController.getByUsername);

// 5. Update a User
router.put("/:id", userController.updateItem);

// 6. Delete a User
router.delete("/:id", userController.deleteItem);

export default router;
