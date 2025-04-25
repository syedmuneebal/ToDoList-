const cron = require('node-cron');
const { Expo } = require('expo-server-sdk');
const Task = require('./models/Task');

const expo = new Expo();
const startNotificationService = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const tasks = await Task.find({
        datetime: {
          $gte: new Date(now.getTime() - 60000), 
          $lte: now,
        },
        completed: false,
      });

      for (const task of tasks) {
        if (task.pushToken && Expo.isExpoPushToken(task.pushToken)) {
          const messages = [
            {
              to: task.pushToken,
              sound: 'default',
              title: `Reminder: ${task.title}`,
              body: task.description,
              data: { taskId: task._id },
            },
          ];

          try {
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
              await expo.sendPushNotificationsAsync(chunk);
            }
            task.completed = true;
            await task.save();
            console.log(`Notification sent for task: ${task.title}`);
          } catch (error) {
            console.error(`Error sending notification for task ${task._id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in notification service:', error);
    }
  });
};

module.exports = { startNotificationService };