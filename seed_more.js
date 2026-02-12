const db = require('./config/db');

async function seedMoreQuizzes() {
    try {
        console.log('Seeding More Quizzes...');

        const [users] = await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (users.length === 0) { console.error('No admin found.'); process.exit(1); }
        const adminId = users[0].id;

        const quizzes = [
            {
                title: 'History Trivia',
                description: 'Test your historical knowledge.',
                time_limit_minutes: 6,
                questions: [
                    {
                        text: 'Who was the first President of the USA?',
                        points: 10,
                        options: [
                            { text: 'Abraham Lincoln', correct: false },
                            { text: 'George Washington', correct: true },
                            { text: 'Thomas Jefferson', correct: false },
                            { text: 'John Adams', correct: false }
                        ]
                    },
                    {
                        text: 'In which year did WWII end?',
                        points: 10,
                        options: [
                            { text: '1945', correct: true },
                            { text: '1939', correct: false },
                            { text: '1918', correct: false },
                            { text: '1950', correct: false }
                        ]
                    }
                ]
            },
            {
                title: 'Math Challenge',
                description: 'Simple math problems.',
                time_limit_minutes: 5,
                questions: [
                    {
                        text: 'What is 15 * 6?',
                        points: 5,
                        options: [
                            { text: '90', correct: true },
                            { text: '80', correct: false },
                            { text: '100', correct: false },
                            { text: '95', correct: false }
                        ]
                    },
                    {
                        text: 'What is the square root of 64?',
                        points: 5,
                        options: [
                            { text: '6', correct: false },
                            { text: '7', correct: false },
                            { text: '8', correct: true },
                            { text: '9', correct: false }
                        ]
                    }
                ]
            }
        ];

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const quiz of quizzes) {
                // Check if already exists to avoid duplicates if re-run (simple check by title)
                const [existing] = await connection.execute('SELECT id FROM quizzes WHERE title = ?', [quiz.title]);
                if (existing.length > 0) {
                    console.log(`Quiz '${quiz.title}' already exists. Skipping.`);
                    continue;
                }

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
            console.log('Additional quizzes seeded successfully!');

        } catch (err) {
            await connection.rollback();
            console.error('Error seeding data:', err);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Top level error:', error);
    } finally {
        process.exit(0);
    }
}

seedMoreQuizzes();
