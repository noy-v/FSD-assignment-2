import { Request, Response } from "express";
import BaseController from "./base_controller";
import CommentModel, { ICommentDocument } from "../models/comment_model";
import { AuthRequest } from "../middleware/auth_middleware";

interface CommentQuery {
    postId?: string;
    userId?: string;
}

class CommentController extends BaseController<ICommentDocument> {
    constructor() {
        super(CommentModel);
    }

    // Override getAll to handle ?postId=<post_id> and ?userId=<user_id>
    async getAll(req: Request, res: Response): Promise<void> {
        const { postId, userId } = req.query as CommentQuery;
        try {
            // Build filter object based on query parameters
            const filter: Partial<CommentQuery> = {};
            if (postId) filter.postId = postId;
            if (userId) filter.userId = userId;

            // If there are filters, use them; otherwise get all comments
            if (Object.keys(filter).length > 0) {
                const comments = await this.model.find(filter);
                res.status(200).send(comments);
            } else {
                // Get all comments
                super.getAll(req, res);
            }
        } catch (error) {
            res.status(400).send((error as Error).message);
        }
    }

    async updateItem(req: AuthRequest, res: Response): Promise<void> {
        try {
            const comment = await this.model.findById(req.params.id);
            if (!comment) {
                res.status(404).send("Not found");
                return;
            }
            if (comment.userId.toString() !== req.userId) {
                res.status(403).json({ error: "You can only update your own comments" });
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
            const comment = await this.model.findById(req.params.id);
            if (!comment) {
                res.status(404).send("Not found");
                return;
            }
            if (comment.userId.toString() !== req.userId) {
                res.status(403).json({ error: "You can only delete your own comments" });
                return;
            }
            await this.model.findByIdAndDelete(req.params.id);
            res.status(200).send({ message: "Deleted successfully" });
        } catch (error) {
            res.status(400).send((error as Error).message);
        }
    }
}

export default new CommentController();

