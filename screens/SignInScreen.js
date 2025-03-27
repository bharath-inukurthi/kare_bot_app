import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { GOOGLE_WEB_CLIENT_ID } from '@env';

// Define the color scheme consistent with the app
const COLORS = {
  primary: '#1e40af', // Richer blue
  primaryLight: '#3b82f6', // Lighter blue
  primaryGradient: ['#1e40af', '#3b82f6'], // Blue gradient
  secondary: '#ffffff', // White
  text: '#0f172a', // Dark blue-gray for text
  textSecondary: '#475569', // Gray for secondary text
  error: '#ef4444',
  background: '#f1f5f9', // Light gray background
};

const SignInScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const configureGoogleSignIn = async () => {
    try {
      await GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });
    } catch (error) {
      console.error('Google Sign-In configuration error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      
      // Check if Play Services are available
      await GoogleSignin.hasPlayServices();
      
      // Perform Google Sign-in
      const { idToken } = await GoogleSignin.signIn();
      
      if (!idToken) {
        throw new Error('No ID token present!');
      }

      // Sign in with Firebase using the Google ID token
      const auth = getAuth();
      const credential = GoogleAuthProvider.credential(idToken);
      const { user } = await signInWithCredential(auth, credential);
      
      // Check if the email domain is klu.ac.in
      if (!user.email.endsWith('@klu.ac.in')) {
        throw new Error('Only @klu.ac.in email addresses are allowed');
      }

      console.log('Successfully signed in:', user);
      // Navigation will be handled by the auth state change listener in App.js
      
    } catch (error) {
      let message = 'An error occurred during sign in.';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        message = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        message = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        message = 'Play services are not available';
      }
      
      Alert.alert('Sign In Error', message);
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/kare-bot-logo.png')} // Make sure to add your logo
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>KARE Bot</Text>
            <Text style={[styles.descriptionText, {paddingBottom: 10, fontSize: 15}]}>Your Academic Assistant</Text>
          </View>

          <View style={styles.signInContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary} />
                <Text style={styles.loadingText}>Signing in...</Text>
              </View>
            ) : (
              <GoogleSigninButton
                style={styles.googleButton}
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              />
            )}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  signInContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 50,
  },
  googleButton: {
    width: 240,
    height: 48,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.secondary,
    marginTop: 10,
    fontSize: 16,
  },
});

export default SignInScreen;