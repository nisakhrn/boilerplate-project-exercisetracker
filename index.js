const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Basic Configuration
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create mongoose schemas
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Serve HTML
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  
  try {
    const newUser = new User({ username: username });
    const savedUser = await newUser.save();
    
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  let { description, duration, date } = req.body;
  
  try {
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse inputs
    duration = parseInt(duration);
    
    // Handle date - if not provided, use current date
    if (!date) {
      date = new Date();
    } else {
      date = new Date(date);
    }
    
    // Create a new exercise
    const newExercise = new Exercise({
      userId,
      description,
      duration,
      date
    });
    
    const savedExercise = await newExercise.save();
    
    // Return formatted response
    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get exercise log for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  
  try {
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build the query for exercises
    let dateFilter = { userId: userId };
    
    if (from || to) {
      dateFilter.date = {};
      
      if (from) {
        dateFilter.date.$gte = new Date(from);
      }
      
      if (to) {
        dateFilter.date.$lte = new Date(to);
      }
    }
    
    // Find exercises
    let exerciseQuery = Exercise.find(dateFilter);
    
    if (limit) {
      exerciseQuery = exerciseQuery.limit(parseInt(limit));
    }
    
    const exercises = await exerciseQuery.exec();
    
    // Format log entries
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

// Export app for testing
module.exports = app;