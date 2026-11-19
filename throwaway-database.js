// The throwaway MongoDB the tests use. You don't need to change it: the lesson "Testing with mongodb-memory-server"
// explains every part of it.
//
// What it does, in order:
//   1. Before the first test, starts a throwaway MongoDB with mongodb-memory-server, so your own databases are never
//      touched. If MongoDB is installed on this computer (the course's setup lesson), it uses that one. If not, the
//      first run downloads one into a cache folder, once per computer, as package.json's "config" asks.
//   2. Gives the tests its study_group database (db).
//   3. Before every test, empties the study_group database and makes the unique index on email again (users.js's
//      createUserIndexes), so each test starts with no students.
//   4. After the last test, closes its connection and stops the throwaway MongoDB.
import { before, beforeEach, after } from "node:test";
import { existsSync, readdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { createUserIndexes } from "./users.js";

// The mongod program the course's setup lesson installs, if this computer has it.
function installedMongoDB() {
  if (process.env.MONGOMS_SYSTEM_BINARY) {
    return undefined; // you named one yourself, and mongodb-memory-server uses that
  }
  const places = ["/opt/homebrew/bin/mongod", "/usr/local/bin/mongod", "/usr/bin/mongod"]; // macOS and Linux
  const windows = "C:\Program Files\MongoDB\Server"; // one folder per version, such as 9.0
  if (process.platform === "win32" && existsSync(windows)) {
    const versions = readdirSync(windows).sort((a, b) => parseFloat(b) - parseFloat(a)); // newest first
    places.unshift(...versions.map((version) => `${windows}\${version}\bin\mongod.exe`));
  }
  return places.find((place) => existsSync(place));
}

// Call it once at the top of a test file. It gives back an object whose db is filled in before the first test runs.
export function useThrowawayDatabase() {
  const database = { db: undefined };
  let server;
  let client;

  before(async () => {
    const installed = installedMongoDB();
    server = await MongoMemoryServer.create(installed ? { binary: { systemBinary: installed } } : {});
    client = new MongoClient(server.getUri());
    await client.connect();
    database.db = client.db("study_group");
  });

  beforeEach(async () => {
    await database.db.dropDatabase();
    await createUserIndexes(database.db);
  });

  after(async () => {
    await client?.close();
    await server?.stop();
  });

  return database;
}
