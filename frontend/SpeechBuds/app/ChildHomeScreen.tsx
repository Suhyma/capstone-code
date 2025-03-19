import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, 
  SafeAreaView, Image 
} from "react-native";
import { useNavigate } from "./hooks/useNavigate";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const gardenItems = [
  { id: 1, image: require("@/assets/images/Corn.png") },
  { id: 2, image: require("@/assets/images/Flower.png") },
  { id: 3, image: require("@/assets/images/Strawberry.png") },
];

const MAX_PLANTS = 10; // Planting limit

const ChildHomeScreen = () => {
  const { navigateTo } = useNavigate();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);
  
  const [plantedItems, setPlantedItems] = useState<{ id: number; x: number; y: number; image: any }[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ id: number; image: any } | null>(null);
  const [gardenSize, setGardenSize] = useState<{ width: number; height: number; xOffset: number; yOffset: number }>({ width: 0, height: 0, xOffset: 0, yOffset: 0 });
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  const [plantCount, setPlantCount] = useState(0); // Track the number of planted items

  // Handle planting action when the garden is clicked
  const handlePlant = (event: any) => {
    if (!selectedItem || gardenSize.width === 0 || gardenSize.height === 0) return;

    if (plantCount >= MAX_PLANTS) {
      setShowLimitMessage(true);
      return;
    }

    // Get touch coordinates relative to the garden container
    const touchX = event.nativeEvent.locationX;
    const touchY = event.nativeEvent.locationY;

    // Make sure the plant is inside the garden bounds (optional)
    if (touchX < 0 || touchY < 0 || touchX > gardenSize.width || touchY > gardenSize.height) {
      return; // Do nothing if the touch is outside the garden
    }

    // Add the new plant to the list
    setPlantedItems((prev) => {
      const newPlantedItems = [
        ...prev,
        { id: Date.now(), x: touchX, y: touchY, image: selectedItem.image },
      ];
      setPlantCount(newPlantedItems.length); // Update the plant count
      return newPlantedItems;
    });
  };

  // Update screen dimensions when orientation changes
  useEffect(() => {
    const updateDimensions = () => {
      const newWidth = Dimensions.get("window").width;
      const newHeight = Dimensions.get("window").height;
      setScreenWidth(newWidth);
      setScreenHeight(newHeight);
      setIsPortrait(newHeight > newWidth);
    };

    updateDimensions();
    const subscription = Dimensions.addEventListener("change", updateDimensions);
    return () => subscription.remove();
  }, []);

  // Load planted items from AsyncStorage when the component mounts
  useEffect(() => {
    const loadPlantedItems = async () => {
      try {
        const storedPlantedItems = await AsyncStorage.getItem('plantedItems');
        if (storedPlantedItems) {
          setPlantedItems(JSON.parse(storedPlantedItems));
          setPlantCount(JSON.parse(storedPlantedItems).length); // Set the count based on stored items
        }
      } catch (error) {
        console.error("Error loading planted items:", error);
      }
    };

    loadPlantedItems();
  }, []);

  // Save planted items to AsyncStorage whenever they change
  useEffect(() => {
    const savePlantedItems = async () => {
      try {
        await AsyncStorage.setItem('plantedItems', JSON.stringify(plantedItems));
      } catch (error) {
        console.error("Error saving planted items:", error);
      }
    };

    savePlantedItems();
  }, [plantedItems]);

  // Reset the screen (clear planted items and count)
  const resetScreen = async () => {
    setPlantedItems([]);  // Clear the planted items
    setPlantCount(0);     // Reset the plant count
    setShowLimitMessage(false);  // Hide the limit message

    await AsyncStorage.removeItem('plantedItems');  // Clear the AsyncStorage
  };

  useEffect(() => {
    return () => {
      // Reset the screen when the user navigates away (if applicable)
      resetScreen();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.signOutButton} onPress={() => navigateTo("Login")}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Task List (Top Half) */}
      <View style={styles.taskListContainer}>
        {/* Title for Assigned Exercises */}
        <Text style={styles.assignedExercisesTitle}>Assigned Exercises</Text>

        <ScrollView>
          {tasks.map((task, index) => (
            <TouchableOpacity
              key={index}
              style={styles.taskCard}
              onPress={() => navigateTo("Demo", { wordSet: task.words, currentIndex: 0 })}
            >
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDetails}>Due Date: {task.dueDate}</Text>
              <Text style={styles.taskDetails}>Seeds Available: {task.seeds}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Garden (Bottom Half) */}
      <View style={styles.gardenWrapper}>
        {/* Title */}
        <Text style={styles.gardenTitle}>Let's Plant Your Garden!</Text>

        {/* Garden Box */}
        <TouchableOpacity
          style={styles.gardenBox}
          activeOpacity={1}
          onPress={handlePlant}
          onLayout={(event) => {
            const { width, height, x, y } = event.nativeEvent.layout;
            setGardenSize({ width, height, xOffset: x, yOffset: y });
          }}
        >
          {plantedItems.map((item) => (
            <Image key={item.id} source={item.image} style={[styles.plantedItem, { left: item.x, top: item.y }]} />
          ))}
        </TouchableOpacity>

        {/* Selection Bar Positioned Below the Garden */}
        <View style={styles.selectionBar}>
          {gardenItems.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => setSelectedItem(item)}>
              <Image source={item.image} style={[styles.selectionImage, selectedItem?.id === item.id && styles.selected]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gray Pop-Up Message with Close Button */}
      {showLimitMessage && (
        <View style={styles.limitMessage}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowLimitMessage(false)}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>

          <Text style={styles.limitMessageText}>Complete an exercise to plant more seeds.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const tasks = [
  { title: "S Sound Initial", dueDate: "March 21, 2025", seeds: 55, words: ["Summer", "Stain", "Silly", "Sock", "Say"] },
  { title: "R Sound Medial", dueDate: "March 21, 2025", seeds: 55, words: ["Carrot", "Berry", "Corn", "Arrow", "Parent"] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#A4D65E", padding: 10 },

  taskListContainer: { 
    flex: 1,  // Takes up the top half of the screen
    padding: 10,
    marginTop: 40, // Increased margin to move the content further down
  },

  assignedExercisesTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",  // Centering the title
    marginBottom: 10,
  },

  taskCard: { backgroundColor: "#B48A5A", padding: 12, borderRadius: 8, marginBottom: 10 },
  taskTitle: { fontSize: 18, fontWeight: "bold" },
  taskDetails: { fontSize: 14, color: "#444" },

  gardenWrapper: { 
    flex: 1,  // Takes up the bottom half of the screen
    alignItems: "center", 
    justifyContent: "center" 
  },

  gardenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center"
  },

  gardenBox: { 
    width: "90%", 
    height: "70%", 
    backgroundColor: "#D9B382", 
    borderRadius: 10, 
    borderWidth: 5, // Dark brown border added
    borderColor: "#5A3E1B", 
    padding: 10, 
    position: "relative" 
  },

  plantedItem: { width: 30, height: 30, position: "absolute" },

  selectionBar: { 
    width: "90%", 
    flexDirection: "row", 
    justifyContent: "center", 
    padding: 10, 
    backgroundColor: "#6B8E23",
    borderBottomLeftRadius: 10, 
    borderBottomRightRadius: 10,
    marginTop: -10 
  },

  selectionImage: { width: 50, height: 50, marginHorizontal: 10 },
  selected: { borderWidth: 2, borderColor: "white", borderRadius: 10 },

  signOutButton: { position: "absolute", top: 15, right: 15, backgroundColor: "#5A3E1B", borderRadius: 5, padding: 5 },
  signOutText: { color: "white", fontWeight: "bold", fontSize: 16 },

  limitMessage: {
    position: "absolute",
    top: "40%",
    left: "20%",
    width: "60%",
    padding: 20,
    backgroundColor: "#808080",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  limitMessageText: { fontSize: 16, color: "white", fontWeight: "bold", textAlign: "center" },
  closeButton: { position: "absolute", top: 5, right: 10 },
  closeButtonText: { fontSize: 18, fontWeight: "bold", color: "white" },
});

export default ChildHomeScreen;
