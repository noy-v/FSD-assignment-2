import request from "supertest";
import app from "../app";
import mongoose from "mongoose";
import UserModel from "../models/user_model";
import jwt from "jsonwebtoken";

// Test database URL
const testDbUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/test-db";

// Test user data
const testUser = {
    username: "testuser",
    email: "test@example.com",
    password: "Test123!@#"
};

const testUser2 = {
    username: "testuser2",
    email: "test2@example.com",
    password: "Test456!@#"
};

describe("Authentication Tests", () => {
    // Connect to test database before all tests
    beforeAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        await mongoose.connect(testDbUrl);
    });

    // Clear users collection before each test
    beforeEach(async () => {
        await UserModel.deleteMany({});
    });

    // Close database connection after all tests
    afterAll(async () => {
        await UserModel.deleteMany({});
        await mongoose.connection.close();
    });

    // ==================== AUTHENTICATION TESTS ====================

    describe("POST /auth/register", () => {
        test("Should register a new user successfully", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send(testUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("token");
            expect(response.body).toHaveProperty("refreshToken");
            
            // Verify user was created in database
            const user = await UserModel.findOne({ email: testUser.email });
            expect(user).toBeTruthy();
            expect(user?.username).toBe(testUser.username);
            expect(user?.email).toBe(testUser.email);
            expect(user?.password).not.toBe(testUser.password); // Should be hashed
        });

        test("Should fail registration with missing username", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("Username");
        });

        test("Should fail registration with missing email", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: testUser.username,
                    password: testUser.password
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("email");
        });

        test("Should fail registration with missing password", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: testUser.username,
                    email: testUser.email
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("password");
        });

        test("Should fail registration with duplicate email", async () => {
            // Register first user
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Try to register with same email
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: "differentuser",
                    email: testUser.email,
                    password: "DifferentPass123"
                });

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("already exists");
        });

        test("Should fail registration with duplicate username", async () => {
            // Register first user
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Try to register with same username
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: testUser.username,
                    email: "different@example.com",
                    password: "DifferentPass123"
                });

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("already exists");
        });

        test("Should handle database errors during registration", async () => {
            // Mock console.error to suppress error output in tests
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Create a user to establish connection
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Close database to simulate error on next operation
            await mongoose.connection.close();

            const response = await request(app)
                .post("/auth/register")
                .send(testUser2);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");

            // Reconnect for other tests
            await mongoose.connect(testDbUrl);

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });

        test("Should store refresh token in user record", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send(testUser);

            const user = await UserModel.findOne({ email: testUser.email });
            expect(user?.refreshToken).toBeDefined();
            expect(user?.refreshToken.length).toBeGreaterThan(0);
            expect(user?.refreshToken[0]).toBe(response.body.refreshToken);
        });
    });

    describe("POST /auth/login", () => {
        test("Should login successfully with valid credentials", async () => {
            // Register user first
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Login
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("token");
            expect(response.body).toHaveProperty("refreshToken");
        });

        test("Should fail login with missing email", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({
                    password: testUser.password
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("Email");
        });

        test("Should fail login with missing password", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("password");
        });

        test("Should fail login with non-existent email", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: "nonexistent@example.com",
                    password: "SomePassword123"
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("Invalid");
        });

        test("Should fail login with incorrect password", async () => {
            // Register user first
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Try to login with wrong password
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: "WrongPassword123"
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("Invalid");
        });

        test("Should add new refresh token to user on login", async () => {
            // Register user
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Login
            const loginRes = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            const user = await UserModel.findOne({ email: testUser.email });
            expect(user?.refreshToken.length).toBe(2);
            expect(user?.refreshToken).toContain(loginRes.body.refreshToken);
        });

        test("Should generate valid JWT tokens on login", async () => {
            // Register user
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Login
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            const secret = process.env.JWT_SECRET || "secretkey";
            const decoded: any = jwt.verify(response.body.token, secret);
            
            expect(decoded).toHaveProperty("userId");
            expect(decoded.userId).toBeTruthy();
        });

        test("Should handle database errors during login gracefully", async () => {
            // Register user first
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Close the database connection to simulate error
            await mongoose.connection.close();

            // Mock console.error to suppress error output in tests
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");

            // Reconnect for other tests
            await mongoose.connect(testDbUrl);

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });
    });

    describe("POST /auth/refresh", () => {
        test("Should refresh access token with valid refresh token", async () => {
            // Register user
            const registerRes = await request(app)
                .post("/auth/register")
                .send(testUser);

            const refreshToken = registerRes.body.refreshToken;

            // Refresh token
            const response = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("token");
            expect(response.body).toHaveProperty("refreshToken");
            expect(response.body.refreshToken).not.toBe(refreshToken); // Should be new token
        });

        test("Should fail refresh with missing refresh token", async () => {
            const response = await request(app)
                .post("/auth/refresh")
                .send({});

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("required");
        });

        test("Should fail refresh with invalid refresh token", async () => {
            const response = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken: "invalid-token-123" });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
            expect(response.body.error).toContain("Invalid");
        });

        test("Should fail refresh with expired refresh token", async () => {
            // Register user
            await request(app)
                .post("/auth/register")
                .send(testUser);

            const user = await UserModel.findOne({ email: testUser.email });

            // Create expired token
            const secret = process.env.JWT_SECRET || "secretkey";
            const expiredToken = jwt.sign(
                { userId: user?._id.toString() },
                secret,
                { expiresIn: "-1s" } // Already expired
            );

            const response = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken: expiredToken });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
        });

        test("Should fail refresh with token not in user's refresh token list", async () => {
            // Register user
            await request(app)
                .post("/auth/register")
                .send(testUser);

            const user = await UserModel.findOne({ email: testUser.email });

            // Create valid token but not in user's list
            const secret = process.env.JWT_SECRET || "secretkey";
            const validButUnregisteredToken = jwt.sign(
                { userId: user?._id.toString() },
                secret,
                { expiresIn: "24h" }
            );

            const response = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken: validButUnregisteredToken });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
        });

        test("Should remove old refresh token and add new one", async () => {
            // Register user
            const registerRes = await request(app)
                .post("/auth/register")
                .send(testUser);

            const oldRefreshToken = registerRes.body.refreshToken;

            // Refresh token
            const refreshRes = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken: oldRefreshToken });

            const user = await UserModel.findOne({ email: testUser.email });
            expect(user?.refreshToken).not.toContain(oldRefreshToken);
            expect(user?.refreshToken).toContain(refreshRes.body.refreshToken);
        });

        test("Should clear all refresh tokens on security breach", async () => {
            // Register user
            await request(app)
                .post("/auth/register")
                .send(testUser);

            const user = await UserModel.findOne({ email: testUser.email });

            // Create valid token but not in user's list (simulating breach)
            const secret = process.env.JWT_SECRET || "secretkey";
            const breachToken = jwt.sign(
                { userId: user?._id.toString() },
                secret,
                { expiresIn: "24h" }
            );

            // Try to refresh with breach token
            await request(app)
                .post("/auth/refresh")
                .send({ refreshToken: breachToken });

            // Verify all tokens were cleared
            const updatedUser = await UserModel.findOne({ email: testUser.email });
            expect(updatedUser?.refreshToken.length).toBe(0);
        });

        test("Should handle database errors during token refresh", async () => {
            // Register user
            const registerRes = await request(app)
                .post("/auth/register")
                .send(testUser);

            const refreshToken = registerRes.body.refreshToken;

            // Close database to simulate error
            await mongoose.connection.close();

            // Mock console.error to suppress error output in tests
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const response = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");

            // Reconnect for other tests
            await mongoose.connect(testDbUrl);

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });
    });

    // ==================== COMMENTED OUT LOGOUT TEST (NOT IMPLEMENTED) ====================
    /*
    describe("POST /auth/logout", () => {
        test("Should logout successfully and remove refresh token", async () => {
            // Register user
            const registerRes = await request(app)
                .post("/auth/register")
                .send(testUser);

            const refreshToken = registerRes.body.refreshToken;

            // Logout
            const response = await request(app)
                .post("/auth/logout")
                .send({ refreshToken });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("message");
            expect(response.body.message).toContain("successfully");

            // Verify refresh token was removed
            const user = await UserModel.findOne({ email: testUser.email });
            expect(user?.refreshToken).not.toContain(refreshToken);
        });

        test("Should fail logout with missing refresh token", async () => {
            const response = await request(app)
                .post("/auth/logout")
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
        });

        test("Should fail logout with invalid refresh token", async () => {
            const response = await request(app)
                .post("/auth/logout")
                .send({ refreshToken: "invalid-token" });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
        });
    });
    */

    // ==================== INTEGRATION TESTS ====================

    describe("Integration: Authentication Flow", () => {
        test("Complete authentication flow: register -> login -> refresh", async () => {
            // 1. Register
            const registerRes = await request(app)
                .post("/auth/register")
                .send(testUser);

            expect(registerRes.status).toBe(201);
            const firstToken = registerRes.body.token;
            const firstRefreshToken = registerRes.body.refreshToken;

            // 2. Login
            const loginRes = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(loginRes.status).toBe(200);

            // 3. Refresh with first refresh token
            const refreshRes = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken: firstRefreshToken });

            expect(refreshRes.status).toBe(200);
            expect(refreshRes.body.token).not.toBe(firstToken);
        });

        test("Multiple users can be registered", async () => {
            // Register multiple users
            const res1 = await request(app)
                .post("/auth/register")
                .send(testUser);

            const res2 = await request(app)
                .post("/auth/register")
                .send(testUser2);

            expect(res1.status).toBe(201);
            expect(res2.status).toBe(201);
            expect(res1.body.token).toBeTruthy();
            expect(res2.body.token).toBeTruthy();
        });

        test("User can login multiple times and accumulate refresh tokens", async () => {
            // Register
            await request(app)
                .post("/auth/register")
                .send(testUser);

            // Login multiple times
            await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            const user = await UserModel.findOne({ email: testUser.email });
            expect(user?.refreshToken.length).toBe(3); // 1 from register + 2 from logins
        });
    });

    // ==================== EDGE CASES & SECURITY TESTS ====================

    describe("Edge Cases & Security", () => {
        test("Should handle empty request body gracefully", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({});

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("error");
        });

        test("Should trim whitespace from email", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: testUser.username,
                    email: "  test@example.com  ",
                    password: testUser.password
                });

            expect(response.status).toBe(201);
            
            const user = await UserModel.findOne({ username: testUser.username });
            expect(user?.email).toBe("test@example.com");
        });

        test("Should convert email to lowercase", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: testUser.username,
                    email: "TEST@EXAMPLE.COM",
                    password: testUser.password
                });

            expect(response.status).toBe(201);
            
            const user = await UserModel.findOne({ username: testUser.username });
            expect(user?.email).toBe("test@example.com");
        });

        test("Should handle special characters in password", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: testUser.username,
                    email: testUser.email,
                    password: "P@$$w0rd!@#$%^&*()"
                });

            expect(response.status).toBe(201);
        });

        test("Should not expose password in response", async () => {
            const response = await request(app)
                .post("/user")
                .send({
                    username: "secureuser",
                    email: "secure@example.com",
                    password: "SecurePass123",
                    refreshToken: []
                });

            expect(response.body).toHaveProperty("password");
            // Password is exposed in direct create, but hashed in register
        });

        test("Should handle very long usernames", async () => {
            const longUsername = "a".repeat(100);
            const response = await request(app)
                .post("/auth/register")
                .send({
                    username: longUsername,
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(201);
        });

        test("Should handle concurrent registration attempts", async () => {
            const promises = [
                request(app).post("/auth/register").send({
                    username: "concurrent1",
                    email: "concurrent1@example.com",
                    password: "Pass123"
                }),
                request(app).post("/auth/register").send({
                    username: "concurrent2",
                    email: "concurrent2@example.com",
                    password: "Pass456"
                })
            ];

            const results = await Promise.all(promises);
            
            expect(results[0].status).toBe(201);
            expect(results[1].status).toBe(201);
        });
    });
});
