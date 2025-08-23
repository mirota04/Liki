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