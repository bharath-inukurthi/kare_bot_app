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
import { getAuth, signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { fetchAndCacheTimeTable } from './UserDetailsScreen.js';
// Define the color scheme consistent with the app
const COLORS = {
  primary: '#1e40af', // Richer blue
  primaryLight: '#3b82f6', // Lighter blue
  primaryGradient: ['#1e40af', '#3b82f6'], // Blue gradient
  secondary: '#ffffff', // White
  accent: '#7c3aed', // Vibrant purple
  text: '#0f172a', // Dark blue-gray for text
  textSecondary: '#475569', // Gray for secondary text
  background: '#f1f5f9', // Light gray background
  error: '#ef4444', // Red for errors
  divider: '#e2e8f0', // Light gray for dividers
};

const ProfileScreen = () => {
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
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Extract Google profile data
        const userData = {
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          providerId: currentUser.providerData[0]?.providerId
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
      const auth = getAuth();
      await signOut(auth);
      // Note: The App component will handle redirecting to the login screen
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Sign Out Error', 'An error occurred while signing out. Please try again.');
    }
  };

  // Handle sending feedback (mock)
  const handleSendFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'Your feedback helps us improve KARE Bot! Send us your thoughts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Email', onPress: () => Linking.openURL('mailto:bharathinukurthi1@gmail.com')  }
      ]
    );
  };

  // Mock data for profile options
  const handleShowCredits = () => {
    setShowCreditsModal(true);
    animateCredits(); // Make sure we start the credits animation
  };

  const profileOptions = [
    {
      id: '1',
      title: 'Academic Details',
      description: 'View and edit your section and year',
      icon: '📋',
      action: () => setIsEditing(true)
    },
    {
      id: '2',
      title: 'SIS Portal',
      description: 'Access your student portal for Grades and Attendance',
      icon: '👨🏻‍🎓',
      action: () => Linking.openURL('https://student.kalasalingam.ac.in/login')
    },
    {
      id: '3',
      title: 'Hostel Portal',
      description: 'Access your hostel portal Permissions and Leaves',
      icon: '🏫',
      action: () => Linking.openURL('https://hostels.kalasalingam.ac.in/')
    },
   
    {
      id: '4',
      title: 'LMS Portal',
      description: 'One stop solution for your assignment submissions and recorded classes',
      icon: '𝑳𝐦𝐬',
      action: () => Linking.openURL('https://lms.kalasalingam.ac.in/login/index.php')
    },
    /*{
      id: '5',
      title: 'Help & Support',
      description: 'Get assistance with the app',
      icon: '❓',
      action: () => Alert.alert('Help', 'This would open the support section')
    },*/
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
      
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={COLORS.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>My Profile</Text>
        </LinearGradient>
        
        {isEditing && (
          <>
            <Modal
              animationType="slide"
              transparent={true}
              visible={isEditing}
              onRequestClose={() => !isLoading && setIsEditing(false)}
            >
              <Pressable 
                style={styles.modalOverlay}
                onPress={() => !isLoading && setIsEditing(false)}
              >
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Edit Academic Details</Text>
                  
                  <View style={styles.editContainer}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Section</Text>
                      <TouchableOpacity
                        style={[styles.dropdownButton, section && styles.dropdownButtonSelected]}
                        onPress={() => !isLoading && setShowSectionModal(true)}
                        disabled={isLoading}
                      >
                        <Text style={[styles.dropdownButtonText, !section && styles.placeholderText]}>
                          {section || 'Select your section'}
                        </Text>
                      </TouchableOpacity>
                    </View>
  
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Year</Text>
                      <TouchableOpacity
                        style={[styles.dropdownButton, year && styles.dropdownButtonSelected]}
                        onPress={() => !isLoading && setShowYearModal(true)}
                        disabled={isLoading}
                      >
                        <Text style={[styles.dropdownButtonText, !year && styles.placeholderText]}>
                          {year || 'Select your year'}
                        </Text>
                      </TouchableOpacity>
                    </View>
  
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Semester</Text>
                      <TouchableOpacity
                        style={[styles.dropdownButton, semester && styles.dropdownButtonSelected]}
                        onPress={() => !isLoading && setShowSemesterModal(true)}
                        disabled={isLoading}
                      >
                        <Text style={[styles.dropdownButtonText, !semester && styles.placeholderText]}>
                          {semester || 'Select your semester'}
                        </Text>
                      </TouchableOpacity>
                    </View>
  
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={[styles.cancelButton, isLoading && styles.disabledButton]}
                        onPress={() => !isLoading && setIsEditing(false)}
                        disabled={isLoading}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.saveButton, isLoading && styles.disabledButton]}
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
                          <Text style={styles.saveButtonText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Pressable>
            </Modal>
  
            <Modal
              visible={showSectionModal && !isLoading}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowSectionModal(false)}
            >
              <Pressable 
                style={styles.modalOverlay}
                onPress={() => setShowSectionModal(false)}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Section</Text>
                  <ScrollView style={styles.optionsList}>
                    {SECTION_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.optionItem, section === option && styles.selectedOption]}
                        onPress={() => {
                          setSection(option);
                          setShowSectionModal(false);
                        }}
                      >
                        <Text style={[styles.optionText, section === option && styles.selectedOptionText]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
  
            <Modal
              visible={showSemesterModal && !isLoading}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowSemesterModal(false)}
            >
              <Pressable 
                style={styles.modalOverlay}
                onPress={() => setShowSemesterModal(false)}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Semester</Text>
                  <ScrollView style={styles.optionsList}>
                    {SEMESTER_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.optionItem, semester === option && styles.selectedOption]}
                        onPress={() => {
                          setSemester(option);
                          setShowSemesterModal(false);
                        }}
                      >
                        <Text style={[styles.optionText, semester === option && styles.selectedOptionText]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
  
            <Modal
              visible={showYearModal && !isLoading}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowYearModal(false)}
            >
              <Pressable 
                style={styles.modalOverlay}
                onPress={() => setShowYearModal(false)}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Year</Text>
                  <ScrollView style={styles.optionsList}>
                    {YEAR_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.optionItem, year === option && styles.selectedOption]}
                        onPress={() => {
                          setYear(option);
                          setShowYearModal(false);
                        }}
                      >
                        <Text style={[styles.optionText, year === option && styles.selectedOptionText]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
          </>
        )}
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={true}
        >
          <View style={styles.profileHeader}>
            <Image 
              source={user?.photoURL ? { uri: user.photoURL } : require('../assets/default-avatar.png')} 
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.displayName || 'KLU Student'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileRole}>{user?.providerId === 'google.com' ? 'Google User' : 'Student'}</Text>
              {section && year && semester && (
                <View style={styles.academicInfo}>
                  <Text style={styles.academicInfoText}>Section {section} • Year {year} • {semester} Semester</Text>
                </View>
              )}
            </View>
          </View>
  
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>University Options</Text>
            {profileOptions.map(option => (
              <TouchableOpacity 
                key={option.id} 
                style={styles.optionItem}
                onPress={option.action}
              >
                <View style={styles.optionIcon}>
                  <Text style={styles.optionIconText}>{option.icon}</Text>
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Info</Text>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleSendFeedback}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>📝</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Send Feedback</Text>
                <Text style={styles.optionDescription}>Help us improve the KARE Bot app</Text>
              </View>
            </TouchableOpacity>
  
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleShowCredits}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>👨‍💻</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Developer Credits</Text>
                <Text style={styles.optionDescription}>Meet the team behind KARE Bot</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
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