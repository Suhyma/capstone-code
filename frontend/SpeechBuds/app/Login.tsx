import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import CheckBox from "expo-checkbox";
import { Link } from "expo-router";
import { loginUser } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { AxiosError } from 'axios';

const LoginScreen = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "", // Will store 'Child' or 'SLP'
  });

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    console.log(`Updated ${field}: ${value}`);
  };

  const handleLogin = async () => {
    if (!form.username || !form.password || !form.role) {
      Alert.alert("Error", "Please fill in all fields and select a role.");
      return;
    }

    setLoading(true);
    try {
      console.log("Attempting login with:", form.username, form.password, form.role);
      const response = await loginUser(form.username, form.password);
      
      if (response.token) {
        console.log("Token received:", response.token);
        await AsyncStorage.setItem('access_token', response.token);
        await AsyncStorage.setItem('user_role', form.role);
        
        Alert.alert("Success", "Login successful!");
        console.log("Navigating to role-based screen:", form.role);

        // Ensure navigation based on role
        if (form.role === "Child") {
          console.log("Navigating to ChildHomeScreen");
          router.push("/ChildHomeScreen");
          setTimeout(() => router.push("/ChildHomeScreen"), 500); // Manual navigation fallback
        } else if (form.role === "SLP") {
          console.log("Navigating to SLPHomeScreen");
          router.push("/SLPHomeScreen");
          setTimeout(() => router.push("/SLPHomeScreen"), 500); // Manual navigation fallback
        }
      }
    } catch (error) {
      setLoading(false);
      if (error instanceof AxiosError) {
        console.log('Login AxiosError:', error.response);
        Alert.alert("Login Failed", error.response?.data?.detail || "Something went wrong.");
      } else {
        console.log('Login Error:', error);
        Alert.alert("Login Failed", "Something went wrong.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        {/* Username Field */}
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#432818"
          onChangeText={(text) => handleInputChange("username", text)}
        />

        {/* Password Field */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#432818"
          onChangeText={(text) => handleInputChange("password", text)}
        />

        {/* Role Selection */}
        <View style={styles.checkboxContainer}>
          <View style={styles.checkboxRow}>
            <CheckBox
              value={form.role === "Child"}
              onValueChange={() => setForm({ ...form, role: "Child" })}
            />
            <Text style={styles.checkboxLabel}>Child</Text>
          </View>
          <View style={styles.checkboxRow}>
            <CheckBox
              value={form.role === "SLP"}
              onValueChange={() => setForm({ ...form, role: "SLP" })}
            />
            <Text style={styles.checkboxLabel}>SLP</Text>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity 
          style={form.role ? styles.loginButton : styles.disabledButton} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>{loading ? "Logging in..." : "Login"}</Text>
        </TouchableOpacity>


        {/* Registration Link */}
        <Text style={styles.registerText}>
          Don't have an account?{" "}
          <Link href="/Registration" style={styles.registerLink}>
            Click here
          </Link>
        </Text>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A4D65E",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%",
    backgroundColor: "#D1A878",
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#5A3E1B",
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
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#5A3E1B",
    marginBottom: 10,
    color: "#432818",
  },
  checkboxContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginVertical: 10,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  checkboxLabel: {
    marginLeft: 5,
    fontSize: 16,
    color: "#432818",
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: "#5A3E1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  disabledButton: {
    marginTop: 20,
    backgroundColor: "#A4A4A4",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  loginButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  registerText: {
    marginTop: 15,
    fontSize: 16,
    color: "#432818",
  },
  registerLink: {
    color: "#0000FF", // Blue text for link
    textDecorationLine: "underline",
  },
});

export default LoginScreen;
