import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { StackParamList } from './types';

type NavigationProp = StackNavigationProp<StackParamList, 'Index'>;

// Get screen width and height for responsiveness
const { width, height } = Dimensions.get("window");

export default function Index() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      {/* Green Background */}
      <View style={styles.background}>

        {/* Brown Rectangle */}
        <View style={styles.rectangle}>
          {/* "Speech Buds" Text */}
          <Text style={styles.title}>SPEECH BUDS</Text>

          {/* Background Images */}
          <Image source={require('@/assets/images/Flower.png')} style={styles.flower} />
          <Image source={require('@/assets/images/Corn.png')} style={styles.corn} />
          <Image source={require('@/assets/images/Strawberry.png')} style={styles.strawberry} />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: '#96C449', // Green background
    justifyContent: 'center',
    alignItems: 'center',
  },
  rectangle: {
    width: width * 0.8,
    height: height * 0.8,
    backgroundColor: '#CDA879', // Card background
    borderWidth: 3,
    borderColor: '#684503',
    borderRadius: 12,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    display: "flex",
  },
  flower: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 200,
  },
  corn: {
    position: 'absolute',
    top: 150,
    left: 850,
    width: 150,
    height: 150,
  },
  strawberry: {
    position: 'absolute',
    top: 290,
    justifyContent: 'center',
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#000', // Black text
    marginTop: 0,
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 0,
    width: '60%',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#96C449', // Green button
    borderWidth: 2,
    borderColor: '#205E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000', // Black text
  },
});
