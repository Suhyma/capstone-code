import React, { useState } from "react";
import { 
  View, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  GestureResponderEvent, 
  Text,
  LayoutChangeEvent
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
  ChildHomeScreen: undefined;
};

const gardenItems = [
  { id: 1, image: require("@/assets/images/Corn.png") },
  { id: 2, image: require("@/assets/images/Flower.png") },
  { id: 3, image: require("@/assets/images/Strawberry.png") },
];

const GardenScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [plantedItems, setPlantedItems] = useState<{ id: number; x: number; y: number; image: any }[]>([]);
  const [gardenSize, setGardenSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const handlePlant = () => {
    if (!selectedItem || gardenSize.width === 0 || gardenSize.height === 0) return;

    // Generate a random position within the garden
    const randomX = Math.random() * (gardenSize.width - 30); // Subtracting image width (30) to keep it inside bounds
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
        style={styles.garden} 
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

      {/* Selection Bar */}
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
    backgroundColor: "#8DC63F", 
    padding: 10 
  },
  garden: { 
    flex: 1, 
    backgroundColor: "#E5C29F", 
    position: "relative",
    borderWidth: 2, 
    borderColor: "#8B5A2B", 
    margin: 10 
  },
  selectionBar: { 
    flexDirection: "row", 
    justifyContent: "center", 
    padding: 10, 
    backgroundColor: "#6B8E23" 
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