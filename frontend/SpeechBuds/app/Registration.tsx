import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker"; // Import Picker
import { Link } from "expo-router";

const RegistrationScreen = () => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    role: "Child", // Default role
  });

  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleRegister = () => {
    console.log("User Registered:", form);
    // Add your registration logic here (API call, validation, etc.)
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Registration</Text>

        {/* Input Fields */}
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#432818"
          onChangeText={(text) => handleInputChange("firstName", text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#432818"
          onChangeText={(text) => handleInputChange("lastName", text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          placeholderTextColor="#432818"
          onChangeText={(text) => handleInputChange("email", text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#432818"
          onChangeText={(text) => handleInputChange("username", text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#432818"
          onChangeText={(text) => handleInputChange("password", text)}
        />

        {/* Dropdown for Role Selection */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.label}>Select Role</Text>
          <Picker
            selectedValue={form.role}
            onValueChange={(itemValue) => handleInputChange("role", itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Child" value="Child" />
            <Picker.Item label="SLP" value="SLP" />
          </Picker>
        </View>

        {/* Register Button */}
        <Link href="/Login">
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A4D65E", // Green background
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%",
    backgroundColor: "#D1A878", // Light brown background
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#5A3E1B", // Dark brown border
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#432818",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#FFF", // White input fields
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#5A3E1B",
    marginBottom: 10,
    color: "#432818",
  },
  dropdownContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#5A3E1B",
    borderRadius: 5,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: "#432818",
    padding: 5,
    fontWeight: "bold",
  },
  picker: {
    width: "100%",
    height: 50,
  },
  registerButton: {
    marginTop: 20,
    backgroundColor: "#5A3E1B", // Brown button
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  registerButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default RegistrationScreen;
