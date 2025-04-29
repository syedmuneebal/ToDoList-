const express = require('express');
const moment = require('moment-timezone');
const router = express.Router();
const Task = require('../models/task');

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, datetime, pushToken } = req.body;
    if (!title || !description || !datetime || !pushToken) {
      return res.status(400).json({ error: 'Title, description, and datetime are required' });
    }

    const datetimeIST = moment.tz(datetime, "Asia/Kolkata").toDate();
    const newTask = new Task({ title, description, datetime: datetimeIST, pushToken });
    await newTask.save();

    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error adding task:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
  
});

// Get all tasks with 
router.get('/all', async (req, res) => {
  try {
    const tasks = await Task.find();

    const istTasks = tasks.map(task => {
      return {
        ...task.toObject(),
        datetime: moment(task.datetime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss Z'),
        createdAt: moment(task.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss Z'),
        updatedAt: moment(task.updatedAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss Z'),
      };
    });

    res.status(200).json(istTasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Delete a task by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, datetime, pushToken } = req.body;

  try {
    let updatedFields = { title, description, pushToken, completed: false };

    if (datetime) {
      updatedFields.datetime = moment.tz(datetime, "Asia/Kolkata").toDate();
    }
    

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updatedFields,
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

module.exports = router;