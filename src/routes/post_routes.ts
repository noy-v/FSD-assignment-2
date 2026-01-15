import express, { Router } from "express";
import postController from "../controllers/post_controller";

const router: Router = express.Router();

// 1. Add a New Post
router.post("/", postController.create);

// 2. Get All Posts & 4. Get Posts by Sender
router.get("/", postController.getAll);

// 3. Get a Post by ID
router.get("/:id", postController.getById);

// 5. Update a Post
router.put("/:id", postController.updateItem);

// Delete a Post
router.delete("/:id", postController.deleteItem);

export default router;
