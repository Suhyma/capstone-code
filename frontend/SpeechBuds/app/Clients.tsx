import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useNavigate } from "./hooks/useNavigate";
import { LineChart } from "react-native-chart-kit";
import { Card, Checkbox } from "react-native-paper";

const ClientDetailsScreen: React.FC = () => {
  const { navigateTo } = useNavigate();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateTo("SLPHomeScreen")}>
          <Text style={styles.backText}>← My Clients</Text>
        </TouchableOpacity>
      </View>

      {/* Client Info */}
      <View style={styles.clientInfo}>
        <Image source={{ uri: "https://via.placeholder.com/80" }} style={styles.clientImage} />
        <View>
          <Text style={styles.clientName}>Adam Deer</Text>
        </View>
        <View>
          <Text>Age: 8 years old</Text>
          <Text>Start date: Nov 5, 2024</Text>
          <Text>Treatment Length: 6 months</Text>
        </View>
      </View>

      {/* Weekly Goals & Progress in One Row */}
      <View style={styles.goalsAndProgressContainer}>
        {/* Weekly Goals */}
        <View style={styles.weeklyGoals}>
          <Text style={styles.sectionTitle}>Weekly Goals</Text>
          <View style={styles.checkboxContainer}>
            <Checkbox status="unchecked" />
            <Text>"R" initial x 3</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <Checkbox status="unchecked" />
            <Text>"R" medial x 3</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <Checkbox status="unchecked" />
            <Text>"R" final x 3</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.assignNewGoals}>+ Assign new goals</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Chart */}
        <View style={styles.progress}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <LineChart
            data={{
              labels: ["S", "M", "T", "W", "T", "F", "S"],
              datasets: [{ data: [5, 10, 7, 15, 12, 18, 8] }],
            }}
            width={280}
            height={180}
            chartConfig={{
              backgroundColor: "#FFF",
              backgroundGradientFrom: "#FFF",
              backgroundGradientTo: "#FFF",
              color: (opacity = 1) => `rgba(0, 128, 0, ${opacity})`,
            }}
            bezier
            style={styles.chartStyle}
          />
        </View>
      </View>

      {/* Session History */}
      <Text style={styles.sessionHistoryTitle}>Session History</Text>
      <View style={styles.sessionHistoryContainer}>
        {[1, 2, 3, 4].map((_, index) => (
          <Card key={index} style={styles.sessionTile}>
            {/* Header Row */}
            <View style={styles.sessionRow}>
              <Text style={styles.exerciseLabel}>Exercise</Text>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={styles.timeLabel}>Time</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
            {/* Data Row */}
            <View style={styles.sessionRow}>
              <Text style={styles.exerciseData}>R initial</Text>
              <Text style={styles.dateData}>Nov 11, 2024</Text>
              <Text style={styles.timeData}>10:35 AM</Text>
              <Text style={styles.scoreData}>3/5</Text>
            </View>
            {/* See More Button (on its own row) */}
            <View style={styles.seeMoreContainer}>
              <TouchableOpacity>
                <Text style={styles.seeMore}>see more</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8EECF",
    paddingTop: 50,
    paddingLeft: 75,
    paddingRight: 75,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6D4C41",
  },
  clientInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
  },
  clientImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  clientName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6D4C41",
  },
  goalsAndProgressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  weeklyGoals: {
    backgroundColor: "#C5E1A5",
    padding: 12, // Reduced padding to reduce the height
    borderRadius: 10,
    borderColor: "#2E7D32",
    borderWidth: 2,
    width: "48%",
  },
  progress: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12, // Reduced padding to reduce the height
    borderColor: "#B0B0B0",
    borderWidth: 2,
    width: "48%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  assignNewGoals: {
    color: "#2E7D32",
    fontWeight: "bold",
    marginTop: 10,
  },
  chartStyle: {
    borderRadius: 10,
  },
  sessionHistoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 10,
  },
  sessionHistoryContainer: {
    marginBottom: 30,
  },
  sessionTile: {
    backgroundColor: "#D7C29E",
    padding: 10, // Reduced padding to reduce the height of the tile
    marginBottom: 20,
    borderRadius: 10,
    borderColor: "#3E2723",
    borderWidth: 2,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Ensures items are evenly spaced
    width: "100%",
    marginBottom: 5, // Reduced margin to reduce the height
  },
  exerciseLabel: {
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  dateLabel: {
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  timeLabel: {
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  scoreLabel: {
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  exerciseData: {
    textAlign: "center",
    flex: 1,
  },
  dateData: {
    textAlign: "center",
    flex: 1,
  },
  timeData: {
    textAlign: "center",
    flex: 1,
  },
  scoreData: {
    textAlign: "center",
    flex: 1,
  },
  seeMoreContainer: {
    marginTop: 5, // Reduced margin to make the see more button closer
    alignItems: "flex-end", // Aligns "see more" to the far right
  },
  seeMore: {
    color: "#3E2723",
    fontWeight: "bold",
  },
});

export default ClientDetailsScreen;
