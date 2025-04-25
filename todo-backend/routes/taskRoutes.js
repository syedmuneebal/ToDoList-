const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, datetime, pushToken } = req.body;
    if (!title || !description || !datetime) {
      return res.status(400).json({ error: 'Title, description, and datetime are required' });
    }
    const newTask = new Task({ title, description, datetime: new Date(datetime), pushToken });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// Get all tasks
router.get('/all', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
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
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { 
        title, 
        description, 
        datetime: datetime ? new Date(datetime) : undefined, 
        pushToken,
        completed: false 
      },
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