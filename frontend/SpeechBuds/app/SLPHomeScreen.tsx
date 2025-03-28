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
        <Text style={styles.sectionTitle}>UPDATES</Text>
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
            "R" sound exercises not completed by due date April 19, 2025
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
            <Text style={styles.clientName}>Gracie Grey</Text>
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
    paddingTop: 50,
    paddingLeft: 75,
    paddingRight: 75,
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
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#684503",
    marginBottom: 20,
  },
  notificationCard: {
    backgroundColor: '#D0DF9A',
    borderColor: "#96C449",
    borderWidth: 2,
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    width: "100%",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  notificationSubtitle: {
    fontSize: 14,
    color: "#000",
    marginBottom: 4,
  },
  linkText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "bold",
    textAlign: 'right',
  },
  clientsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",  // Ensures responsiveness
    gap: 20, // Adds space between client cards
  },
  clientCard: {
    backgroundColor: "#D2B48C",
    borderColor: '#684503',
    borderWidth: 2,
    padding: 15,
    borderRadius: 10,
    width: "30%",
    alignItems: "center",
    marginBottom: 15,
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
    justifyContent: "left",
    flexWrap: "wrap",  // Ensures responsiveness
    gap: 20, // Adds space between client cards
  },
  exerciseCard: {
    backgroundColor: "#D2B48C",
    borderColor: '#684503',
    borderWidth: 2,
    padding: 20,
    borderRadius: 10,
    width: "15%",
    alignItems: "center",
    marginRight: 20,
  },
  exerciseText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#684503",
  },
});

export default HomeScreen;
