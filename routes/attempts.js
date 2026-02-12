const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Submit Quiz Attempt
router.post('/', async (req, res) => {
    const { user_id, quiz_id, answers } = req.body; // answers: [{ question_id, option_id }]

    if (!user_id || !quiz_id || !answers) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Fetch all questions and correct options for the quiz
        const [questions] = await db.execute(
            `SELECT q.id as question_id, q.points, o.id as option_id 
             FROM questions q 
             JOIN options o ON q.id = o.question_id 
             WHERE q.quiz_id = ? AND o.is_correct = TRUE`,
            [quiz_id]
        );

        // Map for quick lookup: question_id -> { option_id, points }
        const correctAnswers = {};
        let totalPossiblePoints = 0;

        questions.forEach(q => {
            correctAnswers[q.question_id] = { correctOptionId: q.option_id, points: q.points };
            totalPossiblePoints += q.points;
        });

        // 2. Calculate Score
        let score = 0;
        for (const ans of answers) {
            const correct = correctAnswers[ans.question_id];
            if (correct && correct.correctOptionId === ans.option_id) {
                score += correct.points;
            }
        }

        // 3. Save Result
        const [result] = await db.execute(
            'INSERT INTO results (user_id, quiz_id, score, total_points) VALUES (?, ?, ?, ?)',
            [user_id, quiz_id, score, totalPossiblePoints]
        );

        res.json({
            message: 'Quiz submitted successfully',
            resultId: result.insertId,
            score,
            totalPoints: totalPossiblePoints
        });

    } catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

// Get User Results
router.get('/user/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [results] = await db.execute(
            `SELECT r.*, q.title as quiz_title 
             FROM results r 
             JOIN quizzes q ON r.quiz_id = q.id 
             WHERE r.user_id = ? 
             ORDER BY r.submitted_at DESC`,
            [userId]
        );
        res.json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Get Quiz Results (Admin)
router.get('/quiz/:quizId', async (req, res) => {
    const quizId = req.params.quizId;
    try {
        const [results] = await db.execute(
            `SELECT r.*, u.username 
             FROM results r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.quiz_id = ? 
             ORDER BY r.score DESC, r.submitted_at ASC`,
            [quizId]
        );
        res.json(results);
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({ error: 'Failed to fetch quiz results' });
    }
});

module.exports = router;
