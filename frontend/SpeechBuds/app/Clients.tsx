import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useNavigate } from "./hooks/useNavigate";
import { LineChart } from "react-native-chart-kit";
import { Card, Checkbox, IconButton } from "react-native-paper";

const ClientDetailsScreen: React.FC = () => {
  const { navigateTo } = useNavigate();
    

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F8EECF", padding: 20 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <TouchableOpacity onPress={() => navigateTo("SLPHomeScreen")}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#6D4C41" }}>← My Clients</Text>
        </TouchableOpacity>
      </View>

      {/* Client Info */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10 }}>
        <Image source={{ uri: "https://via.placeholder.com/80" }} style={{ width: 80, height: 80, borderRadius: 40 }} />
        <View>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#6D4C41" }}>Adam Deer</Text>
        </View>
        <View>
          <Text>Age: 8 years old</Text>
          <Text>Start date: Nov 5, 2024</Text>
          <Text>Treatment Length: 6 months</Text>
        </View>
      </View>

      {/* Weekly Goals */}
      <View style={{ backgroundColor: "#C5E1A5", padding: 15, borderRadius: 10, marginVertical: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Weekly Goals</Text>
        <Checkbox.Item label='"R" initial x 3' status="unchecked" />
        <Checkbox.Item label='"R" medial x 3' status="unchecked" />
        <Checkbox.Item label='"R" final x 3' status="unchecked" />
        <TouchableOpacity>
          <Text style={{ color: "#2E7D32", fontWeight: "bold" }}>+ Assign new goals</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Chart */}
      <View style={{ backgroundColor: "#FFF", borderRadius: 10, padding: 15, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Progress</Text>
        <LineChart
          data={{
            labels: ["S", "M", "T", "W", "T", "F", "S"],
            datasets: [{ data: [5, 10, 7, 15, 12, 18, 8] }],
          }}
          width={300}
          height={180}
          chartConfig={{
            backgroundColor: "#FFF",
            backgroundGradientFrom: "#FFF",
            backgroundGradientTo: "#FFF",
            color: (opacity = 1) => `rgba(0, 128, 0, ${opacity})`,
          }}
          bezier
          style={{ borderRadius: 10 }}
        />
      </View>

      {/* Session History */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Session History</Text>
      {[1, 2, 3, 4].map((_, index) => (
        <Card key={index} style={{ backgroundColor: "#D7C29E", padding: 10, marginBottom: 10 }}>
          <Text>Exercise: R Initial</Text>
          <Text>Date: Nov 11, 2024</Text>
          <Text>Time: 10:35 AM</Text>
          <Text>Score: 3/5</Text>
          <TouchableOpacity>
            <Text style={{ color: "#3E2723", fontWeight: "bold" }}>see more</Text>
          </TouchableOpacity>
        </Card>
      ))}
    </ScrollView>
  );
};

export default ClientDetailsScreen;
