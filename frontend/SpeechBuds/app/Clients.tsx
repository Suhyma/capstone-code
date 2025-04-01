import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Modal } from "react-native";
import { useNavigate } from "./hooks/useNavigate";
import { LineChart } from "react-native-chart-kit";
import { Card, Checkbox } from "react-native-paper";

const ClientDetailsScreen: React.FC = () => {
  const { navigateTo } = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const sessions = [
    {
      exercise: "R Initial",
      date: "April 9, 2024",
      time: "10:35 AM",
      score: "3/5",
      words: [
        { word: "Rose", correct: true, attempts: 3 },
        { word: "Red", correct: true, attempts: 3 },
        { word: "Ribbon", correct: false, attempts: 3 },
        { word: "Rile", correct: false, attempts: 3 },
        { word: "River", correct: true, attempts: 1 },
      ],
    },
    {
      exercise: "R Initial",
      date: "April 11, 2024",
      time: "9:15 AM",
      score: "4/5",
      words: [
        { word: "Rain", correct: true, attempts: 2 },
        { word: "Rabbit", correct: true, attempts: 3 },
        { word: "Rocket", correct: true, attempts: 2 },
        { word: "Radish", correct: false, attempts: 3 },
        { word: "Rope", correct: true, attempts: 1 },
      ],
    },
    {
      exercise: "R Initial",
      date: "April 13, 2024",
      time: "2:00 PM",
      score: "2/5",
      words: [
        { word: "Red", correct: true, attempts: 3 },
        { word: "Road", correct: false, attempts: 2 },
        { word: "Right", correct: false, attempts: 3 },
        { word: "Ring", correct: true, attempts: 1 },
        { word: "Roof", correct: false, attempts: 3 },
      ],
    },
    {
      exercise: "R Initial",
      date: "April 19, 2024",
      time: "11:45 AM",
      score: "5/5",
      words: [
        { word: "Rose", correct: true, attempts: 1 },
        { word: "Rug", correct: true, attempts: 1 },
        { word: "Race", correct: true, attempts: 1 },
        { word: "Ranch", correct: true, attempts: 1 },
        { word: "Rat", correct: true, attempts: 1 },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateTo("SLPHomeScreen")}>
          <Text style={styles.backText}>← Homepage</Text>
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
            <Checkbox status="checked" />
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
          <TouchableOpacity onPress={() => navigateTo("Exercises")}>
            <Text style={styles.assignNewGoals}>+ Assign new goals</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Chart */}
        <View style={styles.progress}>
          <Text style={styles.sectionTitle}>Progress: Minutes Practiced Per Day</Text>
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
        {sessions.map((session, index) => (
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
              <Text style={styles.exerciseData}>{session.exercise}</Text>
              <Text style={styles.dateData}>{session.date}</Text>
              <Text style={styles.timeData}>{session.time}</Text>
              <Text style={styles.scoreData}>{session.score}</Text>
            </View>
            {/* See More Button (on its own row) */}
            <View style={styles.seeMoreContainer}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSession(session);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.seeMore}>see more</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </View>
      
      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedSession && (
              <>
                <Text style={styles.modalTitle}>{selectedSession.exercise}</Text>
                <Text style={styles.modalSubtitle}>{selectedSession.date} - {selectedSession.time}</Text>
                <Text style={styles.modalScore}>{selectedSession.score} words correct</Text>
                {selectedSession.words.map((word: { word: string; correct: boolean; attempts: number }, index: number) => (
                  <View key={index} style={styles.wordRow}>
                    <Text style={[styles.wordText, word.correct ? styles.correctWord : styles.incorrectWord]}>
                      {word.word}
                    </Text>
                    <Text>Attempted {word.attempts} {word.attempts > 1 ? "times" : "time"}</Text>
                  </View> 
                ))}
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#D7C29E",
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#6D4C41",
    marginBottom: 10,
  },
  modalScore: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    marginBottom: 15,
  },
  wordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 5,
  },
  correctWord: {
    color: "green",
  },
  incorrectWord: {
    color: "red",
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: "#3E2723",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  wordText: {
    color: "white",
    fontWeight: "bold",
  }
});

export default ClientDetailsScreen;
