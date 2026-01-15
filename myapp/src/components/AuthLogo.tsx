import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function AuthLogo() {
  return (
    <View style={styles.container}>
      {/* Logo Image */}
      <Image 
        source={require('../../public/Logo.jpg')} 
        style={styles.logo} 
        resizeMode="contain" 
      />
      
      {/* Vertical Separator */}
      <View style={styles.separator} />

      {/* Text Container */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>Droply</Text>
        <Text style={styles.subtitle}>DISCOVER QUALITY, DELIVERED FAST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 60, 
    height: 60,
  },
  separator: {
    width: 1,
    height: 50,
    backgroundColor: '#000',
    marginHorizontal: 15,
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'serif',
    color: '#000',
  },
  subtitle: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
