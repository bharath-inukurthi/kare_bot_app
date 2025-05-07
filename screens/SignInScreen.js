import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
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
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(imageScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bg}>
        {/* Main Image with animation */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: imageScale },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          <Image
            source={require('../assets/login page.png')}
            style={styles.mainImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Title and Subtitle with animation */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          <Text style={styles.title}>KARE Bot</Text>
          <Text style={styles.subtitle}>Your Campus Companion</Text>
        </Animated.View>

        {/* Google Sign-In Button with animation */}
        <Animated.View
          style={[
            styles.signInContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Image
              source={require('../assets/google.png')}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Debug tools with animation */}
        {__DEV__ && (
          <Animated.View
            style={[
              styles.debugContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
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
          </Animated.View>
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