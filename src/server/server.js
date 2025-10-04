import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();

app.use(cors());
app.use(express.json());

// 2. Connect to MongoDB
// *** FINAL CORRECTED URI: Added the database name '/typingtest' before the '?' ***
// server.js

// Read MongoDB URI from environment for safety. Provide a local fallback for dev.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/typingtest';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// 3. Define Schema and Model
const Score = mongoose.model("Score", new mongoose.Schema({
  // Unique name ensures only one score document per user, allowing update logic
  name: { type: String, required: true, unique: true },
  wpm: { type: Number, required: true }
}));

// 4. Implement Save Score Endpoint ( /score )
app.post("/score", async (req, res) => {
  try {
    const { name, wpm } = req.body;

    // Check if user exists
    const existing = await Score.findOne({ name: name });

    // Logic: Create new entry OR update only if new WPM is higher
    if (!existing) {
      // User not in DB, create new entry
      const score = new Score({ name, wpm });
      await score.save();
    } else if (wpm > existing.wpm) {
      // Update only if new WPM is higher
      existing.wpm = wpm;
      await existing.save();
    }
    // If the score is not higher, we do nothing (the score remains the old max)

    // After saving/checking, fetch all scores for the leaderboard
    const leaderboard = await Score
      .find()
      .sort({ wpm: -1 });  // Sort by wpm in descending order (highest first)

    res.json({ leaderboard });

  } catch (err) {
    console.error("Error saving score:", err);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// 5. Implement Get Leaderboard Endpoint ( /leaderboard )
app.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await Score
      .find()
      .sort({ wpm: -1 });  // Sort by wpm in descending order

    // Return leaderboard as an object with the 'leaderboard' key
    res.json({ leaderboard });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

const PORT = 8080;
app.listen(PORT, () => console.log(`🚀 Backend running on Port Number ${PORT}`));