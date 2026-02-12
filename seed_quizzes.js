const db = require('./config/db');

async function seedQuizzes() {
    try {
        console.log('Seeding Quizzes...');

        // We need an admin user ID to associate quizzes with.
        const [users] = await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (users.length === 0) {
            console.error('No admin found to create quizzes. Please run setup_db.js first.');
            process.exit(1);
        }
        const adminId = users[0].id;

        const quizzes = [
            {
                title: 'JavaScript Basics',
                description: 'Test your knowledge of JS fundamentals.',
                time_limit_minutes: 5,
                questions: [
                    {
                        text: 'Which keyword is used to declare a constant in JavaScript?',
                        points: 10,
                        options: [
                            { text: 'var', correct: false },
                            { text: 'let', correct: false },
                            { text: 'const', correct: true },
                            { text: 'final', correct: false }
                        ]
                    },
                    {
                        text: 'What does NaN stand for?',
                        points: 10,
                        options: [
                            { text: 'Not a Number', correct: true },
                            { text: 'No a Name', correct: false },
                            { text: 'Null and Negative', correct: false },
                            { text: 'None of the Above', correct: false }
                        ]
                    },
                    {
                        text: 'Which method is used to remove the last element from an array?',
                        points: 10,
                        options: [
                            { text: 'shift()', correct: false },
                            { text: 'pop()', correct: true },
                            { text: 'push()', correct: false },
                            { text: 'slice()', correct: false }
                        ]
                    }
                ]
            },
            {
                title: 'World Geography',
                description: 'Explore the world map.',
                time_limit_minutes: 8,
                questions: [
                    {
                        text: 'What is the capital of France?',
                        points: 5,
                        options: [
                            { text: 'Berlin', correct: false },
                            { text: 'Madrid', correct: false },
                            { text: 'Paris', correct: true },
                            { text: 'Rome', correct: false }
                        ]
                    },
                    {
                        text: 'Which is the largest ocean?',
                        points: 5,
                        options: [
                            { text: 'Atlantic', correct: false },
                            { text: 'Indian', correct: false },
                            { text: 'Pacific', correct: true },
                            { text: 'Arctic', correct: false }
                        ]
                    }
                ]
            },
            {
                title: 'Space Science',
                description: 'Journey to the stars.',
                time_limit_minutes: 10,
                questions: [
                    {
                        text: 'Which planet is known as the Red Planet?',
                        points: 10,
                        options: [
                            { text: 'Venus', correct: false },
                            { text: 'Mars', correct: true },
                            { text: 'Jupiter', correct: false },
                            { text: 'Saturn', correct: false }
                        ]
                    },
                    {
                        text: 'What is the name of our galaxy?',
                        points: 10,
                        options: [
                            { text: 'Andromeda', correct: false },
                            { text: 'Milky Way', correct: true },
                            { text: 'Whirlpool', correct: false },
                            { text: 'Sombrero', correct: false }
                        ]
                    }
                ]
            }
        ];

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const quiz of quizzes) {
                const [qRes] = await connection.execute(
                    'INSERT INTO quizzes (title, description, time_limit_minutes, created_by) VALUES (?, ?, ?, ?)',
                    [quiz.title, quiz.description, quiz.time_limit_minutes, adminId]
                );
                const quizId = qRes.insertId;

                for (const q of quiz.questions) {
                    const [questRes] = await connection.execute(
                        'INSERT INTO questions (quiz_id, question_text, points) VALUES (?, ?, ?)',
                        [quizId, q.text, q.points]
                    );
                    const questId = questRes.insertId;

                    for (const opt of q.options) {
                        await connection.execute(
                            'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
                            [questId, opt.text, opt.correct]
                        );
                    }
                }
                console.log(`Added quiz: ${quiz.title}`);
            }

            await connection.commit();
            console.log('All quizzes seeded successfully!');

        } catch (err) {
            await connection.rollback();
            console.error('Error seeding data:', err);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Top level error:', error);
    } finally {
        // We need to close the pool to exit script cleanly if using pool directly, 
        // but db.js exports pool.promise(), which doesn't expose end() directly in the same way 
        // depending on mysql2 version, but typically `db.end()` works if it's a pool object.
        // Actually db module exports `pool.promise()`.
        // Let's trying closing it.
        process.exit(0);
    }
}

seedQuizzes();
