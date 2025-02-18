import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

const HomeScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>WELCOME BACK, SARAH!</Text>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.notificationCard}>
          <Text style={styles.notificationTitle}>Adam's weekly exercises report is now available</Text>
          <Text style={styles.notificationSubtitle}>5/5 assigned exercises completed</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>see more</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.notificationCard}>
          <Text style={styles.notificationTitle}>Sam's assigned exercise update</Text>
          <Text style={styles.notificationSubtitle}>
            "R" sound exercises not completed by due date Nov 20, 2024
          </Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>see more</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Clients Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MY CLIENTS</Text>
        <View style={styles.clientsRow}>
          <View style={styles.clientCard}>
            <Text style={styles.clientName}>Sarah Grey</Text>
            <Text style={styles.clientDetails}>8 years old</Text>
            <Text style={styles.clientDetails}>5 weeks into treatment</Text>
          </View>
          <View style={styles.clientCard}>
            <Text style={styles.clientName}>John Doe</Text>
            <Text style={styles.clientDetails}>10 years old</Text>
            <Text style={styles.clientDetails}>3 weeks into treatment</Text>
          </View>
          <View style={styles.clientCard}>
            <Text style={styles.clientName}>Adam Deer</Text>
            <Text style={styles.clientDetails}>8 years old</Text>
            <Text style={styles.clientDetails}>3 weeks into treatment</Text>
          </View>
        </View>
      </View>

      {/* Exercises Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EXERCISES</Text>
        <View style={styles.exercisesRow}>
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseText}>R</Text>
          </View>
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseText}>S</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF3DD",
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#684503",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#684503",
    marginBottom: 8,
  },
  notificationCard: {
    backgroundColor: "#96C449",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: '50%', // Makes the card occupy 80% of the parent container's width
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  notificationSubtitle: {
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: "#007BFF",
    textDecorationLine: "underline",
  },
  clientsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clientCard: {
    backgroundColor: "#D2B48C",
    padding: 16,
    borderRadius: 8,
    width: "30%",
    alignItems: "center",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  clientDetails: {
    fontSize: 14,
    color: "#000",
  },
  exercisesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  exerciseCard: {
    backgroundColor: "#D2B48C",
    padding: 32,
    borderRadius: 8,
    width: "45%",
    alignItems: "center",
  },
  exerciseText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
});

export default HomeScreen;
