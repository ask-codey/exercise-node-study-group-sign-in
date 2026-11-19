// The study group's sign-up, sign-in and /me routes. For you to finish.
//
// createApp(db) builds the Express app around the database it's given: server.js gives it your MongoDB, and the
// tests give it a throwaway one. Its routes keep the students through createUsersRepository(db), from users.js
// (ready to use). Every answer is JSON, and no answer ever holds the password or its hash. Read the secret from
// process.env.JWT_SECRET inside the routes, when a request comes in. Every error is sent with sendProblem, the
// course's one error shape: { status, title, detail }.
//
//   POST /auth/sign-up   body { "name", "email", "password" }
//     201 { "id", "name", "email" }   A new student. Save only a bcrypt hash of the password (cost 10), with addUser.
//                                     The email is saved trimmed and lowercased: " Maya@Example.com " is saved
//                                     as "maya@example.com".
//     400 { "status": 400, "title": "Bad Request",
//           "detail": "Name, email and a password of 8 or more characters are required." }
//                                     The name, email or password is missing or empty, or the password is
//                                     shorter than 8 characters.
//     409 { "status": 409, "title": "Conflict", "detail": "That email already has an account." }
//                                     addUser gave back null: the email (trimmed and lowercased) is taken.
//
//   POST /auth/sign-in   body { "email", "password" }
//     200 { "token" }                 A JWT signed with process.env.JWT_SECRET, payload { sub: the student's id,
//                                     name: the student's name }, that expires in one hour. The email is looked up
//                                     trimmed and lowercased.
//     401 { "status": 401, "title": "Unauthorized", "detail": "Wrong email or password." }
//                                     No student has that email, or the password is wrong.
//
//   GET /me              header Authorization: Bearer <the token>
//     200 { "id", "name", "email" }   The student whose id is the token's sub.
//     401 { "status": 401, "title": "Unauthorized", "detail": "Sign in first." }
//                                     No Authorization header, or a token that was changed, signed with another
//                                     secret, or has expired.
//
// For now, createApp answers every request with a 404 that says it isn't built yet.
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { STATUS_CODES } from "node:http";
import { createUsersRepository } from "./users.js";

// The course's one error shape, from the lesson "Error Handling and Consistent Error Responses".
function sendProblem(res, status, detail, problems) {
  const body = { status, title: STATUS_CODES[status], detail };
  if (problems !== undefined) {
    body.problems = problems;
  }
  res.status(status).json(body);
}

export function createApp(db) {
  const users = createUsersRepository(db);
  const app = express();
  app.use(express.json());

  app.use((req, res) => {
    res.status(404).json({ message: "Not built yet." });
  });

  return app;
}
