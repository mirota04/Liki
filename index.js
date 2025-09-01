import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import bcrypt from 'bcrypt';
import env from 'dotenv';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import session from 'express-session';

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
env.config();

const Korean_API_KEY = process.env.KOREAN_API_KEY;
const OPEN_API_KEY = process.env.OPENAI_API_KEY;

// Generate five English examples via OpenAI GPT 5 nano
async function generateEnglishExamplesWithGPT(title, englishExample) {
  if (!OPEN_API_KEY) {
    console.error('OpenAI API key missing. Set OPEN_API_KEY in your .env (or OPENAI_API_KEY).');
    return null;
  }
  try {
    const prompt = `Generate 5 English example sentences for Korean grammar rule "${title}".\n` +
      `Base example: ${englishExample}\n` +
      `Rules: One sentence per line, no numbering, keep under 10 words each. Just write the sentences and nothing else.`;

    const resp = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: 'gpt-5-nano',
        input: prompt,
        max_output_tokens: 2000,
        reasoning: { effort: 'low' },
        text: { verbosity: 'low' }
      },
      {
        headers: {
          Authorization: `Bearer ${OPEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    // ✅ Correct way to extract text from Responses API
    // Look for message type output with text content
    let content = '';
    for (const output of resp.data.output || []) {
      if (output.type === 'message' && output.content?.[0]?.text) {
        content = output.content[0].text;
        break;
      }
    }

    if (!content.trim()) {
      console.warn('OpenAI returned empty content:', JSON.stringify(resp.data, null, 2));
      return null;
    }

    const lines = content
      .split(/\r?\n/)
      .map(s => s.replace(/^[\-\*\d\.\s]+/, '').trim())
      .filter(Boolean);

    const examples = lines.slice(0, 5);

    console.log('GPT examples generation result:', examples);

    return examples.length === 5 ? examples : null;

  } catch (err) {
    console.error('OpenAI example generation failed:', err.response?.data || err.message);
    return null;
  }
}

// Generate grammar feedback via OpenAI GPT 5 nano
async function generateGrammarFeedbackWithGPT(prompt, maxTokens = 2000) {
  if (!OPEN_API_KEY) {
    console.error('OpenAI API key missing. Set OPENAI_API_KEY in your .env file.');
    return null;
  }
  try {
    		const resp = await axios.post(
			'https://api.openai.com/v1/responses',
			{
				model: 'gpt-5-nano',
				input: prompt,
				max_output_tokens: maxTokens,
				reasoning: { effort: 'low' },
				text: { verbosity: 'low' }
			},
      {
        headers: {
          Authorization: `Bearer ${OPEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    // Extract text from Responses API
    let content = '';
    for (const output of resp.data.output || []) {
      if (output.type === 'message' && output.content?.[0]?.text) {
        content = output.content[0].text;
        break;
      }
    }

    if (!content.trim()) {
      console.warn('OpenAI returned empty content for grammar feedback:', JSON.stringify(resp.data, null, 2));
      return null;
    }

    console.log('GPT grammar feedback generated successfully');
    return content.trim();

  } catch (err) {
    console.error('OpenAI grammar feedback generation failed:', err.response?.data || err.message);
    return null;
  }
}

// Check and unlock grammar achievements based on answered questions
async function checkGrammarAchievements(userId) {
  try {
    // Count how many grammar rules the user has answered (asked = true)
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM Grammar WHERE user_id = $1 AND asked = true',
      [userId]
    );
    
    const answeredCount = parseInt(countResult.rows[0].count);
    
    // Check for Grammar Junior achievement (30 answered questions)
    if (answeredCount >= 30) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Grammar Junior']
      );
      console.log(`User ${userId} unlocked Grammar Junior achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
    // Check for Grammar Master achievement (70 answered questions)
    if (answeredCount >= 70) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Grammar Master']
      );
      console.log(`User ${userId} unlocked Grammar Master achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking grammar achievements:', err);
  }
}

// Check and unlock vocabulary achievements based on answered questions
async function checkVocabularyAchievements(userId) {
  try {
    // Count how many vocabulary words the user has answered (asked = true)
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM Dictionary WHERE user_id = $1 AND asked = true',
      [userId]
    );
    
    const answeredCount = parseInt(countResult.rows[0].count);
    
    // Check for Vocabulary Junior achievement (70 answered questions)
    if (answeredCount >= 70) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Vocabulary Junior']
      );
      console.log(`User ${userId} unlocked Vocabulary Junior achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
    // Check for Vocabulary Master achievement (150 answered questions)
    if (answeredCount >= 150) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Vocabulary Master']
      );
      console.log(`User ${userId} unlocked Vocabulary Master achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking vocabulary achievements:', err);
  }
}

// Check and unlock streak-based achievements
async function checkStreakAchievements(userId) {
  try {
    // Get current streak from User_Streak table
    const streakResult = await db.query(
      'SELECT current_streak FROM User_Streak WHERE user_id = $1',
      [userId]
    );
    
    const currentStreak = parseInt(streakResult.rows?.[0]?.current_streak || 0);
    
    // Check for Consistent Learner achievement (15 day streak)
    if (currentStreak >= 15) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Consistent Learner']
      );
      console.log(`User ${userId} unlocked Consistent Learner achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
    // Check for Dedication achievement (30 day streak)
    if (currentStreak >= 30) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Dedication']
      );
      console.log(`User ${userId} unlocked Dedication achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking streak achievements:', err);
  }
}

// Check and unlock builder achievements based on total items
async function checkBuilderAchievements(userId) {
  try {
    // Count total grammar rules for the user
    const grammarCountResult = await db.query(
      'SELECT COUNT(*) as count FROM Grammar WHERE user_id = $1',
      [userId]
    );
    const totalGrammar = parseInt(grammarCountResult.rows[0].count);
    
    // Count total vocabulary words for the user
    const vocabCountResult = await db.query(
      'SELECT COUNT(*) as count FROM Dictionary WHERE user_id = $1',
      [userId]
    );
    const totalVocab = parseInt(vocabCountResult.rows[0].count);
    
    // Check for Grammar Builder achievement (80+ total grammar rules)
    if (totalGrammar >= 80) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Grammar Builder']
      );
      console.log(`User ${userId} unlocked Grammar Builder achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
    // Check for Vocabulary Builder achievement (300+ total words)
    if (totalVocab >= 300) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Vocabulary Builder']
      );
      console.log(`User ${userId} unlocked Vocabulary Builder achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking builder achievements:', err);
  }
}

// Check and unlock Fast Learner achievement based on daily challenge completions
async function checkFastLearnerAchievement(userId) {
  try {
    // Get current_number from Daily_Challenges table
    const challengeResult = await db.query(
      'SELECT current_number FROM Daily_Challenges WHERE user_id = $1',
      [userId]
    );
    
    const currentNumber = parseInt(challengeResult.rows?.[0]?.current_number || 0);
    
    // Check for Fast Learner achievement (7+ daily challenges at 100%)
    if (currentNumber >= 7) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Fast Learner']
      );
      console.log(`User ${userId} unlocked Fast Learner achievement!`);
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking Fast Learner achievement:', err);
  }
}

// Check and update daily challenges completion
async function checkDailyChallengesCompletion(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check all 6 daily challenge requirements
    const [
      grammarQuizRes,
      vocabQuizRes,
      mixedQuizRes,
      grammarCountRes,
      vocabCountRes,
      timeRes
    ] = await Promise.all([
      // 1. Daily Grammar Quiz completed
      db.query(
        'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
        [userId, 'grammar', today]
      ),
      // 2. Daily Vocabulary Quiz completed
      db.query(
        'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
        [userId, 'vocabulary', today]
      ),
      // 3. 1/1/1 Quiz completed
      db.query(
        'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
        [userId, 'mixed', today]
      ),
      // 4. 3+ Grammar Rules added today
      db.query(
        'SELECT COUNT(*) as count FROM Grammar WHERE user_id = $1 AND created_at::date = $2',
        [userId, today]
      ),
      // 5. 20+ Words added today
      db.query(
        'SELECT COUNT(*) as count FROM Dictionary WHERE user_id = $1 AND created_at::date = $2',
        [userId, today]
      ),
      // 6. 2+ hours spent today
      db.query(
        'SELECT active_seconds FROM User_Activity WHERE user_id = $1 AND activity_date = $2',
        [userId, today]
      )
    ]);
    
    // Check if all challenges are completed
    const grammarQuizCompleted = grammarQuizRes.rows.length > 0;
    const vocabQuizCompleted = vocabQuizRes.rows.length > 0;
    const mixedQuizCompleted = mixedQuizRes.rows.length > 0;
    const grammarCount = parseInt(grammarCountRes.rows[0]?.count || 0);
    const vocabCount = parseInt(vocabCountRes.rows[0]?.count || 0);
    const activeSeconds = parseInt(timeRes.rows[0]?.active_seconds || 0);
    const activeHours = activeSeconds / 3600;
    
    // All 6 challenges completed (100% daily completion)
    if (grammarQuizCompleted && vocabQuizCompleted && mixedQuizCompleted && 
        grammarCount >= 3 && vocabCount >= 20 && activeHours >= 2) {
      
      // Get or create Daily_Challenges record
      let challengeRecord = await db.query(
        'SELECT id, current_number FROM Daily_Challenges WHERE user_id = $1',
        [userId]
      );
      
      if (challengeRecord.rows.length === 0) {
        // Create new record
        await db.query(
          'INSERT INTO Daily_Challenges (user_id, current_number) VALUES ($1, 1)',
          [userId]
        );
        console.log(`User ${userId} completed first daily challenge!`);
      } else {
        // Increment existing record
        const currentNumber = parseInt(challengeRecord.rows[0].current_number || 0);
        await db.query(
          'UPDATE Daily_Challenges SET current_number = $1 WHERE user_id = $2',
          [currentNumber + 1, userId]
        );
        console.log(`User ${userId} completed daily challenge! Total: ${currentNumber + 1}`);
      }
      
      // Check for Fast Learner achievement
      await checkFastLearnerAchievement(userId);
      
      // Check for YOU ARE READY achievement
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking daily challenges completion:', err);
  }
}

// Check and unlock On Fire achievement based on daily vocabulary additions
async function checkOnFireAchievement(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Count how many words the user added today
    const vocabCountResult = await db.query(
      'SELECT COUNT(*) as count FROM Dictionary WHERE user_id = $1 AND created_at::date = $2',
      [userId, today]
    );
    
    const todayVocabCount = parseInt(vocabCountResult.rows[0]?.count || 0);
    
    // Check for On Fire achievement (50+ words added today)
    if (todayVocabCount >= 50) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'On Fire']
      );
      console.log(`User ${userId} unlocked On Fire achievement! Added ${todayVocabCount} words today!`);
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking On Fire achievement:', err);
  }
}

// Check and unlock quiz-based achievements
async function checkQuizAchievements(userId) {
  try {
    // Get current quiz count from Quiz_Count table
    const quizCountResult = await db.query(
      'SELECT count FROM Quiz_Count WHERE user_id = $1',
      [userId]
    );
    
    const quizCount = parseInt(quizCountResult.rows?.[0]?.count || 0);
    
    // Check for Quiz Junior achievement (50+ quizzes completed)
    if (quizCount >= 50) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Quiz Junior']
      );
      console.log(`User ${userId} unlocked Quiz Junior achievement! Completed ${quizCount} quizzes!`);
      await checkYouAreReadyAchievement(userId);
    }
    
    // Check for Quiz Master achievement (100+ quizzes completed)
    if (quizCount >= 100) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'Quiz Master']
      );
      console.log(`User ${userId} unlocked Quiz Master achievement! Completed ${quizCount} quizzes!`);
      await checkYouAreReadyAchievement(userId);
    }
    
  } catch (err) {
    console.error('Error checking quiz achievements:', err);
  }
}

// Increment quiz count for a user
async function incrementQuizCount(userId) {
  try {
    // Get or create Quiz_Count record
    let quizCountRecord = await db.query(
      'SELECT id, count FROM Quiz_Count WHERE user_id = $1',
      [userId]
    );
    
    if (quizCountRecord.rows.length === 0) {
      // Create new record
      await db.query(
        'INSERT INTO Quiz_Count (user_id, count) VALUES ($1, 1)',
        [userId]
      );
      console.log(`User ${userId} completed first quiz! Total: 1`);
    } else {
      // Increment existing record
      const currentCount = parseInt(quizCountRecord.rows[0].count || 0);
      await db.query(
        'UPDATE Quiz_Count SET count = $1 WHERE user_id = $2',
        [currentCount + 1, userId]
      );
      console.log(`User ${userId} completed quiz! Total: ${currentCount + 1}`);
    }
    
    // Check for quiz achievements after incrementing
    await checkQuizAchievements(userId);
    
  } catch (err) {
    console.error('Error incrementing quiz count:', err);
  }
}

// Check and unlock Impossible achievement for perfect general quiz (words mode)
async function checkImpossibleAchievement(userId, quizType, answers, totalQuestions) {
  try {
    // Only check for general quiz in words mode
    if (quizType !== 'general-words') {
      return;
    }
    
    // Check if all 100 questions were answered correctly
    if (answers && Object.keys(answers).length === totalQuestions) {
      // Count how many answers are correct
      let correctCount = 0;
      
      for (const [questionId, userAnswer] of Object.entries(answers)) {
        // Get the correct answer from the database
        const wordResult = await db.query(
          'SELECT word, meaning FROM Dictionary WHERE id = $1 AND user_id = $2',
          [questionId, userId]
        );
        
        if (wordResult.rows.length > 0) {
          const word = wordResult.rows[0];
          // Check if answer is correct (using fuzzy matching)
          const isCorrect = checkVocabularyAnswer(userAnswer, word.meaning, word.word);
          if (isCorrect) {
            correctCount++;
          }
        }
      }
      
      // If all 100 questions are correct, unlock Impossible achievement
      if (correctCount === totalQuestions && totalQuestions >= 100) {
        await db.query(
          'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
          [userId, 'Impossible']
        );
        console.log(`User ${userId} unlocked Impossible achievement! Perfect score on general quiz: ${correctCount}/${totalQuestions}!`);
        await checkYouAreReadyAchievement(userId);
      }
    }
    
  } catch (err) {
    console.error('Error checking Impossible achievement:', err);
  }
}

// Submit general quiz results and check achievements
app.post('/api/general/submit', requireAuth, async (req, res) => {
  try {
    const { quizType, answers, totalQuestions } = req.body;
    const userId = req.session.user.id;
    
    // Check for Impossible achievement (perfect score on general words quiz)
    if (quizType === 'words') {
      await checkImpossibleAchievement(userId, 'general-words', answers, totalQuestions);
    }
    
    // Increment quiz count for general quiz completion
    await incrementQuizCount(userId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Submit general quiz error:', err);
    res.status(500).json({ error: 'submit_failed' });
  }
});

// Check and unlock YOU ARE READY achievement (all achievements + all items asked = true)
async function checkYouAreReadyAchievement(userId) {
  try {
    // First check if all achievements are unlocked
    const achievementsResult = await db.query(
      'SELECT title FROM Achievements WHERE user_id = $1 AND status = true',
      [userId]
    );
    
    const unlockedAchievements = achievementsResult.rows.map(row => row.title);
    
    // Check if all required achievements are unlocked
    const requiredAchievements = [
      'Grammar Junior',
      'Grammar Master', 
      'Vocabulary Junior',
      'Vocabulary Master',
      'Consistent Learner',
      'Dedication',
      'Grammar Builder',
      'Vocabulary Builder',
      'Fast Learner',
      'On Fire',
      'Quiz Junior',
      'Quiz Master',
      'Impossible'
    ];
    
    const allAchievementsUnlocked = requiredAchievements.every(achievement => 
      unlockedAchievements.includes(achievement)
    );
    
    if (!allAchievementsUnlocked) {
      return; // Not all achievements unlocked yet
    }
    
    // Check if all grammar rules have asked = true
    const grammarResult = await db.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN asked = true THEN 1 END) as asked FROM Grammar WHERE user_id = $1',
      [userId]
    );
    
    const totalGrammar = parseInt(grammarResult.rows[0].total);
    const askedGrammar = parseInt(grammarResult.rows[0].asked);
    const allGrammarAsked = totalGrammar > 0 && totalGrammar === askedGrammar;
    
    // Check if all vocabulary words have asked = true
    const vocabResult = await db.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN asked = true THEN 1 END) as asked FROM Dictionary WHERE user_id = $1',
      [userId]
    );
    
    const totalVocab = parseInt(vocabResult.rows[0].total);
    const askedVocab = parseInt(vocabResult.rows[0].asked);
    const allVocabAsked = totalVocab > 0 && totalVocab === askedVocab;
    
    // If all achievements unlocked AND all items asked = true, unlock YOU ARE READY
    if (allAchievementsUnlocked && allGrammarAsked && allVocabAsked) {
      await db.query(
        'UPDATE Achievements SET status = true WHERE user_id = $1 AND title = $2',
        [userId, 'YOU ARE READY']
      );
      console.log(`🎉 User ${userId} unlocked YOU ARE READY achievement! All achievements unlocked and all items completed! 🎉`);
    }
    
  } catch (err) {
    console.error('Error checking YOU ARE READY achievement:', err);
  }
}

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

// Database connection configuration
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL for Heroku/Neon production
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // Use individual environment variables for local development
  dbConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT || 5432,
  };
}

const db = new pg.Client(dbConfig);

db.connect()
  .then(() => {
    console.log(' Database connected successfully!');
    if (process.env.DATABASE_URL) {
      console.log(' Using production database (Neon/Heroku)');
    } else {
      console.log(' Using local database');
    }
  })
  .catch(err => {
    console.error(' Database connection failed:', err);
    process.exit(1);
  });

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
      // Check for achievements before fetching them
      await checkGrammarAchievements(userId);
      await checkVocabularyAchievements(userId);
      await checkStreakAchievements(userId);
      await checkBuilderAchievements(userId);
      await checkFastLearnerAchievement(userId);
      await checkOnFireAchievement(userId);
      await checkQuizAchievements(userId);
      
      // Check daily challenges completion
      await checkDailyChallengesCompletion(userId);
      
      // Check for YOU ARE READY achievement (all achievements + all items asked = true)
      await checkYouAreReadyAchievement(userId);
      
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

        // Check quiz completion status from database using user's timezone
        const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const grammarQuizRes = await db.query(
          'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
          [userId, 'grammar', todayDate]
        );
        const vocabQuizRes = await db.query(
          'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
          [userId, 'vocabulary', todayDate]
        );
        const mixedQuizRes = await db.query(
          'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
          [userId, 'mixed', todayDate]
        );

        const grammarQuizTaken = grammarQuizRes.rows.length > 0;
        const vocabQuizTaken = vocabQuizRes.rows.length > 0;
        const mixedQuizTaken = mixedQuizRes.rows.length > 0;

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
      RETURNING id
    `;
    const ins = await db.query(insertQuery, [title, explanation, Kexample, Eexample, req.session.user.id]);
    const newId = ins.rows?.[0]?.id;

    // Generate examples with GPT 5 nano and store in Examples table
    if (newId) {
      try {
        const generated = await generateEnglishExamplesWithGPT(title, Eexample);
        console.log('Generated examples for grammar id', newId, generated);
        if (generated && generated.length === 5) {
          // Delete-then-insert since Examples.id doesn't have a unique constraint
          await db.query(`DELETE FROM Examples WHERE id = $1`, [newId]);
          await db.query(
            `INSERT INTO Examples (id, example1, example2, example3, example4, example5)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newId, generated[0], generated[1], generated[2], generated[3], generated[4]]
          );
        } else {
          console.warn('No valid examples generated; skipping DB insert');
        }
      } catch (genErr) {
        console.error('Failed to store generated examples:', genErr);
      }
    }

    // Check for builder achievements after adding new grammar rule
    await checkBuilderAchievements(req.session.user.id);
    
    // Check for YOU ARE READY achievement
    await checkYouAreReadyAchievement(req.session.user.id);

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
    
    // Check for builder achievements after adding new vocabulary word
    await checkBuilderAchievements(userId);
    
    // Check for On Fire achievement after adding new vocabulary word
    await checkOnFireAchievement(userId);
    
    // Check for YOU ARE READY achievement
    await checkYouAreReadyAchievement(userId);
    
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

    // Check for achievements before fetching them
    await checkGrammarAchievements(user.id);
    await checkVocabularyAchievements(user.id);
    await checkStreakAchievements(user.id);
    await checkBuilderAchievements(user.id);
    await checkFastLearnerAchievement(user.id);
    await checkOnFireAchievement(user.id);
    await checkQuizAchievements(user.id);
    
    // Check daily challenges completion
    await checkDailyChallengesCompletion(user.id);
    
    // Check for YOU ARE READY achievement (all achievements + all items asked = true)
    await checkYouAreReadyAchievement(user.id);
    
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
    
    // Create labels from Monday to Sunday (more logical order)
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      // Get Monday of current week and add days
      const dayOfWeek = d.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, so we need -6
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      labels.push(currentDay.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const dayIndexMap = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      const dayOfWeek = d.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      const key = currentDay.toISOString().slice(0, 10);
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
    
    // Debug logging
    console.log('Profile chart data:', {
      labels,
      grammarCounts,
      vocabCounts,
      peak,
      activeDays
    });

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
      
      // Check for streak-based achievements
      await checkStreakAchievements(userId);
      
      // Check for YOU ARE READY achievement
      await checkYouAreReadyAchievement(userId);
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
        
        // Check for streak-based achievements (even when resetting, in case user had achievements)
        await checkStreakAchievements(userId);
        
        // Check for YOU ARE READY achievement
        await checkYouAreReadyAchievement(userId);
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
       FROM Achievements
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

    // Check quiz completion status from database using user's timezone
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const grammarQuizRes = await db.query(
      'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
      [userId, 'grammar', todayDate]
    );
    const vocabQuizRes = await db.query(
      'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
      [userId, 'vocabulary', todayDate]
    );
    const mixedQuizRes = await db.query(
      'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
      [userId, 'mixed', todayDate]
    );

    const grammarQuizCount = grammarQuizRes.rows.length;
    const vocabQuizCount = vocabQuizRes.rows.length;
    const mixedQuizCount = mixedQuizRes.rows.length;

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

// Render Vocabulary Quiz
app.get('/quiz/vocabulary', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const direction = req.query.direction || 'en-ko'; // Default to English → Korean
    
    // Get the last 3 successful days (days with >1 hour activity)
    const successfulDaysRes = await db.query(
      `SELECT DISTINCT activity_date 
       FROM User_Activity 
       WHERE user_id = $1 
         AND active_seconds >= 3600 
         AND activity_date < CURRENT_DATE
       ORDER BY activity_date DESC 
       LIMIT 3`,
      [userId]
    );
    
    if (successfulDaysRes.rows.length === 0) {
      // No successful days, render with empty questions
      return res.render('VocabularyQuiz.ejs', { questions: [] });
    }
    
    const successfulDates = successfulDaysRes.rows.map(row => row.activity_date);
    const questions = [];
    
               // For each successful day, get up to 15 words
           for (const date of successfulDates) {
             // First try to get unasked words (asked = false)
             let unaskedRes = await db.query(
               `SELECT id, word, meaning, meaning_geo, created_at
                FROM Dictionary 
                WHERE user_id = $1 
                  AND DATE(created_at) = $2
                  AND asked = false
                ORDER BY RANDOM()
                LIMIT 15`,
               [userId, date]
             );
             
             let dayQuestions = unaskedRes.rows;
             
             // If we don't have 15 words, fill with asked words
             if (dayQuestions.length < 15) {
               const remainingSlots = 15 - dayQuestions.length;
               const askedRes = await db.query(
                 `SELECT id, word, meaning, meaning_geo, created_at
                  FROM Dictionary 
                  WHERE user_id = $1 
                    AND DATE(created_at) = $2
                  AND asked = true
                  ORDER BY RANDOM()
                  LIMIT $3`,
                 [userId, date, remainingSlots]
               );
               
               dayQuestions = [...dayQuestions, ...askedRes.rows];
             }
             
             // Add day questions to total questions
             questions.push(...dayQuestions);
           }
           
           // Shuffle all questions for variety
           const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
           
           const formattedQuestions = shuffledQuestions.map((word, index) => {
             if (direction === 'ko-en') {
               // Korean → English: Show Korean word, expect English answer
               return {
                 id: word.id,
                 prompt: `Translate to English: ${word.word}`,
                 answer: word.meaning,
                 korean: word.word,
                 georgian: word.meaning_geo,
                 direction: 'ko-en'
               };
             } else {
               // English → Korean: Show English meaning, expect Korean answer
               return {
                 id: word.id,
                 prompt: `Translate to Korean: ${word.meaning}`,
                 answer: word.word,
                 korean: word.word,
                 georgian: word.meaning_geo,
                 direction: 'en-ko'
               };
             }
           });
    
    console.log(`Vocabulary quiz generated for user ${userId}:`);
    console.log(`- Successful days: ${successfulDates.map(d => d.toISOString().split('T')[0])}`);
    console.log(`- Total questions: ${formattedQuestions.length}`);
    
    res.render('VocabularyQuiz.ejs', { questions: formattedQuestions });
  } catch (err) {
    console.error('Render vocabulary quiz error:', err);
    res.redirect('/home');
  }
});

// Render Mixed Quiz (1/1/1)
app.get('/quiz/mixed', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const direction = req.query.direction === 'ko-en' ? 'ko-en' : 'en-ko';
    
    // Get successful days (days where user spent >1 hour studying)
    const successfulDaysResult = await db.query(`
      SELECT DISTINCT activity_date
      FROM User_Activity 
      WHERE user_id = $1 
      AND active_seconds > 3600  -- More than 1 hour (3600 seconds)
      ORDER BY activity_date DESC
    `, [userId]);
    
    // Debug: Show raw dates from database
    console.log('Raw activity dates from database:');
    successfulDaysResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}: ${row.activity_date} (raw) -> ${new Date(row.activity_date).toISOString().split('T')[0]} (processed)`);
    });
    
    const successfulDates = successfulDaysResult.rows.map(row => new Date(row.activity_date));
    
    // Debug: Show what the server thinks the current date is
    const now = new Date();
    console.log(`Server current time: ${now.toISOString()}`);
    console.log(`Server current date: ${now.toISOString().split('T')[0]}`);
    console.log(`Server local date: ${now.toLocaleDateString()}`);
    
    console.log(`Found ${successfulDates.length} successful days for user ${userId}`);
    
    // Get dates for 1, 7, and 30 successful days ago (1/1/1 rule)
    let targetDates = [];
    let dateLabels = [];
    
    // 1 successful day ago (yesterday)
    if (successfulDates.length >= 1) {
      targetDates.push(successfulDates[0]); // Most recent successful day (yesterday)
      dateLabels.push('1 day ago');
    }
    
    // 7 successful days ago (1 week ago)
    if (successfulDates.length >= 7) {
      targetDates.push(successfulDates[6]); // 7th most recent successful day
      dateLabels.push('7 days ago');
    }
    
    // 30 successful days ago (1 month ago)
    if (successfulDates.length >= 30) {
      targetDates.push(successfulDates[29]); // 30th most recent successful day
      dateLabels.push('30 days ago');
    }
    
    // If we don't have enough successful days, we can't provide a full 1/1/1 quiz
    // Don't fill with random dates - this breaks the 1/1/1 rule
    console.log(`1/1/1 Rule Status: ${targetDates.length === 3 ? 'Full quiz available' : 'Partial quiz available (${targetDates.length}/3 dates found)'}`);
    
    // Format dates for SQL queries - use local timezone to avoid UTC conversion issues
    const dateStrings = targetDates.map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    
    console.log(`Mixed quiz target dates for user ${userId}:`);
    console.log(`- Successful days found: ${successfulDates.length}`);
    console.log(`- Target dates: ${dateStrings.join(', ')}`);
    console.log(`- Date labels: ${dateLabels.join(', ')}`);
    console.log(`- 1/1/1 Rule: ${targetDates.length === 3 ? 'Full quiz available' : 'Partial quiz available'}`);
    
    // Get words added on these successful days
    let wordsResult;
    if (dateStrings.length > 0) {
      wordsResult = await db.query(`
        SELECT id, word, meaning, meaning_geo, created_at
        FROM Dictionary 
        WHERE user_id = $1 
        AND DATE(created_at) = ANY($2)
        ORDER BY created_at DESC
      `, [userId, dateStrings]);
    } else {
      wordsResult = { rows: [] };
    }
    
    // Get grammar rules added on these successful days
    let grammarResult;
    if (dateStrings.length > 0) {
      grammarResult = await db.query(`
        SELECT id, title, Eexample, created_at
        FROM Grammar 
        WHERE user_id = $1 
        AND DATE(created_at) = ANY($2)
        ORDER BY created_at DESC
      `, [userId, dateStrings]);
      
      // For each grammar rule, fetch one random example from the Examples table
      for (let rule of grammarResult.rows) {
        try {
          const exampleResult = await db.query(`
            SELECT example1, example2, example3, example4, example5
            FROM Examples 
            WHERE id = $1
          `, [rule.id]);
          
          if (exampleResult.rows.length > 0) {
            const examples = exampleResult.rows[0];
            // Pick one random example from the 5 available
            const exampleKeys = ['example1', 'example2', 'example3', 'example4', 'example5'];
            const randomKey = exampleKeys[Math.floor(Math.random() * exampleKeys.length)];
            rule.englishExample = examples[randomKey] || rule.Eexample || 'No example available';
          } else {
            // Fallback to Eexample if no examples found
            rule.englishExample = rule.Eexample || 'No example available';
          }
        } catch (err) {
          console.error(`Error fetching examples for grammar rule ${rule.id}:`, err);
          // Fallback to Eexample if there's an error
          rule.englishExample = rule.Eexample || 'No example available';
        }
      }
    } else {
      grammarResult = { rows: [] };
    }
    
    console.log(`Found ${wordsResult.rows.length} words and ${grammarResult.rows.length} grammar rules for mixed quiz`);
    
    // Format vocabulary questions based on direction
    const formattedQuestions = wordsResult.rows.map((word, index) => {
      if (direction === 'ko-en') {
        // Korean → English: Show Korean word, expect English answer
        return {
          id: word.id,
          prompt: `Translate to English: ${word.word}`,
          answer: word.meaning,
          korean: word.word,
          georgian: word.meaning_geo,
          direction: 'ko-en'
        };
      } else {
        // English → Korean: Show English meaning, expect Korean answer
        return {
          id: word.id,
          prompt: `Translate to Korean: ${word.meaning}`,
          answer: word.word,
          korean: word.word,
          georgian: word.meaning_geo,
          direction: 'en-ko'
        };
      }
    });
    
    // Format grammar questions
    const grammarBlock = {
      questions: grammarResult.rows.map((rule, index) => ({
        id: rule.id,
        title: rule.title,
        englishExample: rule.englishExample
      }))
    };
    
    // If no questions found, show proper message based on 1/1/1 rule
    if (formattedQuestions.length === 0 && grammarBlock.questions.length === 0) {
      let message = '';
      
      if (successfulDates.length === 0) {
        message = 'No successful study days recorded yet. Study for at least 1 hour to unlock the 1/1/1 quiz!';
      } else if (successfulDates.length === 1) {
        message = `Only 1 successful study day recorded. Need at least 7 successful days to unlock the 1/1/1 quiz. You have ${successfulDates.length} successful day.`;
      } else if (successfulDates.length < 7) {
        message = `Only ${successfulDates.length} successful study days recorded. Need at least 7 successful days to unlock the 1/1/1 quiz.`;
      } else if (successfulDates.length < 30) {
        message = `Only ${successfulDates.length} successful study days recorded. Need at least 30 successful days to unlock the full 1/1/1 quiz.`;
      }
      
      return res.render('MixedQuiz.ejs', { 
        questions: [], 
        grammarBlock: { questions: [] },
        message: message
      });
    }
    
    // If we have some questions but not all 3 target dates, show a message
    if (targetDates.length < 3) {
      const missingDates = [];
      if (successfulDates.length < 7) missingDates.push('7 days ago');
      if (successfulDates.length < 30) missingDates.push('30 days ago');
      
      const message = `Partial 1/1/1 quiz available. Missing data from: ${missingDates.join(', ')}. You have ${successfulDates.length} successful study days recorded.`;
      
      return res.render('MixedQuiz.ejs', { 
        questions: formattedQuestions, 
        grammarBlock,
        message: message
      });
    }
    
    res.render('MixedQuiz.ejs', { 
      questions: formattedQuestions, 
      grammarBlock,
      message: null
    });
    
  } catch (err) {
    console.error('Render mixed quiz error:', err);
    res.redirect('/home');
  }
});

// Render General Quiz
app.get('/quiz/general', requireAuth, async (req, res) => {
  try {
    const mode = req.query.mode || 'words';
    const direction = req.query.direction || 'en-ko';
    
    console.log(`General quiz requested: mode=${mode}, direction=${direction}`);
    
    res.render('GeneralQuiz.ejs', { 
      mode,
      direction,
      message: null
    });
    
  } catch (err) {
    console.error('Render general quiz error:', err);
    res.redirect('/home');
  }
});

// Submit mixed quiz answers
app.post('/quiz/mixed/submit', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body;
    
    // Mark mixed quiz as completed for today
    const today = new Date().toISOString().split('T')[0];
    
    await db.query(
      'INSERT INTO Daily_Quiz_Completions (user_id, quiz_type, completed_date) VALUES ($1, $2, $3) ON CONFLICT (user_id, quiz_type, completed_date) DO NOTHING',
      [req.session.user.id, 'mixed', today]
    );
    
    // Mark words as asked if answers were provided
    if (answers && Object.keys(answers).length > 0) {
      const questionIds = Object.keys(answers).map(key => key.replace('answer_', ''));
      if (questionIds.length > 0) {
        await db.query(
          'UPDATE Dictionary SET asked = true WHERE id = ANY($1) AND user_id = $2',
          [questionIds, req.session.user.id]
        );
      }
    }
    
    // Increment quiz count and check achievements
    await incrementQuizCount(req.session.user.id);
    
    // Check for YOU ARE READY achievement
    await checkYouAreReadyAchievement(req.session.user.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Submit mixed quiz error:', err);
    res.status(500).json({ error: 'Failed to submit mixed quiz' });
  }
 });

// General Quiz API endpoints
app.get('/api/general/check-availability', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const mode = req.query.mode || 'words';
    
    if (mode === 'words') {
      // Check if user has at least 100 words
      const wordsCount = await db.query(`
        SELECT COUNT(*) as count
        FROM Dictionary 
        WHERE user_id = $1
      `, [userId]);
      
      const available = wordsCount.rows[0].count >= 100;
      res.json({ 
        available, 
        count: parseInt(wordsCount.rows[0].count),
        required: 100,
        mode: 'words'
      });
      
    } else if (mode === 'grammar') {
      // Check if user has at least 20 grammar rules
      const grammarCount = await db.query(`
        SELECT COUNT(*) as count
        FROM Grammar 
        WHERE user_id = $1
      `, [userId]);
      
      const available = grammarCount.rows[0].count >= 20;
      res.json({ 
        available, 
        count: parseInt(grammarCount.rows[0].count),
        required: 20,
        mode: 'grammar'
      });
      
    } else {
      res.status(400).json({ error: 'Invalid mode' });
    }
    
  } catch (err) {
    console.error('Error checking general quiz availability:', err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

app.get('/api/general/words', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const direction = req.query.direction === 'ko-en' ? 'ko-en' : 'en-ko';
    const count = parseInt(req.query.count) || 100;
    
    // Get random words from user's dictionary (regardless of asked value)
    const wordsResult = await db.query(`
      SELECT id, word, meaning, meaning_geo, created_at
      FROM Dictionary 
      WHERE user_id = $1 
      ORDER BY RANDOM()
      LIMIT $2
    `, [userId, count]);
    
    // Format vocabulary questions based on direction
    const formattedQuestions = wordsResult.rows.map((word, index) => {
      if (direction === 'ko-en') {
        // Korean → English: Show Korean word, expect English answer
        return {
          id: word.id,
          prompt: `Translate to English: ${word.word}`,
          answer: word.meaning,
          korean: word.word,
          georgian: word.meaning_geo,
          direction: 'ko-en'
        };
      } else {
        // English → Korean: Show English meaning, expect Korean answer
        return {
          id: word.id,
          prompt: `Translate to Korean: ${word.meaning}`,
          answer: word.word,
          korean: word.word,
          georgian: word.meaning_geo,
          direction: 'en-ko'
        };
      }
    });
    
    res.json({ questions: formattedQuestions });
  } catch (err) {
    console.error('Error fetching general quiz words:', err);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

app.get('/api/general/grammar', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const count = parseInt(req.query.count) || 20;
    
    // Get random grammar rules from user's grammar table (regardless of asked value)
    const grammarResult = await db.query(`
      SELECT id, title, Eexample, created_at
      FROM Grammar 
      WHERE user_id = $1 
      ORDER BY RANDOM()
      LIMIT $2
    `, [userId, count]);
    
    // For each grammar rule, fetch one random example from the Examples table
    for (let rule of grammarResult.rows) {
      try {
        const exampleResult = await db.query(`
          SELECT example1, example2, example3, example4, example5
          FROM Examples 
          WHERE id = $1
        `, [rule.id]);
        
        if (exampleResult.rows.length > 0) {
          const examples = exampleResult.rows[0];
          // Pick one random example from the 5 available
          const exampleKeys = ['example1', 'example2', 'example3', 'example4', 'example5'];
          const randomKey = exampleKeys[Math.floor(Math.random() * exampleKeys.length)];
          rule.englishExample = examples[randomKey] || rule.Eexample || 'No example available';
        } else {
          // Fallback to Eexample if no examples found
          rule.englishExample = rule.Eexample || 'No example available';
        }
      } catch (err) {
        console.error(`Error fetching examples for grammar rule ${rule.id}:`, err);
        // Fallback to Eexample if there's an error
        rule.englishExample = rule.Eexample || 'No example available';
      }
    }
    
    res.json({ questions: grammarResult.rows });
  } catch (err) {
    console.error('Error fetching general quiz grammar:', err);
    res.status(500).json({ error: 'Failed to fetch grammar rules' });
  }
});

// Submit vocabulary quiz answers
app.post('/quiz/vocabulary/submit', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body;
    
    // Mark vocabulary quiz as completed for today
    const today = new Date().toISOString().split('T')[0];
    
    await db.query(
      'INSERT INTO Daily_Quiz_Completions (user_id, quiz_type, completed_date) VALUES ($1, $2, $3) ON CONFLICT (user_id, quiz_type, completed_date) DO NOTHING',
      [req.session.user.id, 'vocabulary', today]
    );
    
    // Only mark words as asked if actual answers were provided
    if (answers && Object.keys(answers).length > 0) {
      const questionIds = Object.keys(answers).map(key => key.replace('answer_', ''));
      if (questionIds.length > 0) {
        await db.query(
          'UPDATE Dictionary SET asked = true WHERE id = ANY($1) AND user_id = $2',
          [questionIds, req.session.user.id]
        );
      }
    }
    
    // Check and unlock vocabulary achievements
    await checkVocabularyAchievements(req.session.user.id);
    
    // Increment quiz count and check achievements
    await incrementQuizCount(req.session.user.id);
    
    // Check for YOU ARE READY achievement
    await checkYouAreReadyAchievement(req.session.user.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Submit vocabulary quiz error:', err);
    res.status(500).json({ error: 'submit_failed' });
  }
});

// Mark correctly answered vocabulary words as asked
app.post('/api/vocabulary/mark-correct-as-asked', requireAuth, async (req, res) => {
  try {
    const { wordIds } = req.body;
    
    if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ error: 'No word IDs provided' });
    }
    
    // Update the asked column to true for correctly answered words
    await db.query(
      'UPDATE Dictionary SET asked = true WHERE id = ANY($1) AND user_id = $2',
      [wordIds, req.session.user.id]
    );
    
    res.json({ success: true, updatedCount: wordIds.length });
  } catch (err) {
    console.error('Error marking vocabulary words as asked:', err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Check vocabulary answer with fuzzy matching
app.post('/api/vocabulary/check-answer', requireAuth, async (req, res) => {
  try {
    const { wordId, userAnswer, direction } = req.body;
    
    // Get the word from database
    const wordRes = await db.query(
      'SELECT word, meaning FROM Dictionary WHERE id = $1 AND user_id = $2',
      [wordId, req.session.user.id]
    );
    
    if (wordRes.rows.length === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }
    
    const word = wordRes.rows[0];
    let isCorrect;
    
    if (direction === 'ko-en') {
      // Korean → English: Check English answer against meaning
      isCorrect = checkVocabularyAnswer(userAnswer, word.meaning, word.word);
    } else {
      // English → Korean: Check Korean answer against word
      isCorrect = checkVocabularyAnswer(userAnswer, word.word, word.meaning);
    }
    
    res.json({ 
      correct: isCorrect,
      korean: word.word,
      english: word.meaning
    });
  } catch (err) {
    console.error('Check vocabulary answer error:', err);
    res.status(500).json({ error: 'check_failed' });
  }
});

// Fuzzy matching function for vocabulary answers
function checkVocabularyAnswer(userAnswer, correctEnglish, correctKorean) {
  if (!userAnswer || !correctEnglish) return false;
  
  const user = userAnswer.trim().toLowerCase();
  const english = correctEnglish.trim().toLowerCase();
  
  // Check English answer (exact match or fuzzy)
  if (fuzzyMatch(user, english)) return true;
  
  // Check multiple English definitions (separated by "; ")
  const englishTranslations = english.split('; ').map(t => t.trim().toLowerCase());
  for (const translation of englishTranslations) {
    if (fuzzyMatch(user, translation)) return true;
  }
  
  return false;
}

// Fuzzy matching with typo tolerance
function fuzzyMatch(user, correct) {
  if (user === correct) return true;
  
  // Allow 1 character difference (typo tolerance)
  if (Math.abs(user.length - correct.length) <= 1) {
    let differences = 0;
    const maxLen = Math.max(user.length, correct.length);
    
    for (let i = 0; i < maxLen; i++) {
      if (i >= user.length || i >= correct.length || user[i] !== correct[i]) {
        differences++;
        if (differences > 1) return false;
      }
    }
    return differences <= 1;
  }
  
  return false;
}

// Render Grammar Quiz
app.get('/quiz/grammar', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // First, try to get unasked grammar rules (asked = false)
    let qRes = await db.query(
      `SELECT 
        g.id, 
        g.title, 
        g.Eexample,
        e.example1, e.example2, e.example3, e.example4, e.example5
       FROM Grammar g
       LEFT JOIN Examples e ON g.id = e.id
       WHERE g.user_id = $1 AND g.asked = false
       ORDER BY RANDOM()
       LIMIT 3`,
      [userId]
    );
    
    let questions = qRes.rows;
    let message = null;
    
    // If we don't have 3 unasked rules, fill with asked ones and show message
    if (questions.length < 3) {
      const remainingSlots = 3 - questions.length;
      
      if (remainingSlots > 0) {
        const askedRes = await db.query(
          `SELECT 
            g.id, 
            g.title, 
            g.Eexample,
            e.example1, e.example2, e.example3, e.example4, e.example5
           FROM Grammar g
           LEFT JOIN Examples e ON g.id = e.id
           WHERE g.user_id = $1 AND g.asked = true
           ORDER BY RANDOM()
           LIMIT $2`,
          [userId, remainingSlots]
        );
        
        questions = [...questions, ...askedRes.rows];
        message = `You're all caught up! Showing ${qRes.rows.length} new rules and ${askedRes.rows.length} review rules.`;
      }
    }
    
    // Process questions to randomly select one example for each
    const processedQuestions = questions.map(row => {
      const examples = [row.example1, row.example2, row.example3, row.example4, row.example5]
        .filter(example => example && example.trim()) // Remove empty examples
        .sort(() => Math.random() - 0.5); // Shuffle examples
      
      const selectedExample = examples[0] || row.Eexample; // Fallback to original example if no GPT examples
      
      return {
        id: row.id,
        title: row.title,
        Eexample: selectedExample
      };
    });
    
    res.render('GrammarQuiz.ejs', { 
      questions: processedQuestions,
      message: message
    });
  } catch (err) {
    console.error('Render grammar quiz error:', err);
    res.redirect('/home');
  }
});

// Stub submission endpoint
app.post('/quiz/grammar/submit', requireAuth, async (req, res) => {
  try {
    const answers = req.body?.answers || {};
    
    // Mark grammar quiz as completed for today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    await db.query(
      'INSERT INTO Daily_Quiz_Completions (user_id, quiz_type, completed_date) VALUES ($1, $2, $3) ON CONFLICT (user_id, quiz_type, completed_date) DO NOTHING',
      [req.session.user.id, 'grammar', today]
    );
    
    // Mark the grammar rules that were asked in this quiz as "asked = true"
    const questionIds = Object.keys(answers).map(key => key.replace('answer_', ''));
    if (questionIds.length > 0) {
      await db.query(
        'UPDATE Grammar SET asked = true WHERE id = ANY($1) AND user_id = $2',
        [questionIds, req.session.user.id]
      );
    }
    
              // Check and unlock grammar achievements
          await checkGrammarAchievements(req.session.user.id);
          
          // Increment quiz count and check achievements
          await incrementQuizCount(req.session.user.id);
          
          // Check for YOU ARE READY achievement
          await checkYouAreReadyAchievement(req.session.user.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Submit grammar quiz error:', err);
    res.status(500).json({ error: 'submit_failed' });
  }
});

// Check if user has completed today's quiz
app.get('/api/quiz/status/:type', requireAuth, async (req, res) => {
  try {
    const quizType = req.params.type; // 'grammar', 'vocabulary', 'mixed'
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(
      'SELECT id FROM Daily_Quiz_Completions WHERE user_id = $1 AND quiz_type = $2 AND completed_date = $3',
      [req.session.user.id, quizType, today]
    );
    
    const isCompleted = result.rows.length > 0;
    res.json({ completed: isCompleted });
  } catch (err) {
    console.error('Error checking quiz status:', err);
    res.status(500).json({ error: 'Failed to check quiz status' });
  }
});



// GPT integration for mixed quiz grammar evaluation (higher token limit)
app.post('/api/grammar/evaluate', requireAuth, async (req, res) => {
  try {
    const { answers, maxTokens = 10000 } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers data' });
    }

    // Build prompt for GPT with higher token limit
    let prompt = `You are an expert Korean language teacher evaluating multiple grammar rule applications. Your task is to objectively evaluate Korean sentences written by a student for different grammar rules. Be honest and critical - do not agree with everything. If there are mistakes, point them out clearly and provide corrections.

IMPORTANT: Write your feedback primarily in ENGLISH. Only use Korean for:
- The corrected Korean sentences
- Korean grammar rule names when necessary
- Korean examples

Grammar Rules and Student Answers to evaluate:

`;

    answers.forEach((answer, index) => {
      prompt += `${index + 1}. Grammar Rule: "${answer.ruleTitle}"
   English Example: "${answer.englishExample}"
   Student's Korean Answer: "${answer.koreanAnswer}"

`;
    });

    prompt += `Please evaluate each answer objectively in ENGLISH:
- If correct: Say "Correct" and briefly explain why it's good in English
- If incorrect: Explain what's wrong in English and provide the correct Korean translation of the English example given
- Be specific about grammar mistakes, vocabulary errors, or unnatural expressions
- Keep each evaluation concise but thorough (2-3 sentences per answer)
- Focus on the most important corrections and learning points

Format each response as:
[GRAMMAR RULE NAME]:
1. Evaluation: [English explanation of what's right/wrong]

2. Correction: [Correct Korean translation of the English example if needed]

3. Explanation: [Brief English explanation of the grammar rule usage]

IMPORTANT: 
- Each evaluation must start with the grammar rule name in bold or clearly visible format
- If the answer is wrong, provide the correct Korean translation of the English example that was given in the quiz
- Use proper line breaks between numbered points for clarity

Remember: Be objective and critical. Don't praise incorrect answers. Write feedback in English, corrections in Korean.`;

    // Call OpenAI API with higher token limit
    const feedback = await generateGrammarFeedbackWithGPT(prompt, maxTokens);
    
    if (feedback) {
      // Parse the feedback into structured evaluations
      const evaluations = answers.map((answer, index) => {
        // Extract the relevant part of feedback for this rule
        const ruleFeedback = extractRuleFeedback(feedback, answer.ruleTitle);
        return {
          ruleTitle: answer.ruleTitle,
          englishExample: answer.englishExample,
          koreanAnswer: answer.koreanAnswer,
          evaluation: ruleFeedback || 'Evaluation not available'
        };
      });
      
      res.json({ evaluations, fullFeedback: feedback });
    } else {
      res.status(500).json({ error: 'Failed to generate feedback' });
    }

  } catch (err) {
    console.error('Error evaluating mixed quiz grammar:', err);
    res.status(500).json({ error: 'evaluation_failed' });
  }
});

// Helper function to extract feedback for specific grammar rules
function extractRuleFeedback(fullFeedback, ruleTitle) {
  try {
    // Look for the rule title in the feedback and extract the relevant section
    const ruleIndex = fullFeedback.indexOf(ruleTitle);
    if (ruleIndex === -1) return 'Evaluation not available';
    
    // Find the next rule or end of feedback
    const nextRuleIndex = fullFeedback.indexOf('\n\n', ruleIndex);
    if (nextRuleIndex === -1) {
      return fullFeedback.substring(ruleIndex);
    }
    
    return fullFeedback.substring(ruleIndex, nextRuleIndex).trim();
  } catch (err) {
    console.error('Error extracting rule feedback:', err);
    return 'Evaluation not available';
  }
}

// GPT integration for checking grammar quiz answers
app.post('/api/grammar/check-answers', requireAuth, async (req, res) => {
  try {
    const { questions, conversationHistory } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid questions data' });
    }

    // Build prompt for GPT
    let prompt = `You are an expert Korean language teacher. Your task is to objectively evaluate Korean sentences written by a student. Be honest and critical - do not agree with everything. If there are mistakes, point them out clearly and provide corrections.

IMPORTANT: Write your feedback primarily in ENGLISH. Only use Korean for:
- The corrected Korean sentences
- Korean grammar rule names when necessary
- Korean examples

Grammar Rules and Student Answers to evaluate:

`;

    questions.forEach((q, index) => {
      prompt += `${index + 1}. Grammar Rule: "${q.title}"
   English Example: "${q.englishExample}"
   Student's Korean Answer: "${q.koreanAnswer}"

`;
    });

    prompt += `Please evaluate each answer objectively in ENGLISH:
- If correct: Say "Correct" and briefly explain why it's good in English
- If incorrect: Explain what's wrong in English and provide the correct Korean sentence
- Be specific about grammar mistakes, vocabulary errors, or unnatural expressions
- Keep each evaluation concise (1-2 sentences per answer)
- Focus on the most important corrections

Format each response as:
[GRAMMAR RULE NAME]:
1. Evaluation: [English explanation of what's right/wrong]
2. Correction: [Correct Korean sentence if needed]
3. Explanation: [Brief English explanation of the grammar rule usage]

IMPORTANT: Each evaluation must start with the grammar rule name in bold or clearly visible format so the student knows which question is being evaluated.

Remember: Be objective and critical. Don't praise incorrect answers. Write feedback in English, corrections in Korean.`;

    // Call OpenAI API
    const feedback = await generateGrammarFeedbackWithGPT(prompt);
    
    if (feedback) {
      res.json({ feedback });
    } else {
      res.status(500).json({ error: 'Failed to generate feedback' });
    }

  } catch (err) {
    console.error('Error checking grammar answers:', err);
    res.status(500).json({ error: 'check_failed' });
  }
});

// GPT integration for chat functionality
app.post('/api/grammar/chat', requireAuth, async (req, res) => {
  try {
    const { message, quizData, conversationHistory } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build context-aware prompt
    let prompt = `You are a helpful Korean language tutor. The student has just completed a grammar quiz and is asking follow-up questions.

Context from the quiz:
`;

    if (quizData && Array.isArray(quizData)) {
      quizData.forEach((q, index) => {
        prompt += `${index + 1}. Grammar Rule: "${q.title}"
   English Example: "${q.englishExample}"
   Student's Korean Answer: "${q.koreanAnswer}"

`;
      });
    }

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `Previous conversation:
`;
      conversationHistory.slice(-5).forEach(msg => { // Last 5 messages for context
        prompt += `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}\n`;
      });
    }

    prompt += `Student's current question: "${message}"

Please provide a helpful, educational response in ENGLISH. You can:
- Explain grammar concepts in English
- Provide additional examples (Korean examples, English explanations)
- Answer questions about Korean language in English
- Give practice suggestions in English
- Correct any misconceptions in English

IMPORTANT: Write your responses primarily in English. Only use Korean for:
- Korean grammar rule names
- Korean example sentences
- Korean vocabulary when necessary

Keep your response concise but informative (2-4 sentences).`;

    // Call OpenAI API
    const response = await generateGrammarFeedbackWithGPT(prompt);
    
    if (response) {
      res.json({ response });
    } else {
      res.status(500).json({ error: 'Failed to generate response' });
    }

  } catch (err) {
    console.error('Error in grammar chat:', err);
    res.status(500).json({ error: 'chat_failed' });
  }
});

// Reset all grammar rules to unasked (for testing or when user wants to start over)
app.post('/api/grammar/reset-asked', requireAuth, async (req, res) => {
  try {
    await db.query(
      'UPDATE Grammar SET asked = false WHERE user_id = $1',
      [req.session.user.id]
    );
    res.json({ success: true, message: 'All grammar rules reset to unasked' });
  } catch (err) {
    console.error('Error resetting grammar rules:', err);
    res.status(500).json({ error: 'Failed to reset grammar rules' });
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