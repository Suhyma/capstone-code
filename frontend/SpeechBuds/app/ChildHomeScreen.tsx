import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import {Link} from 'expo-router';

const GrowingScreen = () => {
  return (
    <View style={styles.container}>
      {/* Left Section - Garden Grid */}
      <View style={styles.gardenContainer}>
        <View style={styles.gardenBox}>
          {/* Placeholder for plants/icons */}
          <Text style={styles.emoji}>🌽🌽🌽🌽</Text>
          <Text style={styles.emoji}>🌽🌽🌽🌽</Text>
          <Text style={styles.emoji}>🌸🌸🌸🌸</Text>
          <Text style={styles.emoji}>🍓🍓🍓🍓</Text>
        </View>
      </View>
      
      {/* Right Section - Task List */}
      <View style={styles.title}>
        <Text style={styles.header}>LET'S GET GROWING!</Text>
        
        <ScrollView>
        {tasks.map((task, index) => (
          <Link href = "/Demo" key={index} style={styles.taskCard}>
            <View>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDetails}>Due Date: {task.dueDate}</Text>
              <Text style={styles.taskDetails}>Seeds Available: {task.seeds}</Text>
            </View>
          </Link>
          ))}
        </ScrollView>
      
      </View>
    </View>
  );
};

const tasks = [
  { title: '"R" Sound Initial', dueDate: 'Feb 28, 2024', seeds: 55 },
  { title: '"R" Sound Medial', dueDate: 'Feb 28, 2024', seeds: 55 },
  { title: '"R" Sound Final', dueDate: 'Mar 7, 2024', seeds: 55 },
  { title: '"Th" Sound Initial', dueDate: 'Mar 7, 2024', seeds: 55 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#88C040", // Green background
    padding: 10,
  },
  gardenContainer: {
    flex: 1,
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
  title: {
    flex: 1,
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
});

export default GrowingScreen;
