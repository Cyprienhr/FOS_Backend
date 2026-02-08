const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== MongoDB Connection =====
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/farmer-ordering')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// ===== API Routes =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmer', require('./routes/farmer'));
app.use('/api/admin', require('./routes/admin'));

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// ===== Serve React Frontend (Vite build) =====
if (process.env.NODE_ENV === 'production') {
  // Adjust the path according to your folder structure
  const frontendDistPath = path.join(__dirname, '../frontend/dist');

  // Serve static files from the React frontend
  app.use(express.static(frontendDistPath));

  // Catch-all route to let React handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
