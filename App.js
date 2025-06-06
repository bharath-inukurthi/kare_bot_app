import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect, useMemo, useRef } from "react";
import 'react-native-reanimated';
import Animated, {
  withTiming,
  useSharedValue
} from 'react-native-reanimated';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  LogBox,
  Image,
  Easing,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider } from 'react-native-paper';
import AlertDialog from './components/AlertDialog';
// Firebase imports removed as we're now using Supabase
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import LottieView from 'lottie-react-native';
import supabase from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Import screens
import FacultyAvailabilityScreen from './screens/FacultyAvailabilityScreen';
import ChatBotScreen from './screens/ChatBotScreen';
import ProfileScreen from './screens/ProfileScreen';
import FormsScreen from './screens/FormsScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import PreviewScreen from './screens/PreviewScreen';
import CircularsScreen from './screens/CircularsScreen';
import CertificatesScreen from './screens/CertificatesScreen';
import ToolsScreen from './screens/ToolsScreen';
import CGPAScreen from './screens/CGPAScreen';
import SignInScreen from './screens/SignInScreen';

// Prevents multiple web popup instances
WebBrowser.maybeCompleteAuthSession();

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
  dark: {
    background: '#1a1b1e',
    surface: '#2a2b2f',
    tabBar: '#1a1b1e',
    text: '#ffffff'
  },
  light: {
    background: '#ffffff',
    surface: '#ffffff',
    tabBar: '#ffffff',
    text: '#172b4d'
  }
};

// Ignore long timer warnings from Supabase
LogBox.ignoreLogs(['Setting a timer for a long period']);

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainStack = () => {
  // Common screen options for all screens
  const commonScreenOptions = {
    headerShown: false,
    animationDuration: 500,
    animation: 'fade',
    contentStyle: { backgroundColor: 'transparent' },
    animationTypeForReplace: 'push',
    cardStyle: { backgroundColor: 'transparent' },
    cardOverlayEnabled: true,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    gestureResponseDistance: {
      horizontal: 50,
    },
  };

  // Common card style interpolator for left pop-out screens
  const leftPopOutInterpolator = ({ current, next, layouts }) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
      opacity: current.progress,
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  });

  // Common card style interpolator for right pop-out screens
  const rightPopOutInterpolator = ({ current, next, layouts }) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-layouts.screen.width, 0],
          }),
        },
      ],
      opacity: current.progress,
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  });

  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen name="MainTabs" component={MainApp} />
      
      {/* Left pop-out screens (slide in from right, out to left) */}
      <Stack.Screen 
        name="CircularsScreen" 
        component={CircularsScreen}
        options={{
          ...commonScreenOptions,
          animation: 'slide_from_right',
          cardStyleInterpolator: leftPopOutInterpolator,
        }}
      />
      <Stack.Screen 
        name="CertificatesScreen" 
        component={CertificatesScreen}
        options={{
          ...commonScreenOptions,
          animation: 'slide_from_right',
          cardStyleInterpolator: leftPopOutInterpolator,
        }}
      />
      <Stack.Screen 
        name="CGPAScreen" 
        component={CGPAScreen}
        options={{
          ...commonScreenOptions,
          animation: 'slide_from_right',
          cardStyleInterpolator: leftPopOutInterpolator,
        }}
      />

      {/* Right pop-out screens (slide in from left, out to right) */}
      <Stack.Screen 
        name="FacultyAvailabilityScreen" 
        component={FacultyAvailabilityScreen}
        options={{
          ...commonScreenOptions,
          animation: 'slide_from_left',
          cardStyleInterpolator: rightPopOutInterpolator,
        }}
      />
      <Stack.Screen 
        name="FormsScreen" 
        component={FormsScreen}
        options={{
          ...commonScreenOptions,
          animation: 'slide_from_left',
          cardStyleInterpolator: rightPopOutInterpolator,
        }}
      />
      <Stack.Screen 
        name="ChatBotScreen" 
        component={ChatBotScreen}
        options={{
          ...commonScreenOptions,
          animation: 'slide_from_left',
          cardStyleInterpolator: rightPopOutInterpolator,
        }}
      />
    </Stack.Navigator>
  );
};

const MainApp = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Schedules') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Tools') {
            return (
              <View style={[
                styles.toolsTabContainer,
                {
                  backgroundColor: focused
                    ? (theme.isDarkMode ? '#1E3A8A' : '#005EAC')
                    : (theme.isDarkMode ? '#005EAC' : '#4299E1'),
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  transform: [{ translateY: -20 }],
                }
              ]}>
                <Image
                  source={require('./assets/tools icon.png')}
                  style={[styles.toolsIcon, {
                    tintColor: '#fff',
                    width: 32,
                    height: 32,
                  }]}
                />
              </View>
            );
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
        animationEnabled: true,
        animationDuration: 500,
        cardStyle: { backgroundColor: 'transparent' },
        cardOverlayEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
            opacity: current.progress,
          },
          overlayStyle: {
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        }),
      })}
    >
      <Tab.Screen 
        name="Schedules" 
        component={PreviewScreen}
        options={{
          tabBarLabel: 'Schedules',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      />
      <Tab.Screen 
        name="Tools" 
        component={ToolsScreen}
        options={{
          tabBarLabel: 'Tools',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [hasUserDetails, setHasUserDetails] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const animationRef = useRef(null);

  // Alert dialog state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertConfirmAction, setAlertConfirmAction] = useState(() => {});

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Calculate redirect URI for Google auth
  const redirectUri = useMemo(() => {
    if (Platform.OS !== 'web' && __DEV__) {
      return `https://auth.expo.io/@bharath-inukurthi/kare-bot`;
    } else if (Platform.OS === 'web') {
      return 'http://localhost:8082';
    } else {
      return 'com.kalasalingam.karebot://';
    }
  }, []);

  // Initialize Google Auth Request hook
  const [_, response, promptAsync] = Google.useAuthRequest({
    clientId: '368113711736-vd9kpllf1b3f5oh2qhqa2qh6vko3edta.apps.googleusercontent.com',
    androidClientId: '368113711736-n9vnkt8m5kv6ce8nq2nlrr05cr5kirp0.apps.googleusercontent.com',
    iosClientId: '368113711736-8dicp506f6rk4biti5e009qag1jgvqmk.apps.googleusercontent.com',
    webClientId: '368113711736-vd9kpllf1b3f5oh2qhqa2qh6vko3edta.apps.googleusercontent.com',
    expoClientId: '368113711736-vd9kpllf1b3f5oh2qhqa2qh6vko3edta.apps.googleusercontent.com',
    redirectUri: redirectUri,
    scopes: ['profile', 'email'],
    usePKCE: true,
    prompt: 'select_account',
    responseType: 'code',
    extraParams: {
      nonce: 'random_nonce',
    },
  });

  // Effect for checking user details
  useEffect(() => {
    const checkUserDetails = async () => {
      if (!user) return;
      try {
        const savedDetails = await AsyncStorage.getItem('userDetails');
        const hasDetails = !!savedDetails;
        setShowUserDetails(!hasDetails);
        setHasUserDetails(hasDetails);
      } catch (error) {
        console.error('Error checking user details:', error);
        setShowUserDetails(true);
        setHasUserDetails(false);
      }
    };
    checkUserDetails();
  }, [user]);

  // Effect for handling auth state changes
  useEffect(() => {
    // Subscribe to auth state changes with Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (session?.user) {
          const userEmail = session.user.email;

          // Check if the email domain is klu.ac.in or our test email
          if (userEmail && !userEmail.endsWith('@klu.ac.in') && userEmail !== 'test.klu@gmail.com') {
            console.log('Email domain not allowed:', userEmail);
            showAlert(
              "Authentication Failed",
              "Only @klu.ac.in email addresses or test.klu@gmail.com are allowed to sign in."
            );

            // Sign out if not from the allowed domain
            await supabase.auth.signOut();
            setUser(null);
          } else {
            setUser(session.user);
            
            // Store Supabase user ID as UUID
            try {
              await AsyncStorage.setItem('currentUserUuid', session.user.id);
              console.log('Stored Supabase user ID as UUID:', session.user.id);
            } catch (error) {
              console.error('Error storing user ID:', error);
            }
          }
        } else {
          setUser(null);
          // Clear the current user UUID when signed out
          try {
            await AsyncStorage.removeItem('currentUserUuid');
          } catch (error) {
            console.error('Error clearing user UUID during sign out:', error);
          }
        }

        if (initializing) setInitializing(false);
      }
    );

    // Also get the initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const userEmail = session.user.email;

        // Check if the email domain is klu.ac.in or our test email
        if (userEmail && !userEmail.endsWith('@klu.ac.in') && userEmail !== 'test.klu@gmail.com') {
          console.log('Email domain not allowed:', userEmail);
          showAlert(
            "Authentication Failed",
            "Only @klu.ac.in email addresses are allowed to sign in."
          );

          // Sign out if not from the allowed domain
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(session.user);
          // Store Supabase user ID as UUID for initial session
          try {
            await AsyncStorage.setItem('currentUserUuid', session.user.id);
            console.log('Stored Supabase user ID as UUID for initial session:', session.user.id);
          } catch (error) {
            console.error('Error storing user ID for initial session:', error);
          }
        }
      } else {
        setUser(null);
      }

      if (initializing) setInitializing(false);
    };

    getInitialSession();

    const timeout = setTimeout(() => {
      if (initializing) {
        setInitializing(false);
        console.log('Auth initialization timed out');
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [initializing]);

  // Effect for handling Google authentication response
  useEffect(() => {
    console.log('Google auth response received:', response);
    
    if (!response) {
      console.log('No response received from Google auth');
      return;
    }
    
    if (response.type !== 'success') {
      console.log('Google auth response type:', response.type);
      return;
    }

    const handleGoogleSignIn = async () => {
      try {
        console.log('Starting Google sign in process with response:', response);
        
        if (!response.params.id_token) {
          console.error('Error: No id_token received in response', response);
          showAlert('Authentication Error', 'Failed to receive authentication token');
          setIsLoading(false);
          return;
        }

        // Decode the ID token to get user email
        const decodedToken = await decode(response.params.id_token);
        const userEmail = decodedToken.email;

        // Validate email domain before proceeding
        if (!userEmail.endsWith('@klu.ac.in') && userEmail !== 'test.klu@gmail.com') {
          console.log('Email domain not allowed:', userEmail);
          showAlert(
            "Authentication Failed",
            "Only @klu.ac.in email addresses or test.klu@gmail.com are allowed to sign in."
          );
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        console.log('Attempting Supabase sign in with ID token...');

        // Use Supabase to sign in with the Google ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.params.id_token,
        });

        console.log('Supabase signInWithIdToken response:', { data, error });

        if (error) {
          throw error;
        }

        // Store Supabase user ID as UUID
        if (data?.user) {
          try {
            await AsyncStorage.setItem('currentUserUuid', data.user.id);
            console.log('Stored Supabase user ID as UUID after Google sign in:', data.user.id);
          } catch (error) {
            console.error('Error storing user ID after Google sign in:', error);
          }
        }

        // setUser will be handled by the onAuthStateChange listener
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Session after ID token sign-in attempt:', { session, sessionError });

        if (sessionError) {
          console.warn('Error fetching session immediately after sign-in:', sessionError);
        }

        if (!session && !error) {
          console.log('No session immediately available, relying on onAuthStateChange.');
        } else if (session) {
          console.log('Session established.');
        }

      } catch (error) {
        console.error('Google authentication error with signInWithIdToken:', error);
        let errorMessage = 'Authentication failed. Please try again.';

        if (error.message) {
          errorMessage = error.message;
        }

        showAlert('Authentication Error', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    handleGoogleSignIn();
  }, [response]);

  // Handle email authentication (sign in or sign up)
  const handleEmailAuth = async (isSignUp = false) => {
    // Validate email domain
    if (!email.endsWith('@klu.ac.in') && email !== 'test.klu@gmail.com') {
      showAlert(
        "Authentication Failed",
        "Only @klu.ac.in email addresses or test.klu@gmail.com are allowed to sign in."
      );
      return;
    }

    // Validate password
    if (!password || password.length < 6) {
      showAlert(
        "Invalid Password",
        "Password must be at least 6 characters long."
      );
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Attempting ${isSignUp ? 'sign up' : 'sign in'} with email:`, email);

      let result;

      if (isSignUp) {
        // Create new user with Supabase
        result = await supabase.auth.signUp({
          email,
          password,
        });
        console.log('User created successfully');
      } else {
        // Sign in existing user with Supabase
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        console.log('User signed in successfully');
      }

      if (result.error) {
        throw result.error;
      }

      setUser(result.data.user);
    } catch (error) {
      console.error('Email auth error:', error);

      let errorMessage = 'Authentication failed. Please try again.';

      if (error.message.includes('already registered')) {
        errorMessage = 'This email is already registered. Please log in instead.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'No account found with this email. Please sign up.';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Invalid email format. Please check your email.';
      } else if (debugMode && error.message) {
        errorMessage = error.message;
      }

      showAlert("Authentication Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a test user for development
  const createTestUser = async () => {
    setIsLoading(true);
    // Using a more standard email format that Supabase will accept
    const testEmail = 'test.klu@gmail.com';
    const testPassword = 'test123456';

    try {
      console.log('Creating test user:', testEmail);

      // Try to create a new user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (error) {
        // If user already exists, try to sign in
        if (error.message.includes('already registered')) {
          console.log('Test user already exists, trying to sign in');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

          if (signInError) {
            throw signInError;
          }

          // Store Supabase user ID as UUID
          try {
            await AsyncStorage.setItem('currentUserUuid', signInData.user.id);
            console.log('Stored Supabase user ID as UUID for test user:', signInData.user.id);
          } catch (error) {
            console.error('Error storing test user ID:', error);
          }

          console.log('Signed in with test user');
          setUser(signInData.user);
          showAlert(
            'Test User Signed In',
            `Successfully signed in with test user:\nEmail: ${testEmail}\nPassword: ${testPassword}`
          );
        } else {
          throw error;
        }
      } else {
        // Store Supabase user ID as UUID for new test user
        try {
          await AsyncStorage.setItem('currentUserUuid', data.user.id);
          console.log('Stored Supabase user ID as UUID for new test user:', data.user.id);
        } catch (error) {
          console.error('Error storing new test user ID:', error);
        }

        console.log('Test user created successfully');
        setUser(data.user);
        showAlert(
          'Test User Created',
          `Email: ${testEmail}\nPassword: ${testPassword}\n\nYou can now sign in with these credentials.`
        );
      }
    } catch (error) {
      console.error('Test user error:', error);

      let errorMessage = 'Failed to create or sign in with test user.';
      if (debugMode && error.message) {
        errorMessage = error.message;
      }

      showAlert("Test User Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize animation when component mounts
  useEffect(() => {
    opacity.value = 1;
    scale.value = 1;

    const fallbackTimer = setTimeout(() => {
      if (showSplash) {
        console.log('Fallback timer triggered for splash screen');
        setShowSplash(false);
      }
    }, 8000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Effect to play animation after component is mounted
  useEffect(() => {
    const animationTimer = setTimeout(() => {
      if (animationRef.current) {
        console.log('Starting Lottie animation');
        animationRef.current.reset();
        animationRef.current.play();
      }
    }, 100);

    return () => clearTimeout(animationTimer);
  }, []);

  // Helper function to show alerts using React Native Paper
  const showAlert = (title, message, confirmAction = () => {}) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertConfirmAction(() => confirmAction);
    setAlertVisible(true);
  };

  // Handle animation completion
  const onAnimationFinish = () => {
    console.log('Splash animation finished');

    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 });
      scale.value = withTiming(1.2, { duration: 500 });

      setTimeout(() => {
        setShowSplash(false);
      }, 500);
    }, 1000);
  };

  if (showSplash) {
    return (
      <View style={[styles.container, { backgroundColor: '#CFF6F5', justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.View
          style={[
            styles.splashContainer,
            {
              opacity: opacity,
              transform: [
                { scale: scale }
              ],
            }
          ]}
        >
          <LottieView
            ref={animationRef}
            source={require('./assets/splash.json')}
            style={styles.splashAnimation}
            autoPlay={false}
            loop={false}
            speed={0.8}
            onAnimationFinish={onAnimationFinish}
            renderMode="HARDWARE"
            cacheStrategy="strong"
            hardwareAccelerationAndroidEnabled={true}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // Render user details screen if needed
  if (user && (showUserDetails || !hasUserDetails)) {
    return (
      <UserDetailsScreen
        onComplete={() => {
          setShowUserDetails(false);
          setHasUserDetails(true);
        }}
      />
    );
  }

  // Render login screen if not authenticated
  if (!user) {
    return (
      <SignInScreen
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isLoading={isLoading}
        handleEmailAuth={handleEmailAuth}
        handleGoogleSignIn={() => {
          setIsLoading(true);
          console.log('Starting Google sign-in prompt');
          
          promptAsync({
            useProxy: Platform.OS !== 'web' && __DEV__, // Use proxy in development
            showInRecents: true,
            responseType: Platform.OS === 'web' ? 'token' : 'id_token'
          }).then(result => {
            console.log('Google sign-in prompt result:', result);
            if (result.type !== 'success') {
              console.log('Google sign-in was not successful:', result.type);
              setIsLoading(false);
              if (result.type === 'error') {
                showAlert('Authentication Error', 'Google sign-in was cancelled or failed');
              }
            }
          }).catch(error => {
            console.error('Google sign-in error:', error);
            setIsLoading(false);
            showAlert('Authentication Error', 'Failed to initialize Google sign-in');
          });
        }}
        createTestUser={createTestUser}
        debugMode={debugMode}
        setDebugMode={setDebugMode}
      />
    );
  }

  // User is authenticated and has details, show the tab navigator
  return (
    <PaperProvider>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <MainStack />
          </NavigationContainer>

          {/* Alert Dialog */}
          <AlertDialog
            visible={alertVisible}
            onDismiss={() => setAlertVisible(false)}
            title={alertTitle}
            message={alertMessage}
            onConfirm={() => {
              setAlertVisible(false);
              alertConfirmAction();
            }}
          />
        </GestureHandlerRootView>
      </ThemeProvider>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.primary,
  },
  welcomeText: {
    paddingTop: 100,
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.8,
    marginBottom: 40,
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
  toolsTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsIcon: {
    width: 24,
    height: 24,
  },
  toolsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  splashContainer: {
    width: 192,
    height: 192,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashAnimation: {
    width: '100%',
    height: '100%',
  },
});

export default App;