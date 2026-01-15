import BaseController from "./base_controller";
import CommentModel, { IComment } from "../models/comment_model";

class CommentController extends BaseController<IComment> {
    constructor() {
        super(CommentModel);
    }
}

export default new CommentController();
