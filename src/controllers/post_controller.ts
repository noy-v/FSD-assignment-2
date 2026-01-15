import { Request, Response } from "express";
import BaseController from "./base_controller";
import PostModel, { IPost } from "../models/post_model";

class PostController extends BaseController<IPost> {
    constructor() {
        super(PostModel);
    }

    // Override or extend getAll to handle ?sender=<sender_id>
    async getAll(req: Request, res: Response): Promise<void> {
        const senderFilter = req.query.sender as string | undefined;
        try {
            if (senderFilter) {
                // If sender query exists: /post?sender=123
                const posts = await this.model.find({ sender: senderFilter });
                res.status(200).send(posts);
            } else {
                // Standard Get All: /post
                super.getAll(req, res);
            }
        } catch (error) {
            res.status(400).send((error as Error).message);
        }
    }
}

export default new PostController();
