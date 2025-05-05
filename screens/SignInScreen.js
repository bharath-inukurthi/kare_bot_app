import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

// Define the color scheme consistent with the app
const COLORS = {
  primary: '#CFF6F5', // Light teal background
  accent: '#19C6C1',
  text: '#1A2536',
  textSecondary: '#22C55E',
  button: '#fff',
  buttonText: '#222F3E',
  disabled: '#E2E8F0',
  disabledText: '#A0AEC0',
};

const SignInScreen = ({
  isLoading,
  handleGoogleSignIn,
  createTestUser,
  debugMode,
  setDebugMode,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bg}>
        {/* Main Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/login page.png')}
            style={styles.mainImage}
            resizeMode="cover"
          />
        </View>
        {/* Title and Subtitle */}
        <Text style={styles.title}>KARE Bot</Text>
        <Text style={styles.subtitle}>Your Campus Companion</Text>
        {/* Google Sign-In Button */}
        <View style={styles.signInContainer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Image
  source={require('../assets/google-logo.png')}
  style={styles.googleIcon}
/>
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Debug tools - only shown in development mode */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={createTestUser}
              disabled={isLoading}
            >
              <Text style={styles.debugButtonText}>
                {isLoading ? 'Processing...' : 'Create Test User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => setDebugMode(!debugMode)}
            >
              <Text style={styles.debugButtonText}>
                {debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  bg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    maxWidth: 320,
    backgroundColor: '#fff',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 32,
  },
  signInContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: 260,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 8,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 24,
  },
  googleButtonText: {
    color: '#222',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  debugButton: {
    width: '48%',
    height: 40,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    color: COLORS.button,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SignInScreen;