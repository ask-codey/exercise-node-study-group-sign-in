// Tests for app.js. Run them with: npm test (run npm install once first).
// Each test sends requests to createApp(db) with Supertest and checks the answers: the status code, the Content-Type
// and the JSON body, and for sign-up, what was saved. No server needs to be running, and no port is used. The tests
// use a throwaway MongoDB (throwaway-database.js), emptied before every test, so your own databases are never touched.
// You don't need to change this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { useThrowawayDatabase } from "./throwaway-database.js";

// The tests sign and check tokens with this secret. It's plainly a test value: a real secret lives only in .env.
const secret = "test-secret-not-for-real-use";
process.env.JWT_SECRET = secret;
const { createApp } = await import("./app.js");

const database = useThrowawayDatabase();

const maya = { name: "Maya", email: "maya@example.com", password: "maya-example-password" };
const wrongEmailOrPassword = { status: 401, title: "Unauthorized", detail: "Wrong email or password." };
const signInFirst = { status: 401, title: "Unauthorized", detail: "Sign in first." };
const fieldsRequired = {
  status: 400,
  title: "Bad Request",
  detail: "Name, email and a password of 8 or more characters are required.",
};
const emailTaken = { status: 409, title: "Conflict", detail: "That email already has an account." };

// Checks the parts every answer shares: its status code and its Content-Type header.
function assertJson(response, status, what) {
  assert.equal(response.status, status,
    `${what} should answer ${status}, but it answered ${response.status} with ${JSON.stringify(response.body)}.`);
  assert.match(response.headers["content-type"] ?? "(none)", /application\/json/,
    `${what} should answer with JSON.`);
}

// Supertest, pointed at the app built around the throwaway database.
function api() {
  return request(createApp(database.db));
}

function signUp(body) {
  return api().post("/auth/sign-up").send(body);
}

function signIn(email, password) {
  return api().post("/auth/sign-in").send({ email, password });
}

// Signs Maya up, then in, and gives back her id (from sign-up) and her token (from sign-in).
async function signedInMaya() {
  const signedUp = await signUp(maya);
  assertJson(signedUp, 201, "POST /auth/sign-up for Maya");
  const signedIn = await signIn(maya.email, maya.password);
  assertJson(signedIn, 200, "POST /auth/sign-in with Maya's email and password");
  return { id: signedUp.body.id, token: signedIn.body.token };
}

test("1) POST /auth/sign-up answers 201 with Maya's id, name and email, and nothing else", async () => {
  const response = await signUp(maya);
  assertJson(response, 201, "POST /auth/sign-up for Maya");
  assert.deepEqual(Object.keys(response.body).sort(), ["email", "id", "name"],
    "The body should hold exactly id, name and email: never the password or its hash.");
  assert.equal(response.body.name, "Maya");
  assert.equal(response.body.email, "maya@example.com");
  assert.match(String(response.body.id), /^[0-9a-f]{24}$/, "The id should be the one addUser gave back, as text.");
});

test("2) POST /auth/sign-up saves a bcrypt hash of the password, made at cost 10, and never the password itself", async () => {
  await signUp(maya);
  const saved = await database.db.collection("users").findOne({ email: "maya@example.com" });
  assert.ok(saved, "Maya should be saved, with her email lowercased, through addUser.");
  assert.ok(!JSON.stringify(saved).includes(maya.password), "The password itself should never be saved.");
  assert.equal(typeof saved.passwordHash, "string", "Save the hash in passwordHash, through addUser.");
  assert.equal(bcrypt.getRounds(saved.passwordHash), 10, "Make the hash with bcrypt.hash(password, 10): cost 10.");
  assert.ok(await bcrypt.compare(maya.password, saved.passwordHash), "The saved hash should match Maya's password.");
});

test("3) POST /auth/sign-up with an email that's taken answers 409 \"That email already has an account.\"", async () => {
  await signUp(maya);
  const response = await signUp({ name: "Maya", email: "maya@example.com", password: "another-example-password" });
  assertJson(response, 409, "A second POST /auth/sign-up for maya@example.com");
  assert.deepEqual(response.body, emailTaken);
});

test("4) POST /auth/sign-up with MAYA@EXAMPLE.COM, after maya@example.com, answers 409: emails are compared in lowercase", async () => {
  await signUp(maya);
  const response = await signUp({ name: "Maya", email: "MAYA@EXAMPLE.COM", password: "another-example-password" });
  assertJson(response, 409, "POST /auth/sign-up for MAYA@EXAMPLE.COM");
  assert.deepEqual(response.body, emailTaken);
});

test("5) POST /auth/sign-up with \" Maya@Example.com \" answers 201 with the email maya@example.com, trimmed and lowercased", async () => {
  const response = await signUp({ name: "Maya", email: " Maya@Example.com ", password: maya.password });
  assertJson(response, 201, "POST /auth/sign-up for \" Maya@Example.com \"");
  assert.equal(response.body.email, "maya@example.com");
});

test("6) POST /auth/sign-up with no password answers 400 \"Name, email and a password of 8 or more characters are required.\"", async () => {
  const response = await signUp({ name: "Leo", email: "leo@example.com" });
  assertJson(response, 400, "POST /auth/sign-up with no password");
  assert.deepEqual(response.body, fieldsRequired);
});

test("7) POST /auth/sign-up with a 7-character password, \"study12\", answers 400 with the same detail and saves nothing", async () => {
  const response = await signUp({ name: "Leo", email: "leo@example.com", password: "study12" });
  assertJson(response, 400, "POST /auth/sign-up with a 7-character password");
  assert.deepEqual(response.body, fieldsRequired);
  assert.equal(await database.db.collection("users").countDocuments(), 0, "Nothing should be saved when the body is refused.");
});

test("8) POST /auth/sign-in with Maya's email and password answers 200 with a token, and nothing else", async () => {
  await signUp(maya);
  const response = await signIn(maya.email, maya.password);
  assertJson(response, 200, "POST /auth/sign-in with Maya's email and password");
  assert.deepEqual(Object.keys(response.body), ["token"], "The body should hold only the token: { \"token\": \"...\" }.");
  assert.equal(String(response.body.token).split(".").length, 3, "A JWT is three parts joined by dots.");
});

test("9) The sign-in token is signed with JWT_SECRET, holds sub (Maya's id) and name \"Maya\", and expires in 1 hour", async () => {
  const { id, token } = await signedInMaya();
  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch (error) {
    assert.fail(`The token should be signed with process.env.JWT_SECRET, but jwt.verify said: ${error.message}.`);
  }
  assert.equal(payload.sub, id, "The token's sub should be Maya's id, as sign-up gave it back.");
  assert.equal(payload.name, "Maya", "The token's payload should hold name: \"Maya\".");
  assert.equal(payload.exp - payload.iat, 60 * 60, "The token should expire one hour after it's made: { expiresIn: \"1h\" }.");
});

test("10) POST /auth/sign-in with a wrong password answers 401 \"Wrong email or password.\"", async () => {
  await signUp(maya);
  const response = await signIn(maya.email, "Maya-example-password");
  assertJson(response, 401, "POST /auth/sign-in with a wrong password");
  assert.deepEqual(response.body, wrongEmailOrPassword);
});

test("11) POST /auth/sign-in with an email that has no account answers 401 with the same detail", async () => {
  await signUp(maya);
  const response = await signIn("nobody@example.com", maya.password);
  assertJson(response, 401, "POST /auth/sign-in for nobody@example.com");
  assert.deepEqual(response.body, wrongEmailOrPassword,
    "An unknown email gets exactly the same answer as a wrong password.");
});

test("12) POST /auth/sign-in with \"MAYA@EXAMPLE.COM\" and Maya's password answers 200: the email is looked up in lowercase", async () => {
  await signUp(maya);
  const response = await signIn("MAYA@EXAMPLE.COM", maya.password);
  assertJson(response, 200, "POST /auth/sign-in for MAYA@EXAMPLE.COM");
});

test("13) GET /me with Maya's token answers 200 with her id, name and email, and nothing else", async () => {
  const { id, token } = await signedInMaya();
  const response = await api().get("/me").set("Authorization", `Bearer ${token}`);
  assertJson(response, 200, "GET /me with Maya's token");
  assert.deepEqual(response.body, { id, name: "Maya", email: "maya@example.com" },
    "The body should be Maya's id, name and email: never the password or its hash.");
});

test("14) GET /me with no Authorization header answers 401 \"Sign in first.\"", async () => {
  await signedInMaya();
  const response = await api().get("/me");
  assertJson(response, 401, "GET /me with no Authorization header");
  assert.deepEqual(response.body, signInFirst);
});

test("15) GET /me with a token signed with another secret answers 401 \"Sign in first.\"", async () => {
  const { id } = await signedInMaya();
  const forged = jwt.sign({ sub: id, name: "Maya" }, "another-secret-not-for-real-use", { expiresIn: "1h" });
  const response = await api().get("/me").set("Authorization", `Bearer ${forged}`);
  assertJson(response, 401, "GET /me with a token signed with another secret");
  assert.deepEqual(response.body, signInFirst);
});

test("16) GET /me with a token that expired an hour ago answers 401 \"Sign in first.\"", async () => {
  const { id } = await signedInMaya();
  const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
  const expired = jwt.sign({ sub: id, name: "Maya", iat: twoHoursAgo }, secret, { expiresIn: "1h" });
  const response = await api().get("/me").set("Authorization", `Bearer ${expired}`);
  assertJson(response, 401, "GET /me with an expired token");
  assert.deepEqual(response.body, signInFirst);
});
