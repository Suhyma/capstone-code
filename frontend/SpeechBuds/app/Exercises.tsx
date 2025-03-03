import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackParamList } from './types';
import { StackNavigationProp } from "@react-navigation/stack";

type NavigationProp = StackNavigationProp<StackParamList, 'Exercises'>;

const ExercisesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>{"<"}</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Image source={require('@/assets/images/Flower.png')} style={styles.profileIcon} />
        <Text style={styles.title}>EXERCISES</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Image source={require('@/assets/images/Flower.png')} style={styles.settingsIcon} />
        </TouchableOpacity>
      </View>

      {/* Exercise Info */}
      <View style={styles.exerciseContainer}>
        <View style={styles.circle}>
          <Text style={styles.letter}>R</Text>
        </View>
        <Text style={styles.description}>
          Assign exercises that help with practicing “R” sounds
        </Text>
      </View>

      {/* Words Section */}
      <Text style={styles.sectionTitle}>WORDS</Text>
      <View style={styles.cardsContainer}>
        {/* Initial */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>initial</Text>
          <Text style={styles.cardText}>
            Assign from a list of R sounds at the beginning of words
          </Text>
          <TouchableOpacity style={styles.assignButton} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.assignText}>assign</Text>
          </TouchableOpacity>
        </View>

        {/* Medial */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>medial</Text>
          <Text style={styles.cardText}>
            Assign from a list of R sounds in the middle of words
          </Text>
          <TouchableOpacity style={styles.assignButton} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.assignText}>assign</Text>
          </TouchableOpacity>
        </View>

        {/* Final */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>final</Text>
          <Text style={styles.cardText}>
            Assign from a list of R sounds in the final position of words
          </Text>
          <TouchableOpacity style={styles.assignButton} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.assignText}>assign</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal */}
      <Modal transparent visible={isModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>R INITIAL</Text>
            <Text style={styles.modalSubtitle}>Selected words</Text>

            {/* Word List */}
            <View style={styles.wordList}>
              <Text style={styles.word}>✅ Rose</Text>
              <Text style={styles.word}>✅ Red</Text>
              <Text style={styles.word}>✅ Run</Text>
              <Text style={styles.word}>✅ Rug</Text>
              <Text style={styles.word}>✅ Rice</Text>
            </View>

            <Text style={styles.wordCount}>5/5 words selected</Text>

            {/* Continue Button */}
            <TouchableOpacity style={styles.continueButton} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExercisesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8EFCF",
    padding: 20,
  },
  backButton: {
    position: "absolute",
    top: 30,
    left: 20,
    zIndex: 10,
  },
  backText: {
    fontSize: 24,
    color: "#654321",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileIcon: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#654321",
  },
  settingsButton: {
    padding: 5,
  },
  settingsIcon: {
    width: 25,
    height: 25,
  },
  exerciseContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#A5D67D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  letter: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  description: {
    fontSize: 16,
    color: "#654321",
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#654321",
    marginBottom: 10,
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#C8A16A",
    padding: 15,
    borderRadius: 10,
    width: "30%",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#654321",
    marginBottom: 5,
  },
  cardText: {
    fontSize: 12,
    color: "#654321",
    textAlign: "center",
    marginBottom: 10,
  },
  assignButton: {
    backgroundColor: "#654321",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  assignText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#C8A16A",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#654321",
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3D2601",
    marginBottom: 10,
  },
  wordList: {
    marginBottom: 10,
  },
  word: {
    fontSize: 16,
    color: "#3D2601",
  },
  wordCount: {
    fontSize: 14,
    color: "#3D2601",
    marginBottom: 15,
  },
  continueButton: {
    backgroundColor: "#654321",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  continueText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
