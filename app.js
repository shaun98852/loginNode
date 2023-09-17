const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//API 1
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const sql = `SELECT * FROM user
                WHERE username='${username}';`;
  const userPresentOrNot = await db.get(sql);
  if (userPresentOrNot !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const encryptPassword = await bcrypt.hash(password, 10);

    const sqlQuery = `INSERT INTO
                        user(username,name,password,gender,location)
                        VALUES
                            ( '${username}',
                            '${name}',
                            '${encryptPassword}',
                            '${gender}',
                            '${location}');`;

    const createUser = await db.run(sqlQuery);
    response.status(200);
    response.send("User created successfully");
  }
});

//API 2

app.post("/logins", async (request, response) => {
  const { username, password } = request.body;
  const usernameSql = `SELECT * FROM user WHERE username='${username}';`;
  const usernamePresentOrNot = await db.get(usernameSql);

  if (usernamePresentOrNot === undefined) {
    //unregistered User
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispasswordMatched = await bcrypt.compare(
      password,
      usernamePresentOrNot.password
    );
    if (ispasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.status(200);
      response.send({ jwt_token: jwtToken });
      //   response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//change Password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const searchUser = `SELECT * FROM user WHERE
  username='${username}';`;
  const user = await db.get(searchUser);
  if (user === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const correctOrWrongPassword = await bcrypt.compare(
      oldPassword,
      user.password
    );
    if (correctOrWrongPassword === false) {
      response.status(400);
      response.send("Invalid current password");
    } else {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const newEncriptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordSql = `UPDATE user 
                                    SET 
                                    password='${newEncriptedPassword}'
                                    WHERE username='${username}';`;

        await db.run(updatePasswordSql);
        response.status(200);
        response.send("Password updated");
      }
    }
  }
});

module.exports = app;
