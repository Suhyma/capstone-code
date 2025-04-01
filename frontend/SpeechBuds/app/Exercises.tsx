import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from "react-native";
import CheckBox from "expo-checkbox";
import { useNavigate } from "./hooks/useNavigate";
import { Picker } from "@react-native-picker/picker";

const ExercisesScreen = () => {
  const { navigateTo } = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [modalTitle, setModalTitle] = useState("R INITIAL");
  const [selectedClient, setSelectedClient] = useState("Gracie Grey");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [selectedRepeat, setSelectedRepeat] = useState("daily");

  const clients = ["Gracie Grey", "John Doe", "Adam Deer"];
  const repeatOptions = ["daily", "four times a week", "two times a week", "once a week"];
  const dates = Array.from({ length: 180 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split("T")[0];
  });

  const initialWords = ["Rose", "Red", "Ribbon", "Ring", "River", "Radio", "Rocket", "Road", "Rain", "Rabbit", "Raisin", "Race"];
  const medialWords = ["Carrot", "Parrot", "Cherry", "Hurry", "Berry", "Mirror", "Caring", "Worry", "Fairy", "Horror", "Marry", "Carry"];
  const finalWords = ["Star", "Car", "Guitar", "Bear", "Deer", "Door", "Far", "Tar", "Bar", "Jar", "Scar", "War"];
  const maxSelection = 5;

  const openModal = (title: string) => {
    setModalTitle(title);
    setIsModalVisible(true);
  };

  const getWords = () => {
    if (modalTitle === "R INITIAL") return initialWords;
    if (modalTitle === "R MEDIAL") return medialWords;
    return finalWords;
  };

  const toggleWordSelection = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else if (selectedWords.length < maxSelection) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateTo("SLPHomeScreen")}>
          <Text style={styles.backText}>← Homepage</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>EXERCISES</Text>

      <View style={styles.headerContainer}>
        <View style={styles.circle}>
          <Text style={styles.circleText}>R</Text>
        </View>
        <Text style={styles.headerText}>Assign exercises that help with practicing “R” sounds</Text>
      </View>

      <Text style={styles.subtitle}>WORDS</Text>

      <View style={styles.cardsContainer}>
        <TouchableOpacity style={styles.card} onPress={() => openModal("R INITIAL")}> 
          <Text style={styles.cardTitle}>Initial</Text>
          <Text style={styles.cardDesciption}>Assign from a list of R sounds at the beginning of words</Text>
          <Text style={styles.assignText}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => openModal("R MEDIAL")}> 
          <Text style={styles.cardTitle}>Medial</Text>
          <Text style={styles.cardDesciption}>Assign from a list of R sounds in the middle of words</Text>
          <Text style={styles.assignText}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => openModal("R FINAL")}> 
          <Text style={styles.cardTitle}>Final</Text>
          <Text style={styles.cardDesciption}>Assign from a list of R sounds at the end of words</Text>
          <Text style={styles.assignText}>Assign</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent visible={isModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <FlatList
              data={getWords()}
              numColumns={3}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <View style={styles.wordItem}>
                  <CheckBox value={selectedWords.includes(item)} onValueChange={() => toggleWordSelection(item)} />
                  <Text style={styles.wordText}>{item}</Text>
                </View>
              )}
            />
            <Text style={styles.wordCountText}>{selectedWords.length}/{maxSelection} Words Selected</Text>

            <TouchableOpacity style={styles.continueButton} onPress={() => setIsScheduleModalVisible(true)}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isScheduleModalVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Assign Exercise</Text>
            <Text style={styles.sectionHeading}>Client</Text>
            <Picker selectedValue={selectedClient} onValueChange={setSelectedClient}>{clients.map((client) => (<Picker.Item key={client} label={client} value={client} />))}</Picker>
            
            <Text style={styles.sectionHeading}>Start Date</Text>
            <Picker selectedValue={selectedStartDate} onValueChange={setSelectedStartDate}>{dates.map((date) => (<Picker.Item key={date} label={date} value={date} />))}</Picker>
            
            <Text style={styles.sectionHeading}>End Date</Text>
            <Picker selectedValue={selectedEndDate} onValueChange={setSelectedEndDate}>{dates.map((date) => (<Picker.Item key={date} label={date} value={date} />))}</Picker>
            
            <Text style={styles.sectionHeading}>Repeat</Text>
            <Picker selectedValue={selectedRepeat} onValueChange={setSelectedRepeat}>{repeatOptions.map((option) => (<Picker.Item key={option} label={option} value={option} />))}</Picker>
            
            <TouchableOpacity style={styles.closeButton} 
              onPress={() => {
                setIsScheduleModalVisible(false);
                setIsModalVisible(false);
              }}
            >
              <Text style={styles.continueText}>Assign</Text>
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
    backgroundColor: "#FAF3DD",
    paddingTop: 50,
    paddingLeft: 75,
    paddingRight: 75,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10 
  },
  backText: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#6D4C41" 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "#6D4C41", 
    textAlign: "center", 
    marginBottom: 20 
  },
  description: { fontSize: 16, color: "#6D4C41", flexShrink: 1 },
  headerContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  circle: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#D0DF9A", justifyContent: "center", alignItems: "center", marginRight: 10 },
  circleText: { fontSize: 24, fontWeight: "bold", color: "#205E0B" },
  headerText: { fontSize: 18, fontWeight: "bold", color: "#3E2723", flexShrink: 1 },
  subtitle: { fontSize: 16, fontWeight: "bold", color: "#3E2723", marginTop: 20, marginBottom: 10},
  sectionHeading: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 5, marginTop: 15 },
  cardsContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 30 },
  card: { backgroundColor: "#D7C29E", padding: 10, borderRadius: 10, width: "20%", alignItems: "center", borderColor: "#3E2723", borderWidth: 2 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#3E2723", marginBottom: 5 },
  cardDesciption: { fontSize: 12, color: "#3E2723", marginBottom: 10, alignItems: "center" },
  assignText: { color: "white", fontSize: 14, fontWeight: "bold", backgroundColor: "#684503", padding: 5, borderRadius: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#D7C29E", padding: 20, borderRadius: 10, width: "80%", alignItems: "center", borderColor: "#3E2723", borderWidth: 2 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#3E2723", marginBottom: 5 },
  wordItem: { flexDirection: "row", alignItems: "center", margin: 10 },
  wordText: { fontSize: 16, color: "#3E2723", marginLeft: 8 },
  continueButton: { backgroundColor: "#684503", paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5 },
  continueText: { color: "#FFF", fontWeight: "bold" },
  closeButton: { backgroundColor: "#684503", paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5, color: "#FFF", fontWeight: "bold", marginTop: 20 },
  wordCountText: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: "#3E2723", 
    marginVertical: 10, 
    textAlign: "center" 
  },
});
