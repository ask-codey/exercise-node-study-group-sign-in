// The study group's students, kept in MongoDB's users collection. Ready to use: you don't need to change this file.
//
// createUserIndexes(db)      makes the unique index on email, so MongoDB refuses a second student with the same
//                            email. It's safe to run again: server.js runs it once at startup, and the tests before
//                            each test.
// createUsersRepository(db)  gives back an object with three functions for the users collection. Every user they
//                            give back is a plain object, { id, name, email, passwordHash }, with the id as text, or
//                            null:
//
//   addUser({ name, email, passwordHash })   saves a new student and gives them back with their new id, or gives
//                                            back null when the email already has an account
//   findUserByEmail(email)                   the student with exactly this email, or null
//   findUserById(id)                         the student with this id, or null (an id that isn't one gives null too)
import { ObjectId } from "mongodb";

export async function createUserIndexes(db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
}

function toUser(doc) {
  if (doc === null) {
    return null;
  }
  return { id: doc._id.toString(), name: doc.name, email: doc.email, passwordHash: doc.passwordHash };
}

export function createUsersRepository(db) {
  const users = db.collection("users");

  return {
    // The unique index refuses a taken email with MongoDB's error code 11000, and that becomes null.
    async addUser({ name, email, passwordHash }) {
      try {
        const result = await users.insertOne({ name, email, passwordHash });
        return { id: result.insertedId.toString(), name, email, passwordHash };
      } catch (error) {
        if (error.code === 11000) {
          return null;
        }
        throw error;
      }
    },

    async findUserByEmail(email) {
      return toUser(await users.findOne({ email }));
    },

    async findUserById(id) {
      if (!ObjectId.isValid(id)) {
        return null;
      }
      return toUser(await users.findOne({ _id: new ObjectId(id) }));
    },
  };
}
