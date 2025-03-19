import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the type for the planted items
interface PlantedItem {
  id: number;
  x: number;
  y: number;
  image: any;
}

// Define the type for the context value
interface GardenContentType {
  plantedItems: PlantedItem[];
  setPlantedItems: React.Dispatch<React.SetStateAction<PlantedItem[]>>;
  gardenState: any;  // You can replace 'any' with a more specific type
  setGardenState: React.Dispatch<React.SetStateAction<any>>;
}

// Create context with proper type
const GardenContent = createContext<GardenContentType | null>(null);

// Define props type for GardenProvider
interface GardenProviderProps {
  children: ReactNode;
}

// Define the GardenProvider component
export const GardenProvider: React.FC<GardenProviderProps> = ({ children }) => {
  const [gardenState, setGardenState] = useState<any>({});
  const [plantedItems, setPlantedItems] = useState<PlantedItem[]>([]);  // Add this state
  console.log("GardenProvider is wrapping the app"); // Debugging purpose

  return (
    <GardenContent.Provider
      value={{ gardenState, setGardenState, plantedItems, setPlantedItems }}
    >
      {children}
    </GardenContent.Provider>
  );
};

// Custom hook to use the garden context
export const useGarden = () => {
  const context = useContext(GardenContent);
  if (!context) {
    throw new Error("useGarden must be used within a GardenProvider");
  }
  return context;
};