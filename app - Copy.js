const express = require("express");
const { exec } = require("child_process");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const axios = require("axios");

require("dotenv").config();

const app = express();
app.use(express.json());

// Hardcoded secret
const API_KEY = "12345-SECRET-KEY";
const SECRET = "secret";

// Shared DB connection (more realistic)
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "test"
});

db.connect();

// ------------------ SQL Injection ------------------
app.get("/user", (req, res) => {
    const id = req.query.id;

    const query = "SELECT * FROM users WHERE id = " + id;

    db.query(query, (err, result) => {
        if (err) return res.send(err);
        res.send(result);
    });
});

// ------------------ Command Injection ------------------
app.get("/ping", (req, res) => {
    const host = req.query.host;

    exec("ping -c 1 " + host, (err, stdout) => {
        res.send(stdout);
    });
});

// ------------------ IDOR ------------------
app.get("/api/user/:id", (req, res) => {
    const userId = req.params.id;

    const query = `SELECT * FROM users WHERE id = ${userId}`;
    db.query(query, (err, result) => {
        res.json(result);
    });
});

// ------------------ Insecure Deserialization ------------------
app.post("/deserialize", (req, res) => {
    const obj = JSON.parse(req.body.data);
    res.send(obj);
});

// ------------------ XSS ------------------
app.get("/search", (req, res) => {
    res.send("<h1>" + req.query.q + "</h1>");
});

// ------------------ HTML Injection ------------------
app.post("/html", (req, res) => {
    const content = req.body.content;
    res.send(`<div>${content}</div>`);
});

// ------------------ JWT Issues ------------------
app.post("/login", (req, res) => {
    const user = { id: 1, role: "user" };

    const token = jwt.sign(user, SECRET, { expiresIn: "365d" });
    res.json({ token });
});

app.get("/admin", (req, res) => {
    const token = req.headers.authorization;

    try {
        const decoded = jwt.decode(token); // ❌ still vulnerable

        if (decoded && decoded.role === "admin") {
            return res.send("Welcome Admin");
        }
    } catch (e) {}

    res.send("Access denied");
});

// ------------------ SQLi (String based) ------------------
app.get("/searchUser", (req, res) => {
    const username = req.query.username;

    const query = `SELECT * FROM users WHERE username = '${username}'`;
    db.query(query, (err, result) => {
        res.json(result);
    });
});

// ------------------ Path Traversal ------------------
app.get("/file", (req, res) => {
    const filename = req.query.name;

    fs.readFile("./files/" + filename, "utf8", (err, data) => {
        res.send(data);
    });
});

// ------------------ SSRF ------------------
app.get("/fetch", async (req, res) => {
    const url = req.query.url;

    try {
        const response = await axios.get(url);
        res.send(response.data);
    } catch (e) {
        res.send("Error");
    }
});

app.listen(3000, () => console.log("Running on 3000"));