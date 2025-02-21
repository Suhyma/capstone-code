import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {Link} from 'expo-router';

export default function Index() {
  return (
    <View style={styles.container}>
      
      {/* Green Background */}
      <View style={styles.background}>
        
        {/* Background Images */}
        <Image
          source={require('@/assets/images/Flower.png')}
          style={styles.flower}
        />
        <Image
          source={require('@/assets/images/Corn.png')}
          style={styles.corn}
        />
        <Image
          source={require('@/assets/images/Strawberry.png')}
          style={styles.strawberry}
        />

        {/* Brown Rectangle */}
        <View style={styles.rectangle}>
          
          {/* "Speech Buds" Text */}
          <Text style={styles.title}>SPEECH BUDS</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Link href="/ChildHomeScreen" style={styles.button}>
              Child
            </Link>

            <Link href="/SLPHomeScreen" style={styles.button}>
              SLP
            </Link>

          </View>
        </View>
      </View>
    </View>
  );
};

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
    top: 0,    // Adjust distance from top
    left: 0,   // Adjust distance from left
    width: 300,  // Adjust size of image
    height: 300,
  },
  corn: {
    position: 'absolute',
    top: 80,    // Adjust distance from top
    left: 1000,   // Adjust distance from left
    width: 300,  // Adjust size of image
    height: 300,
  },
  strawberry: {
    position: 'absolute',
    top: 300,    // Adjust distance from top
    left: 500,   // Adjust distance from left
    width: 300,  // Adjust size of image
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
  icon: {
    position: 'absolute',
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000', // Black text
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', // Black text
  },
});
