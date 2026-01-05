import mongoose from "mongoose";
import { Server } from "http";

describe("Server Startup Tests", () => {
    let server: Server;

    afterAll(async () => {
        // Clean up
        if (server) {
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        }
    });

    it("should start the server successfully", async () => {
        // Dynamically import to avoid side effects
        const app = (await import("../app")).default;
        
        const port = process.env.PORT || 3000;
        
        // Start the server
        await new Promise<void>((resolve) => {
            server = app.listen(port, () => {
                console.log(`Server is running on http://localhost:${port}`);
                resolve();
            });
        });

        // Verify server is listening
        expect(server.listening).toBe(true);
    });

    it("should handle database connection error event", () => {
        const db = mongoose.connection;
        
        // Emit an error event to trigger the error handler
        const testError = new Error("Test database connection error");
        db.emit("error", testError);
        
        // If we get here without crashing, the error handler worked
        expect(db.listenerCount('error')).toBeGreaterThan(0);
    });

    it("should handle database connection open event", () => {
        const db = mongoose.connection;
        
        // Verify open event handler exists
        expect(db.listenerCount('open')).toBeGreaterThan(0);
    });
});
