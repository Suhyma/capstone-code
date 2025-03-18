import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackParamList } from './types';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigate } from "./hooks/useNavigate";

const ChildHomeScreen = () => {
  const { navigateTo } = useNavigate(); // Get the function

  return (
    <View style={styles.container}>
      {/* Left Section - Garden Grid */}
      <View style={styles.gardenContainer}>
        <View style={styles.gardenBox}>
          <Text style={styles.emoji}>🌽🌽🌽🌽</Text>
          <Text style={styles.emoji}>🌽🌽🌽🌽</Text>
          <Text style={styles.emoji}>🌸🌸🌸🌸</Text>
          <Text style={styles.emoji}>🍓🍓🍓🍓</Text>
          <TouchableOpacity
              style={styles.plantingButton}
              onPress={() => navigateTo("GardenGame")}
            >
              <Text style={styles.plantingButtonText}>Let's plant your garden!</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* Right Section - Task List */}
      <View style={styles.taskListContainer}>
        <Text style={styles.header}>Assigned Exercises</Text>

        <ScrollView>
          {tasks.map((task, index) => (
            <TouchableOpacity
              key={index}
              style={styles.taskCard}
              onPress={() => navigateTo("Demo", { wordSet: task.words, currentIndex: 0})}
            >
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDetails}>Due Date: {task.dueDate}</Text>
              <Text style={styles.taskDetails}>Seeds Available: {task.seeds}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={() => navigateTo("Login")}>
      <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const tasks = [
  { title: 'S Sound Initial', dueDate: 'March 21, 2025', seeds: 55,  words: ['Summer', 'Stain', 'Silly', 'Sock', 'Say'], wordCount: 0 },
  { title: 'R Sound Medial', dueDate: 'March 21, ', seeds: 55,  words: ['Carrot', 'Berry', 'Corn', 'Arrow', 'Parent'], wordCount: 0},
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row", // Set main layout to row
    backgroundColor: "#A4D65E", // Green background
    padding: 10,
  },
  gardenContainer: {
    flex: 1, // Takes half the screen
    alignItems: "center",
    justifyContent: "center",
  },
  gardenBox: {
    width: "90%",
    height: "90%",
    backgroundColor: "#D9B382", // Brown background
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  emoji: {
    fontSize: 24,
    textAlign: "center",
  },
  taskListContainer: {
    flex: 1, // Takes half the screen
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  taskCard: {
    backgroundColor: "#B48A5A",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  taskDetails: {
    fontSize: 14,
    color: "#444",
  },
  plantingButton: {
    position: "absolute",
    bottom: 10,
    right: 15, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  plantingButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  signOutButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#5A3E1B",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signOutText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});


export default ChildHomeScreen;
