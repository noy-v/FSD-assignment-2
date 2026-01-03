import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
    content: string;
    sender: string;
    postId: string;
}

const commentSchema = new Schema<IComment>({
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

export default mongoose.model<IComment>("Comments", commentSchema);
