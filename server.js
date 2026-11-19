// Starts the study group's API at http://localhost:3100, with the routes in app.js and the students in MongoDB.
// Run it with: npm start (or npm run dev, which restarts it each time you save). Stop it with Ctrl+C.
// It reads MONGODB_URI and JWT_SECRET from .env, so copy .env.example to .env first, and MongoDB must be running.
// Ready to use: you don't need to change this file.
import { MongoClient } from "mongodb";
import { createApp } from "./app.js";
import { createUserIndexes } from "./users.js";

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error("MONGODB_URI and JWT_SECRET must both be set in .env. Copy .env.example to .env, then set your secret.");
  process.exit(1);
}

const port = 3100;

// Connect once, before the server takes its first request, and make sure the unique index on email is there.
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
await createUserIndexes(db);
const app = createApp(db);

const server = app.listen(port, () => {
  console.log(`The study group's API is listening on http://localhost:${port}`);
});

// Ctrl+C: stop taking requests, then close the database connection.
process.on("SIGINT", async () => {
  server.close();
  await client.close();
  console.log("Stopped the server and closed the database connection.");
});
