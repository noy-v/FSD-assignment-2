import express, { Express } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger";
import postRoutes from "./routes/post_routes";
import userRoutes from "./routes/user_routes";
import authRoutes from "./routes/auth_routes";
import commentRoutes from "./routes/comment_routes";


// Load environment variables
dotenv.config();

const app: Express = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/post", postRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/comment", commentRoutes);

// Database Connection
const db = mongoose.connection;
db.on("error", (error: Error) => console.error("Database Connection Error:", error));
db.once("open", () => console.log("Connected to MongoDB successfully"));

mongoose.connect(process.env.DATABASE_URL as string);

export default app;
