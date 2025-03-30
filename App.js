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
  signOut,
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import screens
import FacultyAvailabilityScreen from './screens/FacultyAvailabilityScreen';
import ChatBotScreen from './screens/ChatBotScreen';
import ProfileScreen from './screens/ProfileScreen';
import FormsScreen from './screens/FormsScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import PreviewScreen from './screens/PreviewScreen';

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
  const app = initializeApp(firebaseConfig);
  initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
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
  gradient: {
    start: '#0052cc',
    end: '#4c9aff',
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <TabNavigator user={user} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const TabNavigator = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(__DEV__); // Enable debug in development
  const [hasUserDetails, setHasUserDetails] = useState(false);
  const [checkingDetails, setCheckingDetails] = useState(true);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Return the Tab Navigator directly
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Schedules') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Availability') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Forms') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
          height: Platform.OS === 'ios' ? 90 : 60,
          backgroundColor: COLORS.secondary,
          borderTopColor: 'rgba(0, 0, 0, 0.1)',
          display: 'flex',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Schedules" 
        component={PreviewScreen}
        initialParams={{ user: user }}
      />
      
      <Tab.Screen 
        name="Availability" 
        component={FacultyAvailabilityScreen}
        initialParams={{ user: user }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatBotScreen}
        initialParams={{ user: user }}
      />
      <Tab.Screen 
        name="Forms" 
        component={FormsScreen}
        initialParams={{ user: user }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        initialParams={{ user: user }}
      />
    </Tab.Navigator>
  );


  // Add a helper function to get the correct redirect URI
  const getRedirectURI = () => {
    // For Expo Go, we must use the Expo proxy
    if (Platform.OS !== 'web' && __DEV__) {
      // IMPORTANT: Replace with your actual Expo username if needed
      return `https://auth.expo.io/@bharath-inukurthi/kare-bot`;
    } else if (Platform.OS === 'web') {
      return 'http://localhost:8082';
    } else {
      return 'com.kalasalingam.karebot://';
    }
  };

  // Initialize Google Auth Request hook at the top level
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '368113711736-vd9kpllf1b3f5oh2qhqa2qh6vko3edta.apps.googleusercontent.com',
    androidClientId: '368113711736-n9vnkt8m5kv6ce8nq2nlrr05cr5kirp0.apps.googleusercontent.com',
    iosClientId: '368113711736-8dicp506f6rk4biti5e009qag1jgvqmk.apps.googleusercontent.com',
    webClientId: '368113711736-vd9kpllf1b3f5oh2qhqa2qh6vko3edta.apps.googleusercontent.com',
    expoClientId: '368113711736-vd9kpllf1b3f5oh2qhqa2qh6vko3edta.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({
      useProxy: true,
      path: 'expo-auth-session'
    }),
    scopes: ['profile', 'email'],
    redirectUri: getRedirectURI(),
    usePKCE: true,
    prompt: 'select_account',
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setInitializing(false);
      setCheckingDetails(false); // Reset checking details state
    });

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setInitializing(false);
      setCheckingDetails(false);
      console.log('Auth initialization timed out');
    }, 10000); // 10 second timeout

    // Cleanup subscription and timeout
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Effect for handling Google authentication response
  useEffect(() => {
    if (!response) return; // Early return if no response

    if (response.type === 'success') {
      console.log('Authentication successful, processing token...');
      
      // Validate id_token is present
      if (!response.params.id_token) {
        console.error('Error: No id_token received in response', response);
        Alert.alert('Authentication Error', 'Failed to receive authentication token');
        setIsLoading(false);
        return;
      }
      
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithFirebase(credential);
    } else if (response?.type === 'error') {
      console.error('Authentication error:', response.error);
      console.error('Full error object:', JSON.stringify(response, null, 2));
      setIsLoading(false);
      
      // Show specific message for client deleted error
      if (response.error && response.error.includes('client was deleted')) {
        Alert.alert(
          'OAuth Client Error',
          'The Google OAuth client ID has been deleted. Please update with new client IDs from Google Cloud Console.'
        );
      } else {
        Alert.alert('Authentication Error', response.error || 'Unknown error during authentication');
      }
    } else if (response?.type === 'dismiss') {
      console.log('Authentication dismissed by user');
      setIsLoading(false);
    } else if (response) {
      console.log('Other response type:', response.type, response);
      setIsLoading(false);
    }
  }, [response]);

  const signInWithFirebase = async (credential) => {
    try {
      setIsLoading(true);
      setCheckingDetails(true); // Set checking details while authenticating
      const auth = getAuth();
      console.log('Attempting Google sign-in...');
      const result = await signInWithCredential(auth, credential);
      console.log('Google sign-in successful, user:', result.user.email);
      
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
        setCheckingDetails(false); // Reset checking details state
        return;
      }
      
      console.log('User authenticated successfully with domain check:', userEmail);
      // Setting user will trigger the UI to show the tabs
      setUser(result.user);
      setCheckingDetails(false); // Reset checking details state
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
    setCheckingDetails(true);
    
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
      } else if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
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

  // Effect for checking user details
  useEffect(() => {
    const checkUserDetails = async () => {
      if (!user) return;
      try {
        const savedDetails = await AsyncStorage.getItem('userDetails');
        setShowUserDetails(!savedDetails);
      } catch (error) {
        console.error('Error checking user details:', error);
        setShowUserDetails(true);
      }
    };
    checkUserDetails();
  }, [user]);

  // Effect for handling auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
      setCheckingDetails(false);
    });

    const timeout = setTimeout(() => {
      if (initializing) {
        setInitializing(false);
        setCheckingDetails(false);
        console.log('Auth initialization timed out');
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [initializing]);

  if (user && showUserDetails) {
    return <UserDetailsScreen onComplete={() => setShowUserDetails(false)} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.gradient.start} />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{flex: 1}}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.loginContainer}>
              
              
              <Text style={[styles.welcomeText, { textShadowColor: 'rgba(0, 82, 204, 0.25)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6 }]}>Welcome to Kare Bot</Text>
              <Text style={[styles.headerSubtitle, { opacity: 0.95, letterSpacing: 1 }]}>Kalasalingam University</Text>
              
              <Text style={[styles.descriptionText,{paddingBottom:10,fontSize:15}]}>
                Sign in with your
              </Text>
              <Text style={styles.descriptionText}>
              @klu.ac.in email to continue
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
                onPress={() => {
                  console.log('Starting Google sign-in...');
                  setIsLoading(true);
                  
                  // Use proper configuration for the platform
                  promptAsync({
                    useProxy: Platform.OS !== 'web' && __DEV__, // Use proxy in Expo Go
                    showInRecents: true,
                  }).then(result => {
                    console.log('Google sign-in result:', result.type);
                    if (result.type !== 'success') {
                      setIsLoading(false);
                    }
                    // Success case handled by useEffect
                  }).catch(error => {
                    console.error('Google sign-in error:', error);
                    setIsLoading(false);
                    Alert.alert('Authentication Error', 'Error starting Google authentication');
                  });
                }}
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



  // Render loading state or appropriate screen based on conditions
  if (initializing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Kare Bot...</Text>
      </View>
    );
  }

  if (checkingDetails) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (user && (showUserDetails || !hasUserDetails)) {
    return <UserDetailsScreen onComplete={() => {
      setShowUserDetails(false);
      setHasUserDetails(true);
    }} />;
  }

  // User is authenticated and has details, show the tab navigator
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Schedules') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Chat') {
              iconName = focused ? 'chatbubble' : 'chatbubble-outline';
            } else if (route.name === 'Availability') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Forms') {
              iconName = focused ? 'document-text' : 'document-text-outline';
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
            position: 'absolute',
            bottom: 0,
            padding: 0,
            height: 50,
            zIndex: 8,
            elevation: 4,
          },
          headerShown: false,
          tabBarHideOnKeyboard: true,
          keyboardHidesTabBar: true,
        })}
      >
       <Tab.Screen name="Schedules" component={PreviewScreen} />
       <Tab.Screen name="Availability" component={FacultyAvailabilityScreen} />
      <Tab.Screen name="Chat" component={ChatBotScreen} />
      <Tab.Screen name="Forms" component={FormsScreen} />
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    transform: [{ scale: 1 }],
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
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.8,
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 0.5,
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
    backgroundColor: COLORS.background,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  welcomeText: {
    paddingTop:100,
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    marginBottom: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1 }],
  },
  actionButtonText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
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
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  googleButtonText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
    marginLeft: 8,
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