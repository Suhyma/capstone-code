import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigate } from "./hooks/useNavigate";

const HomeScreen = () => {
  const { navigateTo } = useNavigate();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>WELCOME BACK, SARAH!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={() => navigateTo("Login")}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.notificationCard}>
          <Text style={styles.notificationTitle}>Adam's weekly exercises report is now available</Text>
          <Text style={styles.notificationSubtitle}>5/5 assigned exercises completed</Text>
          <TouchableOpacity onPress={() => navigateTo("Clients")}>
            <Text style={styles.linkText}>see more</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.notificationCard}>
          <Text style={styles.notificationTitle}>Sam's assigned exercise update</Text>
          <Text style={styles.notificationSubtitle}>
            "R" sound exercises not completed by due date Mar 19, 2025
          </Text>
          <TouchableOpacity onPress={() => navigateTo("Clients")}>
            <Text style={styles.linkText}>see more</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Clients Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MY CLIENTS</Text>
        <View style={styles.clientsRow}>

        <View style={styles.clientCard}>
          <TouchableOpacity onPress={() => navigateTo("Clients")}>
            <Text style={styles.clientName}>Sarah Grey</Text>
            <Text style={styles.clientDetails}>8 years old</Text>
            <Text style={styles.clientDetails}>5 weeks into treatment</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.clientCard}>
          <TouchableOpacity onPress={() => navigateTo("Clients")}>
            <Text style={styles.clientName}>John Doe</Text>
            <Text style={styles.clientDetails}>10 years old</Text>
            <Text style={styles.clientDetails}>3 weeks into treatment</Text>
          </TouchableOpacity>
        </View>

          <View style={styles.clientCard}>
            <TouchableOpacity onPress={() => navigateTo("Clients")}>
              <Text style={styles.clientName}>Adam Deer</Text>
              <Text style={styles.clientDetails}>8 years old</Text>
              <Text style={styles.clientDetails}>3 weeks into treatment</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* Exercises Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EXERCISES</Text>
        <View style={styles.exercisesRow}>
          {/* "R" Exercise Button */}
          <TouchableOpacity style={styles.exerciseCard} onPress={() => navigateTo("Exercises")}>
            <Text style={styles.exerciseText}>R</Text>
          </TouchableOpacity>

          {/* "S" Exercise Button */}
          <TouchableOpacity style={styles.exerciseCard} onPress={() => navigateTo("Exercises")}>
            <Text style={styles.exerciseText}>S</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF3DD",
    padding: 20,
  },
  header: {
    marginBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#684503",
  },
  signOutButton: {
    backgroundColor: "#684503",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  signOutText: {
    color: "white",
    fontWeight: "bold",
  },
  section: {
    marginTop: 40,
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
    width: "50%",
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
