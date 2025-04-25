import * as Device from "expo-device";
import * as Notifications from 'expo-notifications';
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { Calendar } from "react-native-calendars";

const API_URL = "http://192.168.97.84:5000/tasks";
const USE_LOCAL_NOTIFICATIONS = true;

export default function App() {
  const [task, setTask] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [currentNotificationId, setCurrentNotificationId] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [updatedTime, setUpdatedTime] = useState("");
  const [updatedDate, setUpdatedDate] = useState("");
  const [pushToken, setPushToken] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [chosenTime, setChosenTime] = useState(new Date());
  const [showUpdateCalendar, setShowUpdateCalendar] = useState(false);
  const [showUpdateTimePicker, setShowUpdateTimePicker] = useState(false);
  const [updatedChosenTime, setUpdatedChosenTime] = useState(new Date());

  useEffect(() => {
    const getPermissions = async () => {
      if (Device.isDevice) {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Denied", "Notifications are disabled.");
            return;
          }
        }
        const token = await Notifications.getExpoPushTokenAsync();
        console.log("Push token:", token.data);
        setPushToken(token.data);
      }
    };
    getPermissions();
    fetchTasks();
  
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      }
    );
  
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
      });
  
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const scheduleLocalNotification = async (taskTitle, taskDescription, datetime) => {
    if (!USE_LOCAL_NOTIFICATIONS) return null;
    try {
      const triggerDate = new Date(datetime);
      const now = new Date();
      if (triggerDate <= now) {
        console.error("Cannot schedule notification for past or current time:", datetime);
        Alert.alert("Error", "Task time must be in the future");
        return null;
      }
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: taskTitle,
          body: taskDescription,
          data: { taskId: taskTitle },
        },
        trigger: {
          date: triggerDate,
        },
      });
      console.log("Local notification scheduled for", taskTitle, "at", triggerDate.toISOString(), "with ID:", identifier);
      return identifier;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      Alert.alert("Error", "Failed to schedule notification");
      return null;
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched tasks:", data);
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      Alert.alert("Error", "Failed to fetch tasks");
    }
  };

  const handleAddTask = async () => {
    if (!task || !description || !time || !date) {
      Alert.alert("Missing Input", "Please enter task, description, date, and time.");
      return;
    }

    const selectedDateObj = new Date(date);
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    if (selectedDateObj < todayStart) {
      Alert.alert("Invalid Date", "Please select a future date.");
      return;
    }

    const datetime = new Date(`${date}T${time}:00`).toISOString();
    const notificationId = await scheduleLocalNotification(task, description, datetime);
    const newTask = {
      title: task,
      description,
      datetime,
      pushToken,
      notificationId,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      const data = await response.json();
      if (response.ok) {
        setTask("");
        setDescription("");
        setTime("");
        setDate("");
        fetchTasks();
        Alert.alert("Success", "Task added successfully");
      } else {
        console.error("Add task failed:", data);
        Alert.alert("Error", data.error || "Failed to add task");
      }
    } catch (error) {
      console.error("Error adding task:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      Alert.alert("Error", "Could not connect to the server");
    }
  };

  const handleDeleteTask = async (taskId, notificationId) => {
    try {
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log("Cancelled notification:", notificationId);
      }
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.message === "Task deleted successfully") {
        fetchTasks();
        Alert.alert("Success", "Task deleted");
      } else {
        Alert.alert("Error", "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Could not connect to the server");
    }
  };

  const handleUpdateTask = async () => {
    if (!updatedTitle || !updatedDescription || !updatedTime || !updatedDate) {
      Alert.alert("Missing Input", "Please enter updated title, description, date, and time.");
      return;
    }

    const datetime = new Date(`${updatedDate}T${updatedTime}:00`).toISOString();
    if (currentNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(currentNotificationId);
      console.log("Cancelled notification:", currentNotificationId);
    }
    const notificationId = await scheduleLocalNotification(updatedTitle, updatedDescription, datetime);
    const updatedTask = {
      title: updatedTitle,
      description: updatedDescription,
      datetime,
      pushToken,
      notificationId,
    };

    try {
      const response = await fetch(`${API_URL}/${currentTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      const data = await response.json();
      if (data.message === "Task updated successfully") {
        fetchTasks();
        setModalVisible(false);
        setUpdatedTitle("");
        setUpdatedDescription("");
        setUpdatedTime("");
        setUpdatedDate("");
        setCurrentNotificationId(null);
        Alert.alert("Success", "Task updated");
      } else {
        Alert.alert("Error", "Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Could not connect to the server");
    }
  };

  const openUpdateModal = (task) => {
    setCurrentTaskId(task._id);
    setUpdatedTitle(task.title);
    setUpdatedDescription(task.description);
    setCurrentNotificationId(task.notificationId);
    const dateObj = new Date(task.datetime);
    setUpdatedDate(dateObj.toISOString().split("T")[0]);
    setUpdatedTime(`${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, "0")}`);
    setUpdatedChosenTime(dateObj);
    setModalVisible(true);
  };

  const handleDateSelect = (day) => {
    setDate(day.dateString);
    setShowCalendar(false);
  };

  const handleUpdateDateSelect = (day) => {
    setUpdatedDate(day.dateString);
    setShowUpdateCalendar(false);
  };

  const showTimePickerModal = () => {
    setShowTimePicker(true);
  };

  const showUpdateTimePickerModal = () => {
    setShowUpdateTimePicker(true);
  };

  const onTimeChange = (event, selectedDate) => {
    const currentTime = selectedDate || chosenTime;
    setShowTimePicker(Platform.OS === "ios");
    setChosenTime(currentTime);
    setTime(`${currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, "0")}`);
  };

  const onUpdateTimeChange = (event, selectedDate) => {
    const currentTime = selectedDate || updatedChosenTime;
    setShowUpdateTimePicker(Platform.OS === "ios");
    setUpdatedChosenTime(currentTime);
    setUpdatedTime(`${currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, "0")}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>📝 To-Do Reminder</Text>

        <TextInput
          placeholder="What do you want to do?"
          style={styles.input}
          value={task}
          onChangeText={setTask}
        />

        <TextInput
          placeholder="Description"
          style={styles.input}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity onPress={() => setShowCalendar(true)}>
          <TextInput
            placeholder="Select Date"
            style={styles.input}
            value={date}
            editable={false}
          />
        </TouchableOpacity>

        {showCalendar && (
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={{ [date]: { selected: true, selectedColor: "blue" } }}
            minDate={new Date().toISOString().split("T")[0]}
          />
        )}

        <TouchableOpacity onPress={showTimePickerModal}>
          <TextInput
            placeholder="Select Time"
            style={styles.input}
            value={time}
            editable={false}
          />
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={chosenTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={onTimeChange}
          />
        )}

        <TouchableOpacity style={styles.button} onPress={handleAddTask}>
          <Text style={styles.buttonText}>Add Task</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Your Tasks</Text>

        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#aaa" }}>
              No tasks yet.
            </Text>
          }
          renderItem={({ item }) => {
            const dateObj = new Date(item.datetime);
            const date = dateObj.toISOString().split("T")[0];
            const time = `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
            return (
              <View style={styles.taskCard}>
                <Text style={styles.taskText}>
                  📅 {date} 🕒 {time}
                </Text>
                <Text style={styles.taskDesc}>{item.title}</Text>
                <Text style={styles.taskDesc}>{item.description}</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTask(item._id, item.notificationId)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={() => openUpdateModal(item)}
                  >
                    <Text style={styles.buttonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalWrapper}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Update Task</Text>
              <TextInput
                style={styles.input}
                value={updatedTitle}
                onChangeText={setUpdatedTitle}
                placeholder="New Title"
              />
              <TextInput
                style={styles.input}
                value={updatedDescription}
                onChangeText={setUpdatedDescription}
                placeholder="New Description"
              />
              <TouchableOpacity onPress={() => setShowUpdateCalendar(true)}>
                <TextInput
                  placeholder="Select Date"
                  style={styles.input}
                  value={updatedDate}
                  editable={false}
                />
              </TouchableOpacity>
              {showUpdateCalendar && (
                <Calendar
                  onDayPress={handleUpdateDateSelect}
                  markedDates={{
                    [updatedDate]: { selected: true, selectedColor: "blue" },
                  }}
                  minDate={new Date().toISOString().split("T")[0]}
                />
              )}
              <TouchableOpacity onPress={showUpdateTimePickerModal}>
                <TextInput
                  placeholder="Select Time"
                  style={styles.input}
                  value={updatedTime}
                  editable={false}
                />
              </TouchableOpacity>
              {showUpdateTimePicker && (
                <DateTimePicker
                  value={updatedChosenTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={onUpdateTimeChange}
                />
              )}
              <TouchableOpacity
                style={styles.button}
                onPress={handleUpdateTask}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20 },
  title: { fontSize: 24, textAlign: "center", fontWeight: "bold", marginBottom: 20 },
  input: { height: 50, borderColor: "#ccc", borderWidth: 1, borderRadius: 10, marginBottom: 10, paddingLeft: 10 },
  button: { backgroundColor: "#007bff", padding: 10, borderRadius: 5, marginBottom: 10 },
  buttonText: { color: "#fff", textAlign: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 20 },
  taskCard: { backgroundColor: "#f9f9f9", padding: 15, borderRadius: 10, marginBottom: 10 },
  taskText: { fontSize: 16, fontWeight: "bold" },
  taskDesc: { fontSize: 14, color: "#555", marginVertical: 5 },
  buttonGroup: { flexDirection: "row", justifyContent: "space-between" },
  deleteButton: { backgroundColor: "red", padding: 5, borderRadius: 5 },
  updateButton: { backgroundColor: "green", padding: 5, borderRadius: 5 },
  modalWrapper: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: { width: "80%", backgroundColor: "white", padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});