# Exercise: Study Group Sign-In

Exercise code for the lesson **Exercise: Study Group Sign-In** in the Node.js in Depth course on [ask-codey.com](https://www.ask-codey.com).

Bright Minds Study Group wants students to have accounts. You'll finish the API's three routes in `app.js`: sign-up, which saves a bcrypt hash of the password and refuses an email that's taken, sign-in, which checks the password and hands back a token (JWT) that lasts an hour, and `/me`, which answers with the student the token belongs to. Tests check every answer, with a throwaway MongoDB.

## What's here

- `app.js`: `createApp(db)`, which builds the Express app and its routes around the database it's given, and `sendProblem`, the course's one error shape (ready to use). For now the app answers every request with a 404 that says it isn't built yet. The comment at the top lists every request it should answer, and how. For you to finish.
- `users.js`: the students, kept in MongoDB's `users` collection. `createUsersRepository(db)` gives back `addUser`, `findUserByEmail` and `findUserById`, and `createUserIndexes(db)` makes the unique index on `email`. Ready to use.
- `server.js`: connects to MongoDB once, hands the database to `createApp(db)` and starts the API at `http://localhost:3100`. Ready to use.
- `.env.example`: the two settings the server reads, `MONGODB_URI` and `JWT_SECRET`. Copy it to `.env` (below).
- `study-group.insomnia.json`: the requests to try, as an Insomnia collection. Ready to use.
- `app.test.js`: tests that send requests to your app with Supertest and check each answer. You don't need to change this file.
- `throwaway-database.js`: starts the throwaway MongoDB the tests hand to `createApp(db)`. You don't need to read or change it.
- `package.json` and `package-lock.json`: the project's settings, its scripts (`start`, `dev` and `test`) and its packages at exact versions: Express, bcryptjs, jsonwebtoken and the MongoDB driver, with Supertest and mongodb-memory-server for the tests. Ready to use.

## Before you start

In VS Code's terminal, in this folder, install the packages:

```bash
npm install
```

It makes a `node_modules` folder. That folder is in `.gitignore`, so Git leaves it out: `npm install` makes it again on any computer.

To run the server yourself (the tests don't need this), copy `.env.example` to a new file named `.env`, and replace `<your-secret>` with a long random text of your own. This command prints one:

```bash
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

`.env` is in `.gitignore` too: a secret never goes on GitHub.

## Run it

MongoDB must be running on your computer (the course's setup lesson installs it). Then:

```bash
npm start
```

The terminal says `The study group's API is listening on http://localhost:3100` and keeps running. In Insomnia, click **Import** in your `Node.js in Depth` project, choose `study-group.insomnia.json`, and send each request, from the top down: the `/me` request uses the token from the sign-in above it. Stop the server with **Ctrl+C**.

`npm run dev` starts it with `node --watch`, so it restarts each time you save `app.js`.

## Check your work

```bash
npm test
```

No server needs to be running, and you don't need `.env`: the tests start their own throwaway MongoDB and use a test secret. At first every test fails: that is expected. Each route you finish turns its tests green. A failing test's message says what it sent and what it expected, for example *POST /auth/sign-up for Maya should answer 201, but it answered 404 with {"message":"Not built yet."}.*

If you installed MongoDB on your computer in the course's setup lesson, the tests use it. If you didn't, the first `npm test` downloads MongoDB 9.0.8 for the tests (nearly 1 GB on Windows, about 180 MB on a Mac) and keeps it for every exercise after this one.

## The rules

- Save passwords only as a bcrypt hash made with `bcrypt.hash(password, 10)`, through `addUser`. Never save, send or log the password or its hash.
- Answer an email that's taken with 409, using what `addUser` gives back, and answer every sign-in mistake with the same 401 and detail.
- Send every error with `sendProblem(res, status, detail)`, so each one has the course's one shape: `{ status, title, detail }`.
- Sign tokens with `process.env.JWT_SECRET`, read inside the routes, and make them expire in one hour. Never write a secret in the code.
- Don't change `users.js`, `server.js` or the tests.

## Tips

- Trim and lowercase the email, with `email.trim().toLowerCase()`, before you save it and before you look it up.
- Inside `createApp`, the repository is `users`: call `users.addUser`, `users.findUserByEmail` and `users.findUserById`.
- `addUser` gives back `null` when the email already has an account: that's your 409.
- `bcrypt.compare(password, user.passwordHash)` answers `true` or `false`, and it needs `await`.
- `jwt.sign({ sub: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: "1h" })` makes the token.
- For `/me`, `req.get("Authorization")` reads the header, `split(" ")` separates the word `Bearer` from the token, and `jwt.verify` throws for a bad token, so put it in a `try`.
- Answer with `{ id, name, email }` built from the user, never the user itself: it holds `passwordHash`.

## Hand it in

When it works, push your solution to a public repo of your own on GitHub, then paste that repo's address into **Submit your exercise** on the lesson page at [ask-codey.com](https://www.ask-codey.com). That's what completes the lesson. The lesson page shows the Git commands, step by step.
