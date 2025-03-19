import React, { useEffect, useState } from "react";
import { View, Image, TouchableOpacity, StyleSheet, Text, LayoutChangeEvent, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
  ChildHomeScreen: undefined;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const gardenItems = [
  { id: 1, image: require("@/assets/images/Corn.png") },
  { id: 2, image: require("@/assets/images/Flower.png") },
  { id: 3, image: require("@/assets/images/Strawberry.png") },
];

const GardenScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);
  const [plantedItems, setPlantedItems] = useState<{ id: number; x: number; y: number; image: any }[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ id: number; image: any } | null>(null);
  const [gardenSize, setGardenSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      const newWidth = Dimensions.get("window").width;
      const newHeight = Dimensions.get("window").height;
      setIsPortrait(newHeight > newWidth);
    };

    const subscription = Dimensions.addEventListener("change", updateDimensions);
    return () => subscription.remove();
  }, []);

  const handlePlant = () => {
    if (!selectedItem || gardenSize.width === 0 || gardenSize.height === 0) return;

    // Generate a random position within the garden
    const randomX = Math.random() * (gardenSize.width - 30); // 30px to keep inside bounds
    const randomY = Math.random() * (gardenSize.height - 30);

    setPlantedItems((prev) => [
      ...prev,
      { id: Date.now(), x: randomX, y: randomY, image: selectedItem.image }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Exit Button */}
      <TouchableOpacity 
        style={styles.exitButton} 
        onPress={() => navigation.navigate("ChildHomeScreen")}
      >
        <Text style={styles.exitButtonText}>Exit</Text>
      </TouchableOpacity>

      {/* Garden Area */}
      <TouchableOpacity 
        style={[styles.garden, isPortrait ? { width: "90%", height: screenHeight * 0.5 } : { width: screenWidth * 0.8, height: "80%" }]}
        activeOpacity={1} 
        onPress={handlePlant}
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          setGardenSize({ width, height });
        }}
      >
        {plantedItems.map((item) => (
          <Image
            key={item.id}
            source={item.image}
            style={[styles.plantedItem, { left: item.x, top: item.y }]}
          />
        ))}
      </TouchableOpacity>

      {/* Selection Bar (Footer) */}
      <View style={styles.selectionBar}>
        {gardenItems.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setSelectedItem(item)}>
            <Image
              source={item.image}
              style={[styles.selectionImage, selectedItem?.id === item.id && styles.selected]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#96C449", 
    padding: 10 
  },
  garden: { 
    flex: 1, 
    backgroundColor: "#E5C29F", 
    position: "relative",
    borderWidth: 2, 
    borderColor: "#8B5A2B", 
    margin: 30 
  },
  selectionBar: { 
    flexDirection: "row", 
    justifyContent: "center", 
    padding: 10, 
    backgroundColor: "#6B8E23",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80
  },
  selectionImage: { 
    width: 50, 
    height: 50, 
    marginHorizontal: 10 
  },
  selected: { 
    borderWidth: 2, 
    borderColor: "white", 
    borderRadius: 10 
  },
  plantedItem: { 
    width: 30, 
    height: 30, 
    position: "absolute" 
  },
  exitButton: { 
    position: "absolute", 
    top: 10, 
    right: 10, 
    backgroundColor: "#8B5A2B", 
    paddingVertical: 5, 
    paddingHorizontal: 15, 
    borderRadius: 5, 
    zIndex: 10 
  },
  exitButtonText: { 
    color: "white", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});

export default GardenScreen;