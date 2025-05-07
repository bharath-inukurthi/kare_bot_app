import React from 'react';
import { Platform, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  Pressable,
  Animated,
  ActivityIndicator
} from 'react-native';
import supabase from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { fetchAndCacheTimeTable } from './UserDetailsScreen.js';
import { useTheme } from '../context/ThemeContext';
import { FontAwesome5, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { Dialog, Portal, Button } from 'react-native-paper';
// Define the color scheme consistent with the app
const COLORS = {
  primary: '#00b3b3', // Teal for header and highlights
  primaryLight: '#a7f3f3', // Light teal for gradients
  secondary: '#ffffff', // White
  accent: '#7c3aed', // Vibrant purple (for icons if needed)
  text: '#0f172a', // Dark blue-gray for text
  textSecondary: '#64748b', // Gray for secondary text
  background: '#f8fafc', // Light background
  backgroundDark: '#0f172a', // Dark background
  cardDark: '#1e293b', // Card background in dark mode
  cardLight: '#ffffff', // Card background in light mode
  error: '#ef4444', // Red for errors
  errorLight: '#fee2e2', // Light red for sign out in light mode
  divider: '#e2e8f0', // Light gray for dividers
};

const ProfileScreen = () => {
  const { isDarkMode } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  // Add loading animation refs
  const loadingOpacity = React.useRef(new Animated.Value(0)).current;
  const loadingScale = React.useRef(new Animated.Value(0)).current;

  const animateCredits = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Add loading animation function
  const animateLoading = (show) => {
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: show ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(loadingScale, {
        toValue: show ? 1 : 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  const [user, setUser] = React.useState(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [showSectionModal, setShowSectionModal] = React.useState(false);
  const [showYearModal, setShowYearModal] = React.useState(false);
  const [showSemesterModal, setShowSemesterModal] = React.useState(false);
  const [showCreditsModal, setShowCreditsModal] = React.useState(false);
  const [section, setSection] = React.useState('');
  const [year, setYear] = React.useState('');
  const [semester, setSemester] = React.useState('');
  // Add loading state
  const [isLoading, setIsLoading] = React.useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = React.useState(false);

  // Generate section options from S01 to S30
  const SECTION_OPTIONS = Array.from({length: 30}, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
  const YEAR_OPTIONS = ['II', 'III'];
  const SEMESTER_OPTIONS = ['Odd', 'Even'];

// Inside your component
const directorCreditOpacity = useRef(new Animated.Value(0)).current;
const directorCreditTextOpacity = useRef(new Animated.Value(0)).current;
const directorCreditTranslateY = useRef(new Animated.Value(100)).current;
const directorCreditNameTranslateY = useRef(new Animated.Value(150)).current;
const directorCreditTilt = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (showCreditsModal) {
    Animated.parallel([
      Animated.spring(directorCreditOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(directorCreditTextOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(directorCreditTranslateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(directorCreditNameTranslateY, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }
}, [showCreditsModal]);

  React.useEffect(() => {
    loadUserData();
  }, []);

  // Show or hide loading based on isLoading state
  React.useEffect(() => {
    animateLoading(isLoading);
  }, [isLoading]);

  const loadUserData = async () => {
    try {
      // Get the current user from Supabase
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (currentUser) {
        // Extract user data
        const userData = {
          displayName: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'KLU Student',
          email: currentUser.email,
          photoURL: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture,
          providerId: currentUser.app_metadata?.provider || 'email'
        };
        setUser(userData);

        // Load section and year from AsyncStorage
        const savedDetails = await AsyncStorage.getItem('userDetails');
        if (savedDetails) {
          const details = JSON.parse(savedDetails);
          setSection(details.section);
          setYear(details.year);
          setSemester(details.semester);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSaveDetails = async () => {
    try {
      if (!section.trim() || !year.trim() || !semester.trim()) {
        Alert.alert('Required Fields', 'Please fill in all fields');
        return;
      }

      // Show loading indicator
      setIsLoading(true);

      const userDetails = {
        section: section.trim(),
        year: year.trim(),
        semester: semester.trim(),
      };

      await AsyncStorage.setItem('userDetails', JSON.stringify(userDetails));
      // Fetch and cache timetable after updating details
      console.log('Fetching timetable for:', year, section, semester);
      await fetchAndCacheTimeTable(year, section, semester);

      // Simulate network delay for demonstration purposes (remove in production)
      setTimeout(() => {
        setIsLoading(false);
        setIsEditing(false);
        Alert.alert('Success', 'Profile details updated successfully');
      }, 1500);
    } catch (error) {
      console.error('Error saving user details:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save profile details. Please try again.');
    }
  };

  // Function to handle sign out
  const handleSignOut = async () => {
    try {
      // Use Supabase to sign out
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      console.log('User signed out successfully');
      // Note: The App component will handle redirecting to the login screen
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Sign Out Error', 'An error occurred while signing out. Please try again.');
    }
  };

  // Update handleSendFeedback to use Dialog
  const handleSendFeedback = () => {
    setShowFeedbackDialog(true);
  };

  const handleOpenEmail = () => {
    setShowFeedbackDialog(false);
    Linking.openURL('mailto:bharathkare276@gmail.com');
  };

  // Mock data for profile options
  const handleShowCredits = () => {
    setShowCreditsModal(true);
    animateCredits(); // Make sure we start the credits animation
  };

  // University Options (use icons as per designer's image)
  const universityOptions = [
    {
      id: '1',
      title: 'Academic Details',
      icon: <Feather name="edit-3" size={20} color={isDarkMode ? COLORS.primaryLight : COLORS.primary} />,
      action: () => setIsEditing(true)
    },
    {
      id: '2',
      title: 'SIS Portal',
      icon: <FontAwesome5 name="university" size={20} color={isDarkMode ? COLORS.primaryLight : COLORS.primary} />,
      action: () => Linking.openURL('https://student.kalasalingam.ac.in/login')
    },
    {
      id: '3',
      title: 'Hostel Portal',
      icon: <FontAwesome5 name="building" size={20} color={isDarkMode ? COLORS.primaryLight : COLORS.primary} />,
      action: () => Linking.openURL('https://hostels.kalasalingam.ac.in/')
    },
    {
      id: '4',
      title: 'LMS Portal',
      icon: <MaterialCommunityIcons name="book-open-variant" size={20} color={isDarkMode ? COLORS.primaryLight : COLORS.primary} />,
      action: () => Linking.openURL('https://lms.kalasalingam.ac.in/login/index.php')
    },
  ];

  // App Info Options
  const appOptions = [
    {
      id: '5',
      title: 'Send Feedback',
      icon: <Feather name="message-square" size={20} color={isDarkMode ? COLORS.primaryLight : COLORS.primary} />,
      action: handleSendFeedback
    },
    {
      id: '6',
      title: 'Developer Credits',
      icon: <Ionicons name="code-slash" size={20} color={isDarkMode ? COLORS.primaryLight : COLORS.primary} />,
      action: handleShowCredits
    },
  ];

  return (
    <>
      <Modal
  animationType="fade"
  transparent={true}
  visible={showCreditsModal}
  onRequestClose={() => setShowCreditsModal(false)}
>
  <Animated.View style={[styles.creditsModal, { opacity: fadeAnim }]}>
    <TouchableOpacity
      style={styles.creditsDismiss}
      onPress={() => setShowCreditsModal(false)}
    >
      <Text style={styles.creditsDismissText}>×</Text>
    </TouchableOpacity>

    {/* Director credit with fade in/out */}
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        opacity: directorCreditOpacity,
        zIndex: 10
      }}
    >
      <Animated.Text
  style={{
    color: 'white',
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    marginBottom: 10,
    opacity: directorCreditTextOpacity,
    transform: [
      { translateY: directorCreditTranslateY },
      {
        rotate: directorCreditTilt.interpolate({
          inputRange: [-10, 10],
          outputRange: ['-2deg', '2deg'],
        }),
      },
    ],
  }}
>
  Written & Directed by
</Animated.Text>

<Animated.Text
  style={{
    color: 'white',
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    marginBottom: 10,
    opacity: directorCreditTextOpacity,
    transform: [
      { translateY: directorCreditTranslateY },
      {
        rotate: directorCreditTilt.interpolate({
          inputRange: [-10, 10],
          outputRange: ['-2deg', '2deg'],
        }),
      },
    ],
  }}
>
  Bharath Inukurthi
</Animated.Text>
    </Animated.View>
  </Animated.View>
</Modal>

      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.background }}>
        <LinearGradient
          colors={isDarkMode ? ['#1B62B9','#232b47',COLORS.backgroundDark ] : ['#a7f3f3', '#f8fafc',COLORS.background ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 500, zIndex: 0 }}
        />
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 0, zIndex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDarkMode ? COLORS.primary : COLORS.primary, letterSpacing: 0.5 }}>
              My Profile
            </Text>
          </View>

          {/* Profile Card */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: isDarkMode ? COLORS.primary : COLORS.primary,
              marginBottom: 12,
            }}>
              <Image
                source={user?.photoURL ? { uri: user.photoURL } : require('../assets/avatar.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDarkMode ? COLORS.secondary : COLORS.text, marginBottom: 2 }}>
              {user?.displayName || 'KLU Student'}
            </Text>
            <Text style={{ fontSize: 13, color: isDarkMode ? COLORS.textSecondary : '#94a3b8', marginBottom: 6 }}>
              {user?.email}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 0 }}>
              <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.primaryLight : COLORS.primary, fontWeight: '500' }}>
                Section: <Text style={{ color: isDarkMode ? COLORS.secondary : COLORS.text }}>{section || 'N/A'}</Text>
              </Text>
              <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.primaryLight : COLORS.primary, fontWeight: '500' }}>
                Year: <Text style={{ color: isDarkMode ? COLORS.secondary : COLORS.text }}>{year || 'N/A'}</Text>
              </Text>
              <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.primaryLight : COLORS.primary, fontWeight: '500' }}>
                Semester: <Text style={{ color: isDarkMode ? COLORS.secondary : COLORS.text }}>{semester || 'N/A'}</Text>
              </Text>
            </View>
          </View>

          {/* University Options Section */}
          <Text style={{ marginLeft: 24, marginBottom: 6, color: isDarkMode ? COLORS.primaryLight : COLORS.primary, fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>University Options</Text>
          <View style={{ marginHorizontal: 18, marginBottom: 18, borderRadius: 16, backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight, padding: 0, overflow: 'hidden' }}>
            {universityOptions.map((option, idx) => (
              <TouchableOpacity
                key={option.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 18,
                  paddingHorizontal: 18,
                  borderBottomWidth: idx !== universityOptions.length - 1 ? 1 : 0,
                  borderBottomColor: isDarkMode ? '#22304a' : COLORS.divider,
                  backgroundColor: 'transparent',
                }}
                onPress={option.action}
              >
                <View style={{ width: 28, alignItems: 'center', marginRight: 16 }}>
                  {option.icon}
                </View>
                <Text style={{ fontSize: 16, color: isDarkMode ? COLORS.secondary : COLORS.text, fontWeight: '500', flex: 1 }}>{option.title}</Text>
                <Text style={{ color: isDarkMode ? COLORS.primaryLight : COLORS.primary, fontSize: 16, fontWeight: 'bold' }}>{'>'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* App Info Section */}
          <Text style={{ marginLeft: 24, marginBottom: 6, color: isDarkMode ? COLORS.primaryLight : COLORS.primary, fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>App Info</Text>
          <View style={{ marginHorizontal: 18, marginBottom: 18, borderRadius: 16, backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight, padding: 0, overflow: 'hidden' }}>
            {appOptions.map((option, idx) => (
              <TouchableOpacity
                key={option.id}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 18, borderBottomWidth: idx !== appOptions.length - 1 ? 1 : 0, borderBottomColor: isDarkMode ? '#22304a' : COLORS.divider }}
                onPress={option.action}
              >
                <View style={{ width: 28, alignItems: 'center', marginRight: 16 }}>
                  {option.icon}
                </View>
                <Text style={{ fontSize: 16, color: isDarkMode ? COLORS.secondary : COLORS.text, fontWeight: '500', flex: 1 }}>{option.title}</Text>
                <Text style={{ color: isDarkMode ? COLORS.primaryLight : COLORS.primary, fontSize: 16, fontWeight: 'bold' }}>{'>'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Academic Details Editing Modal */}
          {isEditing && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={isEditing}
              onRequestClose={() => !isLoading && setIsEditing(false)}
            >
              <Pressable
                style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.7)' : 'rgba(0,0,0,0.2)' }]}
                onPress={() => !isLoading && setIsEditing(false)}
              >
                <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight }]}>
                  <Text style={[styles.modalTitle, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Edit Academic Details</Text>
                  <View style={styles.editContainer}>
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Section</Text>
                      <TouchableOpacity
                        style={[
                          styles.dropdownButton,
                          section && styles.dropdownButtonSelected,
                          {
                            backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.background,
                            borderColor: section ? (isDarkMode ? COLORS.primaryLight : COLORS.primary) : COLORS.divider,
                          }
                        ]}
                        onPress={() => !isLoading && setShowSectionModal(true)}
                        disabled={isLoading}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          {
                            color: section ? (isDarkMode ? COLORS.secondary : COLORS.text) : COLORS.textSecondary,
                          }
                        ]}>
                          {section || 'Select your section'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Year</Text>
                      <TouchableOpacity
                        style={[
                          styles.dropdownButton,
                          year && styles.dropdownButtonSelected,
                          {
                            backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.background,
                            borderColor: year ? (isDarkMode ? COLORS.primaryLight : COLORS.primary) : COLORS.divider,
                          }
                        ]}
                        onPress={() => !isLoading && setShowYearModal(true)}
                        disabled={isLoading}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          {
                            color: year ? (isDarkMode ? COLORS.secondary : COLORS.text) : COLORS.textSecondary,
                          }
                        ]}>
                          {year || 'Select your year'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Semester</Text>
                      <TouchableOpacity
                        style={[
                          styles.dropdownButton,
                          semester && styles.dropdownButtonSelected,
                          {
                            backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.background,
                            borderColor: semester ? (isDarkMode ? COLORS.primaryLight : COLORS.primary) : COLORS.divider,
                          }
                        ]}
                        onPress={() => !isLoading && setShowSemesterModal(true)}
                        disabled={isLoading}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          {
                            color: semester ? (isDarkMode ? COLORS.secondary : COLORS.text) : COLORS.textSecondary,
                          }
                        ]}>
                          {semester || 'Select your semester'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.cancelButton, isLoading && styles.disabledButton, { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.background }]}
                        onPress={() => !isLoading && setIsEditing(false)}
                        disabled={isLoading}
                      >
                        <Text style={[styles.cancelButtonText, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveButton, isLoading && styles.disabledButton, { backgroundColor: isDarkMode ? COLORS.primary : COLORS.primary }]}
                        onPress={!isLoading ? handleSaveDetails : null}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Animated.View
                            style={{
                              opacity: loadingOpacity,
                              transform: [{ scale: loadingScale }],
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <ActivityIndicator color={COLORS.secondary} />
                            <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>Saving...</Text>
                          </Animated.View>
                        ) : (
                          <Text style={[styles.saveButtonText, { color: COLORS.secondary }]}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Pressable>
            </Modal>
          )}

          {/* Section Modal */}
          <Modal
            visible={showSectionModal && !isLoading}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSectionModal(false)}
          >
            <Pressable
              style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.7)' : 'rgba(0,0,0,0.2)' }]}
              onPress={() => setShowSectionModal(false)}
            >
              <View style={[styles.modalContent, { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight }]}>
                <Text style={[styles.modalTitle, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Select Section</Text>
                <ScrollView style={styles.optionsList}>
                  {SECTION_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionItem,
                        {
                          borderBottomColor: isDarkMode ? '#22304a' : COLORS.divider,
                          backgroundColor: (section === option)
                            ? (isDarkMode ? COLORS.primary + '55' : COLORS.primaryLight + '55')
                            : 'transparent',
                          borderLeftWidth: (section === option) ? 4 : 0,
                          borderLeftColor: (section === option)
                            ? (isDarkMode ? COLORS.primary : COLORS.primaryLight)
                            : 'transparent',
                        }
                      ]}
                      onPress={() => {
                        setSection(option);
                        setShowSectionModal(false);
                      }}
                    >
                      <Text style={[
                        styles.optionText,
                        {
                          color: (section === option)
                            ? (isDarkMode ? COLORS.primaryLight : COLORS.primary)
                            : (isDarkMode ? COLORS.secondary : COLORS.text),
                          fontWeight: (section === option) ? 'bold' : 'normal',
                        }
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          {/* Year Modal */}
          <Modal
            visible={showYearModal && !isLoading}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowYearModal(false)}
          >
            <Pressable
              style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.7)' : 'rgba(0,0,0,0.2)' }]}
              onPress={() => setShowYearModal(false)}
            >
              <View style={[styles.modalContent, { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight }]}>
                <Text style={[styles.modalTitle, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Select Year</Text>
                <ScrollView style={styles.optionsList}>
                  {YEAR_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionItem,
                        {
                          borderBottomColor: isDarkMode ? '#22304a' : COLORS.divider,
                          backgroundColor: (year === option)
                            ? (isDarkMode ? COLORS.primary + '55' : COLORS.primaryLight + '55')
                            : 'transparent',
                          borderLeftWidth: (year === option) ? 4 : 0,
                          borderLeftColor: (year === option)
                            ? (isDarkMode ? COLORS.primary : COLORS.primaryLight)
                            : 'transparent',
                        }
                      ]}
                      onPress={() => {
                        setYear(option);
                        setShowYearModal(false);
                      }}
                    >
                      <Text style={[
                        styles.optionText,
                        {
                          color: (year === option)
                            ? (isDarkMode ? COLORS.primaryLight : COLORS.primary)
                            : (isDarkMode ? COLORS.secondary : COLORS.text),
                          fontWeight: (year === option) ? 'bold' : 'normal',
                        }
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          {/* Semester Modal */}
          <Modal
            visible={showSemesterModal && !isLoading}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSemesterModal(false)}
          >
            <Pressable
              style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.7)' : 'rgba(0,0,0,0.2)' }]}
              onPress={() => setShowSemesterModal(false)}
            >
              <View style={[styles.modalContent, { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight }]}>
                <Text style={[styles.modalTitle, { color: isDarkMode ? COLORS.primaryLight : COLORS.primary }]}>Select Semester</Text>
                <ScrollView style={styles.optionsList}>
                  {SEMESTER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionItem,
                        {
                          borderBottomColor: isDarkMode ? '#22304a' : COLORS.divider,
                          backgroundColor: (semester === option)
                            ? (isDarkMode ? COLORS.primary + '55' : COLORS.primaryLight + '55')
                            : 'transparent',
                          borderLeftWidth: (semester === option) ? 4 : 0,
                          borderLeftColor: (semester === option)
                            ? (isDarkMode ? COLORS.primary : COLORS.primaryLight)
                            : 'transparent',
                        }
                      ]}
                      onPress={() => {
                        setSemester(option);
                        setShowSemesterModal(false);
                      }}
                    >
                      <Text style={[
                        styles.optionText,
                        {
                          color: (semester === option)
                            ? (isDarkMode ? COLORS.primaryLight : COLORS.primary)
                            : (isDarkMode ? COLORS.secondary : COLORS.text),
                          fontWeight: (semester === option) ? 'bold' : 'normal',
                        }
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={{
              backgroundColor: isDarkMode ? COLORS.error : COLORS.errorLight,
              borderRadius: 12,
              marginHorizontal: 18,
              marginTop: 8,
              marginBottom: 32,
              paddingVertical: 16,
              alignItems: 'center',
            }}
            onPress={handleSignOut}
          >
            <Text style={{ color: isDarkMode ? COLORS.secondary : COLORS.error, fontWeight: 'bold', fontSize: 16 }}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Portal>
        <Dialog
          visible={showFeedbackDialog}
          onDismiss={() => setShowFeedbackDialog(false)}
          style={{
            backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight,
          }}
        >
          <Dialog.Title style={{ color: isDarkMode ? COLORS.primaryLight : COLORS.primary }}>
            Send Feedback
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: isDarkMode ? COLORS.secondary : COLORS.text }}>
              Your feedback helps us improve KARE Bot! Send us your thoughts.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowFeedbackDialog(false)}
              textColor={isDarkMode ? COLORS.primaryLight : COLORS.primary}
            >
              Cancel
            </Button>
            <Button
              onPress={handleOpenEmail}
              textColor={isDarkMode ? COLORS.primaryLight : COLORS.primary}
            >
              Open Email
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}


const styles = StyleSheet.create({
  creditsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  creditsContent: {
    width: '100%',
    height: '100%',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsTitle: {
    fontFamily: 'System',
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    marginBottom: 30,
    textShadowColor: '#ff00ff',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    transform: [{ rotate: '-3deg' }],
  },
  creditsText: {
    fontFamily: 'System',
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  creditsRole: {
    fontFamily: 'System',
    fontSize: 22,
    color: '#ff69b4',
    textAlign: 'center',
    marginBottom: 35,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    transform: [{ rotate: '2deg' }],
  },
  creditsDismiss: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 15,
    zIndex: 1000,
  },
  creditsDismissText: {
    color: '#fff',
    fontSize: 40,
    textShadowColor: '#ff00ff',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  creditsContent: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  creditsTitle: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  creditsText: {
    fontFamily: 'System',
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  creditsRole: {
    fontFamily: 'System',
    fontSize: 18,
    color: '#ff69b4',
    textAlign: 'center',
    marginBottom: 30,
    textTransform: 'uppercase',
  },
  creditsDismiss: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
  },
  creditsDismissText: {
    color: '#fff',
    fontSize: 30,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: COLORS.primaryLight,
    marginBottom: 8,
  },
  academicInfo: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  academicInfoText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIconText: {
    fontSize: 20,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  creditsModal: {
    backgroundColor: '#000000',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  creditsTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  creditsText: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  specialThanks: {
    marginTop: 30,
  },creditsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsDismiss: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  creditsDismissText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  selectedOption: {
    backgroundColor: COLORS.background,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
  },
  signOutButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  editContainer: {
    width: '100%',
    gap: 16,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  dropdownButtonSelected: {
    borderColor: COLORS.primary,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  }
});

export default ProfileScreen;