import mongoose, { Document, Model, Schema } from "mongoose";

export interface IComment {
    content: string;
    sender: string;
    postId: string;
}

export interface ICommentDocument extends IComment, Document {}

const commentSchema: Schema<ICommentDocument> = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    sender: {
        type: String,
        required: true
    },
    postId: {
        type: String,
        required: true
    }
});

const CommentModel: Model<ICommentDocument> = mongoose.model<ICommentDocument>("Comments", commentSchema);

export default CommentModel;

