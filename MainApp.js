import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
  LogBox,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import uuid from "uuid";
import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import FacultyAvailabilityScreen from './screens/FacultyAvailabilityScreen';
import ChatBotScreen from './screens/ChatBotScreen';
import ProfileScreen from './screens/ProfileScreen';

// Prevents multiple web popup instances
WebBrowser.maybeCompleteAuthSession();

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2ju8aCnKvDen2-uuvA6EoSospn7xRscE",
  authDomain: "faculty-meet.firebaseapp.com",
  projectId: "faculty-meet",
  storageBucket: "faculty-meet.firebasestorage.app",
  messagingSenderId: "368113711736",
  appId: "1:368113711736:web:837ea5ebf8d88d78678b8d",
  measurementId: "G-L5XHHB8DX8"
};

// Initialize Firebase if not already initialized
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Firebase sets some timers for long periods which trigger warnings. Ignoring them.
LogBox.ignoreLogs(['Setting a timer for a long period']);

// Create a Tab Navigator
const Tab = createBottomTabNavigator();

// Define the app's color scheme
const COLORS = {
  primary: '#0052cc', // Main blue
  secondary: '#ffffff', // White
  accent: '#4c9aff', // Light blue
  text: '#172b4d', // Dark blue-gray for text
  background: '#f4f5f7', // Light gray background
  error: '#ff5630', // Red for errors
};

export default function App() {
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(__DEV__); // Enable debug in development

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '368113711736-8dicp506f6rk4biti5e009qag1jgvqmk.apps.googleusercontent.com',
    androidClientId: '368113711736-8dicp506f6rk4biti5e009qag1jgvqmk.apps.googleusercontent.com',
    iosClientId: '368113711736-8dicp506f6rk4biti5e009qag1jgvqmk.apps.googleusercontent.com',
    webClientId: '368113711736-vd9kpllf1b3f5oh2qhqa2qh6vko3edta.apps.googleusercontent.com',
    scopes: ['profile', 'email']
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, [initializing]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithFirebase(credential);
    }
  }, [response]);

  const signInWithFirebase = async (credential) => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      console.log('Attempting Google sign-in...');
      const result = await signInWithCredential(auth, credential);
      console.log('Google sign-in successful');
      
      // Check if the email domain is klu.ac.in
      const userEmail = result.user.email;
      if (!userEmail.endsWith('@klu.ac.in')) {
        // Sign out if not from the allowed domain
        console.log('Email domain not allowed:', userEmail);
        await signOut(auth);
        Alert.alert(
          "Authentication Failed",
          "Only @klu.ac.in email addresses are allowed to sign in.",
          [{ text: "OK" }]
        );
        return;
      }
      
      console.log('User authenticated successfully:', userEmail);
      setUser(result.user);
    } catch (error) {
      console.error('Google sign-in error:', error.code, error.message);
      
      let errorMessage = error.message;
      if (debugMode) {
        errorMessage = `${error.code}: ${error.message}`;
      } else {
        errorMessage = "Authentication failed. Please try again.";
      }
      
      Alert.alert("Authentication Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (isSignUp = false) => {
    // Validate email domain
    if (!email.endsWith('@klu.ac.in')) {
      Alert.alert(
        "Authentication Failed",
        "Only @klu.ac.in email addresses are allowed to sign in.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Validate password
    if (!password || password.length < 6) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 6 characters long.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setIsLoading(true);
    
    try {
      const auth = getAuth();
      let userCredential;
      
      console.log(`Attempting ${isSignUp ? 'sign up' : 'sign in'} with email:`, email);
      
      if (isSignUp) {
        // Create new user
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created successfully');
      } else {
        // Sign in existing user
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('User signed in successfully');
      }
      
      setUser(userCredential.user);
    } catch (error) {
      console.error('Email auth error:', error.code, error.message);
      
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please log in instead.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format. Please check your email.';
      } else if (error.code === 'auth/invalid-login-credentials') {
        errorMessage = 'Invalid login credentials. Please check your email and password.';
      } else if (debugMode) {
        errorMessage = `${error.code}: ${error.message}`;
      }
      
      Alert.alert("Authentication Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestUser = async () => {
    setIsLoading(true);
    const testEmail = 'test@klu.ac.in';
    const testPassword = 'test123456';
    
    try {
      const auth = getAuth();
      console.log('Creating test user:', testEmail);
      
      await createUserWithEmailAndPassword(auth, testEmail, testPassword)
        .then((userCredential) => {
          console.log('Test user created successfully');
          Alert.alert(
            'Test User Created',
            `Email: ${testEmail}\nPassword: ${testPassword}\n\nYou can now sign in with these credentials.`
          );
        })
        .catch((error) => {
          if (error.code === 'auth/email-already-in-use') {
            console.log('Test user already exists, trying to sign in');
            return signInWithEmailAndPassword(auth, testEmail, testPassword);
          }
          throw error;
        })
        .then((userCredential) => {
          if (userCredential) {
            console.log('Signed in with test user');
            setUser(userCredential.user);
          }
        });
    } catch (error) {
      console.error('Test user error:', error.code, error.message);
      
      let errorMessage = error.message;
      if (debugMode) {
        errorMessage = `${error.code}: ${error.message}`;
      }
      
      Alert.alert("Test User Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Kare Bot...</Text>
      </View>
    );
  }

  // If the user is not authenticated, show the login screen
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{flex: 1}}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>KARE BOT</Text>
              <Text style={styles.headerSubtitle}>Kalasalingam University</Text>
            </View>
            
            <View style={styles.loginContainer}>
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Kalasalingam_Academy_of_Research_and_Education_logo.svg/1200px-Kalasalingam_Academy_of_Research_and_Education_logo.svg.png' }} 
                style={styles.logo}
                resizeMode="contain"
              />
              
              <Text style={styles.welcomeText}>Welcome to Kare Bot</Text>
              
              <Text style={styles.descriptionText}>
                Sign in with your @klu.ac.in email to continue
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email (@klu.ac.in)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleEmailAuth(false)}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>
                  {isLoading ? 'Processing...' : 'Sign In with Email'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => handleEmailAuth(true)}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>
                  {isLoading ? 'Processing...' : 'Sign Up with Email'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity 
                style={styles.googleButton}
                onPress={() => promptAsync()}
                disabled={!request || isLoading}
              >
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </TouchableOpacity>
              
              {/* Add debug button */}
              {__DEV__ && (
                <View style={styles.debugContainer}>
                  <TouchableOpacity 
                    style={styles.debugButton}
                    onPress={() => {
                      console.log('Debug Info:');
                      console.log('- Firebase Config:', firebaseConfig);
                      console.log('- Google Auth Client IDs:', {
                        expo: request?.clientId,
                        android: request?.androidClientId,
                        ios: request?.iosClientId,
                        web: request?.webClientId
                      });
                      Alert.alert('Debug Info', 'Check console for details');
                    }}
                  >
                    <Text style={styles.debugButtonText}>Show Auth Debug Info</Text>
                  </TouchableOpacity>
                  
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // User is authenticated, show the tab navigator
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Faculty') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Chat') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            // You can use any component here - we're using Ionicons
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: 'gray',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          tabBarStyle: {
            backgroundColor: COLORS.secondary,
            borderTopColor: 'rgba(0, 0, 0, 0.1)',
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Faculty" component={FacultyAvailabilityScreen} />
        <Tab.Screen name="Chat" component={ChatBotScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    marginBottom: 12,
    fontSize: 16,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionButtonText: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e4e8',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#8a9aa9',
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  googleButtonText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  debugContainer: {
    marginTop: 20,
    width: '100%',
  },
  debugButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
  },
}); 