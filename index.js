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

// Simple auth guard for pages that require a logged-in user
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
}

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
    // Check if user is logged in
    if (!req.session?.user?.id) {
      return res.redirect('/login');
    }
    
    const result = await db.query(
      "SELECT id, title, explanation, Kexample, Eexample FROM Grammar WHERE user_id = $1 ORDER BY id DESC",
      [req.session.user.id]
    );
    res.render("grammar.ejs", { grammars: result.rows, total: result.rowCount });
  } catch (err) {
    console.error("Error loading grammar:", err);
    res.render("grammar.ejs", { grammars: [], total: 0 });
  }
});

app.post("/grammar", async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session?.user?.id) {
      return res.redirect('/login');
    }
    
    const { title, explanation, Kexample, Eexample } = req.body;
    if (!title || !explanation || !Kexample || !Eexample) {
      return res.redirect('/grammar?error=validation_error');
    }

    const insertQuery = `
      INSERT INTO Grammar (title, explanation, Kexample, Eexample, user_id)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await db.query(insertQuery, [title, explanation, Kexample, Eexample, req.session.user.id]);
    res.redirect('/grammar');
  } catch (err) {
    console.error('Error inserting grammar:', err);
    res.redirect('/grammar?error=server_error');
  }
});

app.get("/vocabulary", requireAuth, (req, res) => {
  res.render("vocabulary.ejs");
});

app.post("/vocabulary", requireAuth, async (req, res) => {
  try {
    const { word, meaning, meaning_geo } = req.body;
    if (!word || !meaning) {
      return res.status(400).json({ error: 'Word and meaning are required' });
    }

    const insertQuery = `
      INSERT INTO Dictionary (word, meaning, meaning_geo, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const result = await db.query(insertQuery, [word, meaning, meaning_geo || null, req.session.user.id]);
    
    res.json({ 
      success: true, 
      id: result.rows[0].id,
      message: 'Word added to dictionary successfully' 
    });
  } catch (err) {
    console.error('Error inserting vocabulary:', err);
    res.status(500).json({ error: 'Failed to add word to dictionary' });
  }
});

app.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = req.session?.user || null;
    // Get fresh user data from database using session user ID
    const userQuery = await db.query("SELECT username, email FROM Users WHERE id = $1", [user.id]);
    const dbUser = userQuery.rows[0];
    
    if (!dbUser) {
      return res.redirect('/login');
    }
    
    const displayName = (dbUser.username && dbUser.username.trim())
      ? dbUser.username.charAt(0).toUpperCase() + dbUser.username.slice(1)
      : (dbUser.email ? dbUser.email.split('@')[0].charAt(0).toUpperCase() + dbUser.email.split('@')[0].slice(1) : 'User');
    const emailDisplay = dbUser.email || 'No email on file';

    // Get user-specific data
    const todayGrammarQuery = `
      SELECT id, title, explanation
      FROM Grammar
      WHERE user_id = $1 AND created_at::date = CURRENT_DATE
      ORDER BY id DESC
      LIMIT 10
    `;
    const todayVocabQuery = `
      SELECT id, word, meaning, meaning_geo
      FROM Dictionary
      WHERE user_id = $1 AND created_at::date = CURRENT_DATE
      ORDER BY id DESC
      LIMIT 10
    `;
    const weekGrammarQuery = `
      SELECT created_at::date AS day, COUNT(*)::int AS count
      FROM Grammar
      WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY day
      ORDER BY day
    `;
    const weekVocabQuery = `
      SELECT created_at::date AS day, COUNT(*)::int AS count
      FROM Dictionary
      WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY day
      ORDER BY day
    `;

    const [todayGrammarRes, todayVocabRes, weekGrammarRes, weekVocabRes] = await Promise.all([
      db.query(todayGrammarQuery, [user.id]),
      db.query(todayVocabQuery, [user.id]),
      db.query(weekGrammarQuery, [user.id]),
      db.query(weekVocabQuery, [user.id])
    ]);

    const labels = [];
    const grammarCounts = new Array(7).fill(0);
    const vocabCounts = new Array(7).fill(0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const dayIndexMap = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      dayIndexMap.set(key, i);
    }

    (weekGrammarRes.rows || []).forEach(r => {
      const key = new Date(r.day).toISOString().slice(0, 10);
      const idx = dayIndexMap.get(key);
      if (idx !== undefined) grammarCounts[idx] = r.count;
    });
    (weekVocabRes.rows || []).forEach(r => {
      const key = new Date(r.day).toISOString().slice(0, 10);
      const idx = dayIndexMap.get(key);
      if (idx !== undefined) vocabCounts[idx] = r.count;
    });

    const grammarWeekTotal = grammarCounts.reduce((a, b) => a + b, 0);
    const vocabWeekTotal = vocabCounts.reduce((a, b) => a + b, 0);
    const activeDays = grammarCounts.map((c, i) => (c + vocabCounts[i]) > 0 ? 1 : 0).reduce((a, b) => a + b, 0);
    const peak = Math.max(1, ...grammarCounts, ...vocabCounts);

    const achievements = [
      { title: 'First Step', description: 'Add your first item', unlocked: (grammarWeekTotal + vocabWeekTotal) >= 1 },
      { title: 'Daily Learner', description: 'Add items on 3 days this week', unlocked: activeDays >= 3 },
      { title: 'Grammar Guru', description: 'Add 5+ grammar rules in a week', unlocked: grammarWeekTotal >= 5 },
      { title: 'Vocab Voyager', description: 'Add 10+ words in a week', unlocked: vocabWeekTotal >= 10 }
    ];

    res.render('profile.ejs', {
      username: displayName,
      email: emailDisplay,
      user: dbUser,
      todayGrammar: todayGrammarRes.rows || [],
      todayVocab: todayVocabRes.rows || [],
      labels,
      grammarCounts,
      vocabCounts,
      peak,
      grammarWeekTotal,
      vocabWeekTotal,
      activeDays,
      achievements
    });
  } catch (err) {
    console.error('Error rendering profile:', err);
    res.redirect('/login');
  }
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
            req.session.save(() => {
              res.redirect('/home');
            });
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

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.json({ success: true });
  });
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
          const insertRes = await db.query(
            "INSERT INTO Users (username, email, password, administrator, requestNotification) VALUES ($1, $2, $3, false, false) RETURNING id",
            [username, email, hash]
          );
          const newUserId = insertRes.rows?.[0]?.id;
          console.log(`New user registered: ${username}`);
          req.session.user = { id: newUserId, username, email };
          req.session.save(() => {
            res.redirect('/home');
          });
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