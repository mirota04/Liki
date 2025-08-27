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
const ACHIEVEMENT_TEMPLATE_USER_ID = Number(process.env.ACHIEVEMENT_TEMPLATE_USER_ID || 3);

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
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
    const userId = req.session?.user?.id || null;
    const displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : null;

    let achievementsRecent = [];
    let achievementsAll = [];
    let dailyChallenges = null;

    if (userId) {
      const recentQuery = `
        SELECT id, title, description, icon, status
        FROM achievements
        WHERE user_id = $1
        ORDER BY RANDOM()
        LIMIT 3
      `;
      const allQuery = `
        SELECT id, title, description, icon, status
        FROM achievements
        WHERE user_id = $1
        ORDER BY id
      `;
      
      // First check if user has any achievements
      const checkQuery = "SELECT COUNT(*) FROM achievements WHERE user_id = $1";
      const checkResult = await db.query(checkQuery, [userId]);
      const hasAchievements = parseInt(checkResult.rows[0].count) > 0;

      if (!hasAchievements) {
        // Seed achievements for existing user who doesn't have any
        try {
          await db.query(
            `INSERT INTO achievements (title, description, icon, status, user_id)
             SELECT title, description, icon, false AS status, $1 AS user_id
             FROM achievements
             WHERE user_id = $2`,
            [userId, ACHIEVEMENT_TEMPLATE_USER_ID]
          );
          console.log(`Seeded achievements for existing user ${userId}`);
        } catch (seedErr) {
          console.error('Error seeding achievements for existing user:', seedErr);
        }
      }

      // Now fetch achievements
      const [recentRes, allRes] = await Promise.all([
        db.query(recentQuery, [userId]),
        db.query(allQuery, [userId])
      ]);
      achievementsRecent = recentRes.rows || [];
      achievementsAll = allRes.rows || [];

      // Display fallback: if still empty, show template achievements (read-only)
      if ((achievementsAll || []).length === 0) {
        const [tplRecent, tplAll] = await Promise.all([
          db.query(recentQuery, [ACHIEVEMENT_TEMPLATE_USER_ID]),
          db.query(allQuery, [ACHIEVEMENT_TEMPLATE_USER_ID])
        ]);
        achievementsRecent = tplRecent.rows || [];
        achievementsAll = tplAll.rows || [];
      }

      // Fetch daily challenges data for immediate progress wheel display
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const grammarRes = await db.query(
          `SELECT COUNT(*)::int AS count
           FROM Grammar
           WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
          [userId]
        );

        const vocabRes = await db.query(
          `SELECT COUNT(*)::int AS count
           FROM Dictionary
           WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
          [userId]
        );

        const timeRes = await db.query(
          `SELECT COALESCE(active_seconds, 0) AS active_seconds
           FROM User_Activity
           WHERE user_id = $1 AND activity_date = CURRENT_DATE`,
          [userId]
        );

        const grammarToday = grammarRes.rows?.[0]?.count ?? 0;
        const vocabToday = vocabRes.rows?.[0]?.count ?? 0;
        const activeSeconds = timeRes.rows?.[0]?.active_seconds ?? 0;
        const activeHours = activeSeconds / 3600;

        // For now, quiz completion is simulated (you can implement actual quiz tracking later)
        const grammarQuizTaken = false;
        const vocabQuizTaken = false;
        const mixedQuizTaken = false;

        // Calculate daily progress (6 challenges total)
        let completedChallenges = 0;
        if (grammarQuizTaken) completedChallenges++;
        if (vocabQuizTaken) completedChallenges++;
        if (mixedQuizTaken) completedChallenges++;
        if (grammarToday >= 3) completedChallenges++;
        if (vocabToday >= 20) completedChallenges++;
        if (activeHours >= 2) completedChallenges++;

        const dailyProgressPercent = Math.round((completedChallenges / 6) * 100);

        dailyChallenges = {
          grammarQuizTaken,
          vocabQuizTaken,
          mixedQuizTaken,
          grammarToday,
          vocabToday,
          activeHours,
          completedChallenges,
          totalChallenges: 6,
          dailyProgressPercent
        };
      } catch (challengeErr) {
        console.error('Error fetching daily challenges for initial render:', challengeErr);
        dailyChallenges = {
          grammarQuizTaken: false,
          vocabQuizTaken: false,
          mixedQuizTaken: false,
          grammarToday: 0,
          vocabToday: 0,
          activeHours: 0,
          completedChallenges: 0,
          totalChallenges: 6,
          dailyProgressPercent: 0
        };
      }
    }

    res.render("index.ejs", { 
      username: displayName, 
      achievementsRecent, 
      achievementsAll,
      dailyChallenges
    });
  } catch (e) {
    res.render("index.ejs", { 
      username: null, 
      achievementsRecent: [], 
      achievementsAll: [],
      dailyChallenges: {
        grammarQuizTaken: false,
        vocabQuizTaken: false,
        mixedQuizTaken: false,
        grammarToday: 0,
        vocabToday: 0,
        activeHours: 0,
        completedChallenges: 0,
        totalChallenges: 6,
        dailyProgressPercent: 0
      }
    });
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

app.get("/vocabulary", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Fetch 3 random words from user's dictionary
    const randomWordsQuery = `
      SELECT word, meaning, meaning_geo 
      FROM Dictionary 
      WHERE user_id = $1 
      ORDER BY RANDOM() 
      LIMIT 3
    `;
    
    const result = await db.query(randomWordsQuery, [userId]);
    const randomWords = result.rows;
    
    res.render("vocabulary.ejs", { randomWords });
  } catch (err) {
    console.error('Error fetching vocabulary:', err);
    res.render("vocabulary.ejs", { randomWords: [] });
  }
});

// Get all dictionary words for the view all modal
app.get("/api/dictionary", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const query = `
      SELECT word, meaning, meaning_geo, created_at 
      FROM Dictionary 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    res.json({ success: true, words: result.rows });
  } catch (err) {
    console.error('Error fetching dictionary:', err);
    res.status(500).json({ error: 'Failed to fetch dictionary' });
  }
});

app.post("/vocabulary", requireAuth, async (req, res) => {
  try {
    const { word, meaning, meaning_geo } = req.body;
    const userId = req.session.user.id;

    // Check if word already exists for this user
    const checkQuery = "SELECT id FROM Dictionary WHERE word = $1 AND user_id = $2";
    const existingWord = await db.query(checkQuery, [word, userId]);

    if (existingWord.rows.length > 0) {
      return res.status(409).json({ error: 'This word is already in your dictionary' });
    }

    // Insert new word
    const insertQuery = "INSERT INTO Dictionary (word, meaning, meaning_geo, user_id) VALUES ($1, $2, $3, $4) RETURNING id";
    const result = await db.query(insertQuery, [word, meaning, meaning_geo || null, userId]);
    
    res.json({ success: true, id: result.rows[0].id });
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

    // Fetch user achievements from DB
    const userAchievementsRes = await db.query(
      `SELECT title, description, icon, status
       FROM achievements
       WHERE user_id = $1
       ORDER BY id`,
      [user.id]
    );

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
      userAchievements: userAchievementsRes.rows || [],
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

          // Seed achievements for the new user by copying from a template user
          try {
            await db.query(
              `INSERT INTO achievements (title, description, icon, status, user_id)
               SELECT title, description, icon, false AS status, $1 AS user_id
               FROM achievements
               WHERE user_id = $2`,
              [newUserId, ACHIEVEMENT_TEMPLATE_USER_ID]
            );
          } catch (seedErr) {
            console.error('Error seeding achievements for new user:', seedErr);
          }

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

// Heartbeat: track active seconds and update streak
app.post('/api/activity/heartbeat', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const now = new Date();

    // Fetch today's activity row
    const actRes = await db.query(
      `SELECT id, active_seconds, last_heartbeat
       FROM User_Activity
       WHERE user_id = $1 AND activity_date = CURRENT_DATE`,
      [userId]
    );

    let prevSeconds = 0;
    let increment = 30; // default credit per heartbeat

    if (actRes.rows.length > 0) {
      const row = actRes.rows[0];
      prevSeconds = row.active_seconds || 0;
      if (row.last_heartbeat) {
        const last = new Date(row.last_heartbeat);
        const delta = Math.floor((now - last) / 1000);
        // credit bounded delta to avoid double-count across missed timers
        increment = Math.max(0, Math.min(delta, 120));
      }
      await db.query(
        `UPDATE User_Activity
         SET active_seconds = active_seconds + $1,
             last_heartbeat = $2
         WHERE id = $3`,
        [increment, now, row.id]
      );
    } else {
      // Create today's row
      await db.query(
        `INSERT INTO User_Activity (user_id, activity_date, active_seconds, last_heartbeat)
         VALUES ($1, CURRENT_DATE, $2, $3)
         ON CONFLICT (user_id, activity_date)
         DO UPDATE SET active_seconds = User_Activity.active_seconds + EXCLUDED.active_seconds,
                       last_heartbeat = EXCLUDED.last_heartbeat`,
        [userId, increment, now]
      );
    }

    const postRes = await db.query(
      `SELECT active_seconds FROM User_Activity WHERE user_id = $1 AND activity_date = CURRENT_DATE`,
      [userId]
    );
    const activeSeconds = postRes.rows?.[0]?.active_seconds ?? (prevSeconds + increment);

    // Upsert weekly rollup for current week (Monday-based)
    await db.query(
      `INSERT INTO User_Activity_Weekly (user_id, week_start, total_seconds)
       SELECT $1 AS user_id,
              date_trunc('week', CURRENT_DATE)::date AS week_start,
              COALESCE(SUM(active_seconds),0)::int AS total_seconds
       FROM User_Activity
       WHERE user_id = $1
         AND activity_date >= date_trunc('week', CURRENT_DATE)::date
         AND activity_date <= CURRENT_DATE
       ON CONFLICT (user_id, week_start)
       DO UPDATE SET total_seconds = EXCLUDED.total_seconds`,
      [userId]
    );

    // If crossing 60 minutes for the first time today, update streak
    const THRESHOLD = 60 * 60;
    if (prevSeconds < THRESHOLD && activeSeconds >= THRESHOLD) {
      const streakRes = await db.query(
        `SELECT current_streak, last_success_date
         FROM User_Streak WHERE user_id = $1`,
        [userId]
      );
      let currentStreak = streakRes.rows?.[0]?.current_streak ?? 0;
      const lastSuccess = streakRes.rows?.[0]?.last_success_date ? new Date(streakRes.rows[0].last_success_date) : null;

      // Compute day diff in server timezone
      const diffRes = await db.query(`SELECT (CURRENT_DATE - $1::date) AS diff`, [lastSuccess]);
      const diff = lastSuccess ? Number(diffRes.rows[0].diff) : null;

      let nextStreak = 1;
      if (lastSuccess === null) {
        nextStreak = 1;
      } else if (diff <= 3) {
        nextStreak = currentStreak + 1;
      } else {
        nextStreak = 1; // streak died and restarts
      }

      await db.query(
        `UPDATE User_Streak
         SET current_streak = $1,
             last_success_date = CURRENT_DATE,
             updated_at = NOW()
         WHERE user_id = $2`,
        [nextStreak, userId]
      );
    }

    // Return summary
    const streakRow = await db.query(`SELECT current_streak FROM User_Streak WHERE user_id = $1`, [userId]);
    const currentStreak = streakRow.rows?.[0]?.current_streak ?? 0;

    res.json({ success: true, activeSeconds, currentStreak });
  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).json({ error: 'heartbeat_failed' });
  }
});

// Weekly stats: Monday to Monday
app.get('/api/stats/week', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get weekly total from rollup (fast path)
    const weekRes = await db.query(
      `SELECT COALESCE(total_seconds, 0) AS total_seconds
       FROM User_Activity_Weekly
       WHERE user_id = $1
         AND week_start = date_trunc('week', CURRENT_DATE)::date`,
      [userId]
    );
    const totalSeconds = weekRes.rows?.[0]?.total_seconds ?? 0;

    // 7-day daily breakdown (Mon..Sun window aligned to current week)
    const dailyRes = await db.query(
      `SELECT activity_date::date AS date, COALESCE(active_seconds,0)::int AS seconds
       FROM User_Activity
       WHERE user_id = $1
         AND activity_date >= date_trunc('week', CURRENT_DATE)::date
         AND activity_date <  date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days'
       ORDER BY activity_date`,
      [userId]
    );

    res.json({ success: true, totalSeconds, daily: dailyRes.rows || [] });
  } catch (err) {
    console.error('Week stats error:', err);
    res.status(500).json({ error: 'week_stats_failed' });
  }
});

// Streak summary with reset if >3 days gap
app.get('/api/streak', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const stRes = await db.query(
      `SELECT current_streak, last_success_date
       FROM User_Streak WHERE user_id = $1`,
      [userId]
    );
    let currentStreak = stRes.rows?.[0]?.current_streak ?? 0;
    const lastSuccess = stRes.rows?.[0]?.last_success_date ? new Date(stRes.rows[0].last_success_date) : null;

    if (lastSuccess) {
      const diffRes = await db.query(`SELECT (CURRENT_DATE - $1::date) AS diff`, [lastSuccess]);
      const diff = Number(diffRes.rows[0].diff);
      if (diff > 3 && currentStreak !== 0) {
        await db.query(
          `UPDATE User_Streak SET current_streak = 0, updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );
        currentStreak = 0;
      }
    }

    const actRes = await db.query(
      `SELECT COALESCE(active_seconds, 0) AS active_seconds
       FROM User_Activity
       WHERE user_id = $1 AND activity_date = CURRENT_DATE`,
      [userId]
    );
    const activeSeconds = actRes.rows?.[0]?.active_seconds ?? 0;

    res.json({ success: true, currentStreak, activeSeconds });
  } catch (err) {
    console.error('Get streak error:', err);
    res.status(500).json({ error: 'streak_fetch_failed' });
  }
});

// Get unlocked achievements count
app.get('/api/achievements/count', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM achievements
       WHERE user_id = $1 AND status = true`,
      [userId]
    );
    
    const count = parseInt(result.rows[0].count) || 0;
    res.json({ success: true, count });
  } catch (err) {
    console.error('Achievements count error:', err);
    res.status(500).json({ error: 'achievements_count_failed' });
  }
});

// Daily challenges progress
app.get('/api/daily-challenges', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's grammar count
    const grammarRes = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM Grammar
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
      [userId]
    );

    // Get today's vocabulary count
    const vocabRes = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM Dictionary
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
      [userId]
    );

    // Get today's active time
    const timeRes = await db.query(
      `SELECT COALESCE(active_seconds, 0) AS active_seconds
       FROM User_Activity
       WHERE user_id = $1 AND activity_date = CURRENT_DATE`,
      [userId]
    );

    const grammarToday = grammarRes.rows?.[0]?.count ?? 0;
    const vocabToday = vocabRes.rows?.[0]?.count ?? 0;
    const activeSeconds = timeRes.rows?.[0]?.active_seconds ?? 0;
    const activeHours = activeSeconds / 3600;

    // Quiz completion (placeholders until quiz tracking is implemented)
    const grammarQuizCount = 0; // TODO: replace with real count
    const vocabQuizCount = 0;   // TODO: replace with real count
    const mixedQuizCount = 0;   // TODO: replace with real count

    const grammarQuizTaken = grammarQuizCount > 0;
    const vocabQuizTaken = vocabQuizCount > 0;
    const mixedQuizTaken = mixedQuizCount > 0;

    // Calculate daily progress (6 challenges total)
    let completedChallenges = 0;
    if (grammarQuizTaken) completedChallenges++;
    if (vocabQuizTaken) completedChallenges++;
    if (mixedQuizTaken) completedChallenges++;
    if (grammarToday >= 3) completedChallenges++;
    if (vocabToday >= 20) completedChallenges++;
    if (activeHours >= 2) completedChallenges++;

    const dailyProgressPercent = Math.round((completedChallenges / 6) * 100);

    res.json({
      success: true,
      grammarQuizTaken,
      vocabQuizTaken,
      mixedQuizTaken,
      grammarQuizCount,
      vocabQuizCount,
      mixedQuizCount,
      grammarToday,
      vocabToday,
      activeHours,
      completedChallenges,
      totalChallenges: 6,
      dailyProgressPercent
    });
  } catch (err) {
    console.error('Daily challenges error:', err);
    res.status(500).json({ error: 'daily_challenges_failed' });
  }
});

// Weekly content stats (Grammar and Vocabulary) Monday..Sunday
app.get('/api/stats/content-week', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const grammarRes = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM Grammar
       WHERE user_id = $1
         AND created_at >= date_trunc('week', CURRENT_DATE)::date
         AND created_at <  date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days'`,
      [userId]
    );

    const vocabRes = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM Dictionary
       WHERE user_id = $1
         AND created_at >= date_trunc('week', CURRENT_DATE)::date
         AND created_at <  date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days'`,
      [userId]
    );

    const grammarWeekTotal = grammarRes.rows?.[0]?.count ?? 0;
    const vocabWeekTotal = vocabRes.rows?.[0]?.count ?? 0;

    res.json({ success: true, grammarWeekTotal, vocabWeekTotal });
  } catch (err) {
    console.error('Content week stats error:', err);
    res.status(500).json({ error: 'content_week_stats_failed' });
  }
});

// Render Grammar Quiz
app.get('/quiz/grammar', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const qRes = await db.query(
      `SELECT id, title, Eexample
       FROM Grammar
       WHERE user_id = $1
       ORDER BY RANDOM()
       LIMIT 3`,
      [userId]
    );
    const questions = qRes.rows || [];
    res.render('GrammarQuiz.ejs', { questions });
  } catch (err) {
    console.error('Render grammar quiz error:', err);
    res.redirect('/home');
  }
});

// Stub submission endpoint
app.post('/quiz/grammar/submit', requireAuth, async (req, res) => {
  try {
    const answers = req.body?.answers || {};
    // TODO: store attempt and evaluate
    res.json({ success: true });
  } catch (err) {
    console.error('Submit grammar quiz error:', err);
    res.status(500).json({ error: 'submit_failed' });
  }
});

// Update grammar rule
app.put('/grammar/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const id = Number(req.params.id);
    const { title, explanation, Kexample, Eexample } = req.body || {};
    if (!id || !title || !explanation || !Kexample || !Eexample) {
      return res.status(400).json({ error: 'invalid_payload' });
    }
    const result = await db.query(
      `UPDATE Grammar
       SET title = $1,
           explanation = $2,
           Kexample = $3,
           Eexample = $4
       WHERE id = $5 AND user_id = $6`,
      [title, explanation, Kexample, Eexample, id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update grammar error:', err);
    res.status(500).json({ error: 'update_failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});