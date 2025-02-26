import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { StackParamList } from './types';

type NavigationProp = StackNavigationProp<StackParamList, 'Index'>;

export default function Index() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      {/* Green Background */}
      <View style={styles.background}>
        {/* Background Images */}
        <Image source={require('@/assets/images/Flower.png')} style={styles.flower} />
        <Image source={require('@/assets/images/Corn.png')} style={styles.corn} />
        <Image source={require('@/assets/images/Strawberry.png')} style={styles.strawberry} />

        {/* Brown Rectangle */}
        <View style={styles.rectangle}>
          {/* "Speech Buds" Text */}
          <Text style={styles.title}>SPEECH BUDS</Text>

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
  flower: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 300,
    height: 300,
  },
  corn: {
    position: 'absolute',
    top: 300,
    left: 1100,
    width: 300,
    height: 300,
  },
  strawberry: {
    position: 'absolute',
    top: 600,
    left: 500,
    width: 300,
    height: 300,
  },
  rectangle: {
    width: '60%',
    backgroundColor: '#CDA879', // Card background
    borderWidth: 3,
    borderColor: '#684503',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000', // Black text
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    width: '60%',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', // Black text
  },
});
