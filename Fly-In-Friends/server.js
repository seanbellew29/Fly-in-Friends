const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(cookieParser());

const SECRET = "demo_secret";

// Login → create session cookie
app.post("/login", (req, res) => {
  const token = jwt.sign({ user: "ryan" }, SECRET, { expiresIn: "5m" });
  res.cookie("session", token, { httpOnly: true });
  res.send("Logged in");
});

// Protected route → requires session cookie
app.get("/protected", (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).send("Not logged in");

  try {
    jwt.verify(token, SECRET);
    res.send("You are still logged in");
  } catch {
    res.status(401).send("Session expired or invalid");
  }
});

app.listen(3000, () => console.log("Running on http://localhost:3000"));