const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve frontend files

// Routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const attemptRoutes = require('./routes/attempts');

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/attempts', attemptRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Online Quiz System API' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
