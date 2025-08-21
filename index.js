import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import bcrypt from 'bcrypt';
import env from 'dotenv';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import session from 'express-session';

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

const Korean_API_KEY = process.env.KOREAN_API_KEY;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.get("/", (req, res) => {
  res.render("login.ejs");
});

app.get("/home", async (req, res) => {
  try {
    const username = req.session?.user?.username || null;
    const displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : null;
    res.render("index.ejs", { username: displayName });
  } catch (e) {
    res.render("index.ejs", { username: null });
  }
});

app.get("/grammar", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, title, explanation, Kexample, Eexample FROM Grammar ORDER BY id DESC"
    );
    res.render("grammar.ejs", { grammars: result.rows, total: result.rowCount });
  } catch (err) {
    console.error("Error loading grammar:", err);
    res.render("grammar.ejs", { grammars: [], total: 0 });
  }
});

app.post("/grammar", async (req, res) => {
  try {
    const { title, explanation, Kexample, Eexample } = req.body;
    if (!title || !explanation || !Kexample || !Eexample) {
      return res.redirect('/grammar?error=validation_error');
    }

    const insertQuery = `
      INSERT INTO Grammar (title, explanation, Kexample, Eexample)
      VALUES ($1, $2, $3, $4)
    `;
    await db.query(insertQuery, [title, explanation, Kexample, Eexample]);
    res.redirect('/grammar');
  } catch (err) {
    console.error('Error inserting grammar:', err);
    res.redirect('/grammar?error=server_error');
  }
});

app.get("/vocabulary", (req, res) => {
  res.render("vocabulary.ejs");
});

// Proxy to KRDict API (server-side fetch)
app.get("/api/translate", async (req, res) => {
  const word = req.query.word;
  const apiKey = process.env.KRDICT_API_KEY || process.env.KOREAN_API_KEY || process.env.API_KEY;
  if (!word) return res.status(400).json({ error: 'word is required' });
  if (!apiKey) return res.status(500).json({ error: 'API key missing. Set KRDICT_API_KEY (or KOREAN_API_KEY) in .env' });

  try {
    const url = `https://krdict.korean.go.kr/api/search?key=${apiKey}&type_search=search&part=word&q=${encodeURIComponent(word)}&translated=y&trans_lang=1`;
    const response = await axios.get(url);
    const json = await parseStringPromise(response.data);
    const channel = json?.channel || {};
    const item = channel.item?.[0];
    if (!item) return res.json({ error: 'No results found' });

    const koreanWord = item.word?.[0] ?? '';
    const englishDef = item.sense?.[0]?.translation?.[0]?.trans_word?.[0] ?? '';
    const koreanDef = item.sense?.[0]?.definition?.[0] ?? '';
    const englishExplanation = item.sense?.[0]?.translation?.[0]?.trans_dfn?.[0] ?? '';

    res.json({
      koreanWord,
      englishWord: englishDef,
      koreanDef,
      englishExplanation
    });
  } catch (err) {
    console.error('KRDict error:', err.response?.status, err.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get("/login", async (req, res) => {
  if (req.session?.user) {
    const name = req.session.user.username || '';
    const displayName = name ? name.charAt(0).toUpperCase() + name.slice(1) : null;
    return res.render("index.ejs", { username: displayName });
  }
  res.render("login.ejs");
});

// Login POST route with database authentication
app.post("/login", async (req, res) => {
  const email = req.body.email || req.body.username;
  const password = req.body.password;

  try {
    const result = await db.query("SELECT * FROM Users WHERE email = $1 OR username = $1", [email]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      
      // Verifying the password
      bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          res.redirect('/login?error=server_error');
        } else {
          if (result) {
            console.log(`User ${user.username || user.email} logged in successfully`);
            req.session.user = { id: user.id, username: user.username, email: user.email };
            const rawName = user.username || user.email || '';
            const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : null;
            res.render("index.ejs", { username: displayName });
          } else {
            res.redirect('/login?error=incorrect_password');
          }
        }
      });
    } else {
      res.redirect('/login?error=user_not_found');
    }
  } catch (err) {
    console.log(err);
    res.redirect('/login?error=server_error');
  }
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// Registration POST route
app.post("/register", async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM Users WHERE email = $1 OR username = $2", [email, username]);

    if (checkResult.rows.length > 0) {
      res.redirect('/register?error=user_exists');
    } else {
      // Hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          res.redirect('/register?error=server_error');
        } else {
          await db.query(
            "INSERT INTO Users (username, email, password, administrator, requestNotification) VALUES ($1, $2, $3, false, false)",
            [username, email, hash]
          );
          console.log(`New user registered: ${username}`);
          res.render("index.ejs");
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.redirect('/register?error=server_error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});