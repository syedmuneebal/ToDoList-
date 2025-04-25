const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const taskRoutes = require('./routes/taskRoutes');
const { startNotificationService } = require('./notificationService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  startNotificationService();
})
.catch(err => console.log('MongoDB connection error:', err));

// Use routes
app.use('/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.send('To-Do Backend Running!');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));