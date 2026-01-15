import express, { Router } from "express";
import commentController from "../controllers/comment_controller";

const router: Router = express.Router();

// Add a New Comment
router.post("/", commentController.create);

// Get All Comments
router.get("/", commentController.getAll);

// Get a Comment by ID
router.get("/:id", commentController.getById);

// Update a Comment
router.put("/:id", commentController.updateItem);

// Delete a Comment
router.delete("/:id", commentController.deleteItem);

export default router;
