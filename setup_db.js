const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function setupDatabase() {
    let connection;
    try {
        console.log('Connecting to MySQL server...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        console.log('Dropping and recreating database...');
        await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
        await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);

        const queries = [
            `CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'student') DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE quizzes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                time_limit_minutes INT DEFAULT 10,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quiz_id INT NOT NULL,
                question_text TEXT NOT NULL,
                question_type ENUM('multiple_choice', 'true_false') DEFAULT 'multiple_choice',
                points INT DEFAULT 1,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE options (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question_id INT NOT NULL,
                option_text TEXT NOT NULL,
                is_correct BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                quiz_id INT NOT NULL,
                score INT NOT NULL,
                total_points INT NOT NULL,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            )`
        ];

        console.log('Executing table creation queries...');
        for (const query of queries) {
            try {
                await connection.query(query);
            } catch (err) {
                console.error('Error executing query:', query.substring(0, 50) + '...', err.message);
                throw err;
            }
        }

        // Seed an admin user
        console.log('Seeding admin user...');
        // Password is 'admin123' (simple usage for now)
        await connection.query(`INSERT INTO users (username, password_hash, role) VALUES ('admin', 'admin123', 'admin')`);

        console.log('Database setup completed successfully!');

    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();
