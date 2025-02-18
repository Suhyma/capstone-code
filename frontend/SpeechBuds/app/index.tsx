import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {Link} from 'expo-router';

export default function Index() {
  return (
    <View style={styles.container}>
      
      {/* Green Background */}
      <View style={styles.background}>
        
        {/* Brown Rectangle */}
        <View style={styles.rectangle}>
          
          {/* Decorative Icons */}

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
  rectangle: {
    width: '60%',
    backgroundColor: '#CDA879', // Card background
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
