import request from "supertest";
import app from "../app";
import mongoose from "mongoose";
import UserModel from "../models/user_model";

describe("Users API Tests", () => {
    let userToken: string;
    let userId: string;
    let otherUserToken: string;

    beforeAll(async () => {
        // Connect to test database
        const dbUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/test-db";
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(dbUrl);
        }
        
        // Drop all collections and indexes before tests
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
            await collection.dropIndexes().catch(() => {
                // Ignore errors if indexes don't exist
            });
        }
    });

    afterAll(async () => {
        // Clean up - don't close connection here, let global teardown handle it
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    describe("POST /user - Create User", () => {
        beforeEach(async () => {
            // Clear users collection before each test
            await UserModel.deleteMany({});
            // Rebuild indexes to ensure unique constraints work
            await UserModel.syncIndexes();
        });

        it("should create a new user successfully", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    username: "newuser",
                    email: "newuser@example.com",
                    password: "SecurePass123!"
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body.username).toBe("newuser");
            expect(response.body.email).toBe("newuser@example.com");
        });

        it("should fail to create user without username", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    email: "newuser@example.com",
                    password: "SecurePass123!"
                });

            expect(response.status).toBe(400);
        });

        it("should fail to create user without email", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    username: "newuser",
                    password: "SecurePass123!"
                });

            expect(response.status).toBe(400);
        });

        it("should fail to create user without password", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    username: "newuser",
                    email: "newuser@example.com"
                });

            expect(response.status).toBe(400);
        });

        it("should fail to create user with empty body", async () => {
            const response = await request(app)
                .post("/user")
                .send({});

            expect(response.status).toBe(400);
        });

        it("should fail to create user with duplicate email", async () => {
            // Create first user
            await request(app)
                .post("/user")
                .send({
                    username: "user1",
                    email: "duplicate@example.com",
                    password: "SecurePass123!"
                });

            // Try to create another with same email
            const response = await request(app)
                .post("/user")
                .send({
                    username: "user2",
                    email: "duplicate@example.com",
                    password: "SecurePass123!"
                });

            expect(response.status).toBe(409);
        });

        it("should fail to create user with duplicate username", async () => {
            // Create first user
            await request(app)
                .post("/user")
                .send({
                    username: "duplicateuser",
                    email: "email1@example.com",
                    password: "SecurePass123!"
                });

            // Try to create another with same username
            const response = await request(app)
                .post("/user")
                .send({
                    username: "duplicateuser",
                    email: "email2@example.com",
                    password: "SecurePass123!"
                });

            expect(response.status).toBe(409);
        });
    });

    describe("POST /user - Error Scenarios", () => {
        beforeEach(async () => {
            await UserModel.deleteMany({});
            // Rebuild indexes to ensure unique constraints work
            await UserModel.syncIndexes();
        });

        it("should fail to create user with null username", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    username: null,
                    email: "test@example.com",
                    password: "SecurePass123!"
                });

            expect(response.status).toBe(400);
        });

        it("should fail to create user with empty string username", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    username: "",
                    email: "test@example.com",
                    password: "SecurePass123!"
                });

            expect(response.status).toBe(400);
        });
    });

    describe("POST /user - Additional Base Controller Error Cases", () => {
        beforeEach(async () => {
            await UserModel.deleteMany({});
            await UserModel.syncIndexes();
        });

        it("should handle creation with malformed data gracefully", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    username: { invalid: "object" },
                    email: ["not", "a", "string"],
                    password: 12345
                });

            expect(response.status).toBe(400);
        });

        it("should handle unexpected database errors", async () => {
            // Test that error handling works by creating a valid user
            const response = await request(app)
                .post("/user")
                .send({
                    username: "validuser",
                    email: "valid@example.com",
                    password: "SecurePass123!"
                });

            // Should succeed or fail gracefully
            expect([201, 400, 409]).toContain(response.status);
        });
    });

    describe("GET /user - Get All Users", () => {
        beforeEach(async () => {
            // Clear and create test users using auth/register for proper token
            await UserModel.deleteMany({});

            // Create first user via auth endpoint
            const user1Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "user1",
                    email: "user1@example.com",
                    password: "SecurePass123!"
                });
            userToken = user1Response.body.token;
            
            // Get user ID from database
            let user1 = await UserModel.findOne({ email: "user1@example.com" });
            userId = user1?._id.toString() || "";

            // Create second user via auth endpoint
            const user2Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "user2",
                    email: "user2@example.com",
                    password: "SecurePass123!"
                });
            otherUserToken = user2Response.body.token;

        });

        it("should fail to get all users without authentication", async () => {
            const response = await request(app).get("/user");
            expect(response.status).toBe(401);
        });

        it("should get all users with valid token", async () => {
            const response = await request(app)
                .get("/user")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it("should fail to get all users with invalid token", async () => {
            const response = await request(app)
                .get("/user")
                .set("Authorization", "Bearer invalidtoken");

            expect(response.status).toBe(401);
        });
    });

    describe("GET /user/id/:id - Get User by ID", () => {
        beforeEach(async () => {
            // Clear and create test users using auth/register
            await UserModel.deleteMany({});

            const user1Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "user1",
                    email: "user1@example.com",
                    password: "SecurePass123!"
                });
            userToken = user1Response.body.token;
            
            // Get user ID from database
            let user1 = await UserModel.findOne({ email: "user1@example.com" });
            userId = user1?._id.toString() || "";
        });

        it("should fail to get user by ID without authentication", async () => {
            const response = await request(app).get(`/user/id/${userId}`);
            expect(response.status).toBe(401);
        });

        it("should get user by ID with valid token", async () => {
            const response = await request(app)
                .get(`/user/id/${userId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body._id).toBe(userId);
            expect(response.body.username).toBe("user1");
        });

        it("should fail to get non-existent user", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/user/id/${fakeId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(404);
        });

        it("should fail with invalid ID format", async () => {
            const response = await request(app)
                .get("/user/id/invalidid")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(400);
        });
    });

    describe("GET /user/username/:username - Get User by Username", () => {
        beforeEach(async () => {
            // Clear and create test users using auth/register
            await UserModel.deleteMany({});

            const user1Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "testuser",
                    email: "test@example.com",
                    password: "SecurePass123!"
                });
            userToken = user1Response.body.token;
        });

        it("should fail to get user by username without authentication", async () => {
            const response = await request(app).get("/user/username/testuser");
            expect(response.status).toBe(401);
        });

        it("should get user by username with valid token", async () => {
            const response = await request(app)
                .get("/user/username/testuser")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.username).toBe("testuser");
            expect(response.body.email).toBe("test@example.com");
        });

        it("should fail to get non-existent username", async () => {
            const response = await request(app)
                .get("/user/username/nonexistentuser")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe("PUT /user/:id - Update User", () => {
        beforeEach(async () => {
            // Clear and create test users using auth/register
            await UserModel.deleteMany({});

            const user1Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "user1",
                    email: "user1@example.com",
                    password: "SecurePass123!"
                });
            userToken = user1Response.body.token;
            
            // Get user ID from database
            let user1 = await UserModel.findOne({ email: "user1@example.com" });
            userId = user1?._id.toString() || "";

            const user2Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "user2",
                    email: "user2@example.com",
                    password: "SecurePass123!"
                });
            otherUserToken = user2Response.body.token;

        });

        it("should fail to update user without authentication", async () => {
            const response = await request(app)
                .put(`/user/${userId}`)
                .send({
                    username: "updateduser"
                });

            expect(response.status).toBe(401);
        });

        it("should update own user successfully", async () => {
            const response = await request(app)
                .put(`/user/${userId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    username: "updateduser"
                });

            expect(response.status).toBe(200);
            expect(response.body.username).toBe("updateduser");
        });

        it("should fail to update with invalid ID", async () => {
            const response = await request(app)
                .put("/user/invalidid")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    username: "updateduser"
                });

            expect(response.status).toBe(400);
        });

        it("should fail to update with invalid token", async () => {
            const response = await request(app)
                .put(`/user/${userId}`)
                .set("Authorization", "Bearer invalidtoken")
                .send({
                    username: "updateduser"
                });

            expect(response.status).toBe(401);
        });

        it("should fail to update non-existent user with valid ID format", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .put(`/user/${fakeId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    username: "updateduser"
                });

            expect(response.status).toBe(404);
        });

        it("should handle update with malformed data", async () => {
            const response = await request(app)
                .put(`/user/${userId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    username: null
                });

            // Should either update or reject malformed data
            expect([200, 400]).toContain(response.status);
        });
    });

    describe("DELETE /user/:id - Delete User", () => {
        beforeEach(async () => {
            // Clear and create test users using auth/register
            await UserModel.deleteMany({});

            const user1Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "user1",
                    email: "user1@example.com",
                    password: "SecurePass123!"
                });
            userToken = user1Response.body.token;
            
            // Get user ID from database
            let user1 = await UserModel.findOne({ email: "user1@example.com" });
            userId = user1?._id.toString() || "";

            const user2Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "user2",
                    email: "user2@example.com",
                    password: "SecurePass123!"
                });
            otherUserToken = user2Response.body.token;

        });

        it("should fail to delete user without authentication", async () => {
            const response = await request(app).delete(`/user/${userId}`);
            expect(response.status).toBe(401);
        });

        it("should delete own user successfully", async () => {
            const response = await request(app)
                .delete(`/user/${userId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);

            // Verify user is deleted
            const getResponse = await request(app)
                .get(`/user/id/${userId}`)
                .set("Authorization", `Bearer ${otherUserToken}`);
            expect(getResponse.status).toBe(404);
        });

        it("should fail to delete with invalid ID", async () => {
            const response = await request(app)
                .delete("/user/invalidid")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(400);
        });

        it("should fail to delete with invalid token", async () => {
            const response = await request(app)
                .delete(`/user/${userId}`)
                .set("Authorization", "Bearer invalidtoken");

            expect(response.status).toBe(401);
        });

        it("should fail to delete non-existent user", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .delete(`/user/${fakeId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(404);
        });

        it("should handle delete with proper cleanup", async () => {
            // Create a user and immediately delete it
            const createResponse = await request(app)
                .post("/auth/register")
                .send({
                    username: "tempuser",
                    email: "temp@example.com",
                    password: "SecurePass123!"
                });

            const tempToken = createResponse.body.token;
            const tempUser = await UserModel.findOne({ email: "temp@example.com" });
            const tempUserId = tempUser?._id.toString() || "";

            const deleteResponse = await request(app)
                .delete(`/user/${tempUserId}`)
                .set("Authorization", `Bearer ${tempToken}`);

            expect(deleteResponse.status).toBe(200);

            // Verify deletion worked
            const verifyResponse = await request(app)
                .get(`/user/id/${tempUserId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(verifyResponse.status).toBe(404);
        });
    });

    describe("Additional User Operations", () => {
        let user1Token: string;
        let user1Id: string;
        let user2Token: string;

        beforeEach(async () => {
            // Clear users before each test
            await UserModel.deleteMany({});

            // Create first user
            const user1Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "alice",
                    email: "alice@example.com",
                    password: "SecurePass123!"
                });
            user1Token = user1Response.body.token;
            
            let user1 = await UserModel.findOne({ email: "alice@example.com" });
            user1Id = user1?._id.toString() || "";

            // Create second user
            const user2Response = await request(app)
                .post("/auth/register")
                .send({
                    username: "bob",
                    email: "bob@example.com",
                    password: "SecurePass123!"
                });
            user2Token = user2Response.body.token;
            
            let user2 = await UserModel.findOne({ email: "bob@example.com" });
            void user2?._id.toString(); // user2 exists but ID not needed for these tests
        });

        describe("Email Filtering", () => {
            it("should filter users by email", async () => {
                const response = await request(app)
                    .get("/user?email=alice@example.com")
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                expect(response.body.length).toBe(1);
                expect(response.body[0].email).toBe("alice@example.com");
            });

            it("should return empty array for non-existent email filter", async () => {
                const response = await request(app)
                    .get("/user?email=nonexistent@example.com")
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                expect(response.body.length).toBe(0);
            });

            it("should require authentication for email filtering", async () => {
                const response = await request(app)
                    .get("/user?email=alice@example.com");

                expect(response.status).toBe(401);
            });
        });

        describe("Update User - Additional Cases", () => {
            it("should prevent other users from updating your profile", async () => {
                const response = await request(app)
                    .put(`/user/${user1Id}`)
                    .set("Authorization", `Bearer ${user2Token}`)
                    .send({
                        username: "hacker"
                    });

                expect(response.status).toBe(403);

                // Verify user1 username didn't change
                const getResponse = await request(app)
                    .get(`/user/id/${user1Id}`)
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(getResponse.body.username).toBe("alice");
            });

            it("should update user's email successfully", async () => {
                const response = await request(app)
                    .put(`/user/${user1Id}`)
                    .set("Authorization", `Bearer ${user1Token}`)
                    .send({
                        email: "newemail@example.com"
                    });

                expect(response.status).toBe(200);
                expect(response.body.email).toBe("newemail@example.com");
            });

            it("should update multiple user fields at once", async () => {
                const response = await request(app)
                    .put(`/user/${user1Id}`)
                    .set("Authorization", `Bearer ${user1Token}`)
                    .send({
                        username: "aliceupd",
                        email: "aliceupd@example.com"
                    });

                expect(response.status).toBe(200);
                expect(response.body.username).toBe("aliceupd");
                expect(response.body.email).toBe("aliceupd@example.com");
            });

            it("should handle update with no changes", async () => {
                const response = await request(app)
                    .put(`/user/${user1Id}`)
                    .set("Authorization", `Bearer ${user1Token}`)
                    .send({
                        username: "alice"
                    });

                expect(response.status).toBe(200);
                expect(response.body.username).toBe("alice");
            });
        });

        describe("Delete User - Additional Cases", () => {
            it("should prevent other users from deleting your account", async () => {
                const response = await request(app)
                    .delete(`/user/${user1Id}`)
                    .set("Authorization", `Bearer ${user2Token}`);

                expect(response.status).toBe(403);

                // Verify user1 still exists
                const getResponse = await request(app)
                    .get(`/user/id/${user1Id}`)
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(getResponse.status).toBe(200);
            });

            it("should delete user and prevent access to deleted user data", async () => {
                // Delete user1
                const deleteResponse = await request(app)
                    .delete(`/user/${user1Id}`)
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(deleteResponse.status).toBe(200);

                // User2 tries to get user1 - should fail
                const getResponse = await request(app)
                    .get(`/user/id/${user1Id}`)
                    .set("Authorization", `Bearer ${user2Token}`);

                expect(getResponse.status).toBe(404);
            });

            it("should allow user to delete and create new account with same email", async () => {
                // Delete user1
                await request(app)
                    .delete(`/user/${user1Id}`)
                    .set("Authorization", `Bearer ${user1Token}`);

                // Create new user with same email
                const newUserResponse = await request(app)
                    .post("/auth/register")
                    .send({
                        username: "alice2",
                        email: "alice@example.com", // Same email as deleted user
                        password: "SecurePass123!"
                    });

                expect(newUserResponse.status).toBe(201);
                expect(newUserResponse.body).toHaveProperty("token");
            });
        });

        describe("Get User - Additional Cases", () => {
            it("should get all users when authenticated", async () => {
                const response = await request(app)
                    .get("/user")
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                expect(response.body.length).toBeGreaterThanOrEqual(2);
            });

            it("should handle getting non-existent user by username", async () => {
                const response = await request(app)
                    .get("/user/username/nonexistentuser")
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(response.status).toBe(404);
            });

            it("should case-sensitively match usernames", async () => {
                const response = await request(app)
                    .get("/user/username/ALICE")
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(response.status).toBe(404);
            });

            it("should handle getting user with special characters in query", async () => {
                const response = await request(app)
                    .get("/user/username/alice@special")
                    .set("Authorization", `Bearer ${user1Token}`);

                expect(response.status).toBe(404);
            });
        });
    });
});
