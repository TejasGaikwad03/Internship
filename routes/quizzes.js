const express = require('express');
const router = express.Router();
const db = require('../config/db');

// List all quizzes
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM quizzes ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// Get a single quiz with questions and options
router.get('/:id', async (req, res) => {
    const quizId = req.params.id;
    try {
        const [quizRows] = await db.execute('SELECT * FROM quizzes WHERE id = ?', [quizId]);
        if (quizRows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        const quiz = quizRows[0];

        // Fetch questions
        const [questionRows] = await db.execute('SELECT * FROM questions WHERE quiz_id = ?', [quizId]);

        // Fetch options for all questions
        // In a real optimized app, we'd do a text based join or batch query.
        // For distinct structure, we'll loop or fetch all options for these questions.
        const questionsWithOptions = [];
        for (const q of questionRows) {
            const [optionRows] = await db.execute('SELECT * FROM options WHERE question_id = ?', [q.id]);
            questionsWithOptions.push({ ...q, options: optionRows });
        }

        res.json({ ...quiz, questions: questionsWithOptions });

    } catch (error) {
        console.error('Error fetching quiz details:', error);
        res.status(500).json({ error: 'Failed to fetch quiz details' });
    }
});

// Create a new quiz (Transactional)
router.post('/', async (req, res) => {
    const { title, description, time_limit_minutes, created_by, questions } = req.body;

    // Basic validation
    if (!title || !created_by || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Invalid input. Title, created_by and questions array are required.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insert Quiz
        const [quizResult] = await connection.execute(
            'INSERT INTO quizzes (title, description, time_limit_minutes, created_by) VALUES (?, ?, ?, ?)',
            [title, description || '', time_limit_minutes || 10, created_by]
        );
        const quizId = quizResult.insertId;

        // 2. Insert Questions
        for (const q of questions) {
            const [qResult] = await connection.execute(
                'INSERT INTO questions (quiz_id, question_text, question_type, points) VALUES (?, ?, ?, ?)',
                [quizId, q.question_text, q.question_type || 'multiple_choice', q.points || 1]
            );
            const questionId = qResult.insertId;

            // 3. Insert Options
            if (q.options && Array.isArray(q.options)) {
                for (const opt of q.options) {
                    await connection.execute(
                        'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
                        [questionId, opt.option_text, opt.is_correct || false]
                    );
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Quiz created successfully', quizId });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating quiz:', error);
        res.status(500).json({ error: 'Failed to create quiz' });
    } finally {
        connection.release();
    }
});

// Update Quiz (Full Replace of Questions or Metadata)
router.put('/:id', async (req, res) => {
    const quizId = req.params.id;
    const { title, description, time_limit_minutes, questions } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update Quiz Metadata
        await connection.execute(
            'UPDATE quizzes SET title = ?, description = ?, time_limit_minutes = ? WHERE id = ?',
            [title, description || '', time_limit_minutes || 10, quizId]
        );

        // 2. If questions provided, RE-CREATE them (Full Update Strategy)
        if (questions && Array.isArray(questions)) {
            // Delete existing options then questions? 
            // Cascading delete on questions will delete options.
            // First get existing question IDs to safeguard? No, cascade works.

            // Delete old questions
            await connection.execute('DELETE FROM questions WHERE quiz_id = ?', [quizId]);

            // Insert new questions
            for (const q of questions) {
                const [qRes] = await connection.execute(
                    'INSERT INTO questions (quiz_id, question_text, question_type, points) VALUES (?, ?, ?, ?)',
                    [quizId, q.question_text, q.question_type || 'multiple_choice', q.points || 1]
                );
                const questionId = qRes.insertId;

                if (q.options && Array.isArray(q.options)) {
                    for (const opt of q.options) {
                        await connection.execute(
                            'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
                            [questionId, opt.option_text, opt.is_correct || false]
                        );
                    }
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Quiz updated successfully' });

    } catch (error) {
        await connection.rollback();
        console.error('Error updating quiz:', error);
        res.status(500).json({ error: 'Failed to update quiz' });
    } finally {
        connection.release();
    }
});

// Delete Quiz
router.delete('/:id', async (req, res) => {
    const quizId = req.params.id;
    try {
        await db.execute('DELETE FROM quizzes WHERE id = ?', [quizId]);
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
});

module.exports = router;
