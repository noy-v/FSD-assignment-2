import { Request, Response } from "express";
import BaseController from "./base_controller";
import PostModel, { IPost } from "../models/post_model";
import { AuthRequest } from "../middleware/auth_middleware";

class PostController extends BaseController<IPost> {
    constructor() {
        super(PostModel);
    }

    // Override or extend getAll to handle ?userId=<user_id>
    async getAll(req: Request, res: Response): Promise<void> {
        const userIdFilter = req.query.userId as string | undefined;
        try {
            if (userIdFilter) {
                // If userId query exists: /post?userId=123
                const posts = await this.model.find({ userId: userIdFilter });
                res.status(200).send(posts);
            } else {
                // Standard Get All: /post
                super.getAll(req, res);
            }
        } catch (error) {
            res.status(400).send((error as Error).message);
        }
    }

    async updateItem(req: AuthRequest, res: Response): Promise<void> {
        try {
            const post = await this.model.findById(req.params.id);
            if (!post) {
                res.status(404).send("Not found");
                return;
            }
            if (post.userId.toString() !== req.userId) {
                res.status(403).json({ error: "You can only update your own posts" });
                return;
            }
            const updated = await this.model.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.status(200).send(updated);
        } catch (error) {
            res.status(400).send((error as Error).message);
        }
    }

    async deleteItem(req: AuthRequest, res: Response): Promise<void> {
        try {
            const post = await this.model.findById(req.params.id);
            if (!post) {
                res.status(404).send("Not found");
                return;
            }
            if (post.userId.toString() !== req.userId) {
                res.status(403).json({ error: "You can only delete your own posts" });
                return;
            }
            await this.model.findByIdAndDelete(req.params.id);
            res.status(200).send({ message: "Deleted successfully" });
        } catch (error) {
            res.status(400).send((error as Error).message);
        }
    }
}

export default new PostController();
