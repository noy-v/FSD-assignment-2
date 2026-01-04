import express, { Express } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import postRoutes from "./routes/post_routes";

// Load environment variables
dotenv.config();

const app: Express = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/post", postRoutes);

// Database Connection
const db = mongoose.connection;
db.on("error", (error: Error) => console.error("Database Connection Error:", error));
db.once("open", () => console.log("Connected to MongoDB successfully"));

mongoose.connect(process.env.DATABASE_URL as string);

export default app;
