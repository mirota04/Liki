USE Liki;

DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(100) NOT NULL UNIQUE,
	password TEXT,
	email TEXT,
	administrator BOOLEAN,
	requestNotification BOOLEAN
);

DROP TABLE IF EXISTS Grammar;
CREATE TABLE Grammar (
	id SERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	explanation TEXT NOT NULL,
	Kexample TEXT NOT NULL,
	Eexample TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	asked BOOLEAN DEFAULT FALSE,
	user_id INT, FOREIGN KEY (user_id) REFERENCES Users(id)
);

DROP TABLE IF EXISTS Dictionary;
CREATE TABLE Dictionary (
	id SERIAL PRIMARY KEY,
	word TEXT NOT NULL,
	meaning TEXT NOT NULL,
	meaning_geo TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	user_id INT, FOREIGN KEY (user_id) REFERENCES Users(id)
);

DROP TABLE IF EXISTS Achievements;
CREATE TABLE Achievements (
	id SERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	icon TEXT NOT NULL,
	status BOOLEAN DEFAULT FALSE,
	user_id INT, FOREIGN KEY (user_id) REFERENCES Users(id)
);

DROP TABLE IF EXISTS Examples;
CREATE TABLE Examples (
    id BIGINT,
    example1 TEXT NOT NULL,
    example2 TEXT NOT NULL,
    example3 TEXT NOT NULL,
    example4 TEXT NOT NULL,
    example5 TEXT NOT NULL
);

-- Streak feature tables

-- Tracks per-user daily active time in seconds (aggregated by local date)
DROP TABLE IF EXISTS User_Activity;
CREATE TABLE User_Activity (
	id SERIAL PRIMARY KEY,
	user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
	activity_date DATE NOT NULL,
	active_seconds INT NOT NULL DEFAULT 0,
	last_heartbeat TIMESTAMP NULL,
	UNIQUE (user_id, activity_date)
);

-- Cached streak state for fast reads
DROP TABLE IF EXISTS User_Streak;
CREATE TABLE User_Streak (
	user_id INT PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
	current_streak INT NOT NULL DEFAULT 0,
	last_success_date DATE NULL,
	timezone TEXT NULL,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS User_Activity_Weekly;
CREATE TABLE User_Activity_Weekly (
  user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_seconds INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, week_start)
);

-- Quiz completion tracking
DROP TABLE IF EXISTS Daily_Quiz_Completions;
CREATE TABLE Daily_Quiz_Completions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    quiz_type VARCHAR(50) NOT NULL, -- 'grammar', 'vocabulary', 'mixed'
    completed_date DATE NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, quiz_type, completed_date)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON User_Activity (user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON User_Activity (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_user_date ON Daily_Quiz_Completions (user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_user_type ON Daily_Quiz_Completions (user_id, quiz_type);