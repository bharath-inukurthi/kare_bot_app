import React from 'react';
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
  Pressable
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

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
  const [user, setUser] = React.useState(null);
  
  // Remove residual modal state variables
  const [isEditing, setIsEditing] = React.useState(false);
  const [showSectionModal, setShowSectionModal] = React.useState(false);
  const [showYearModal, setShowYearModal] = React.useState(false);
  const [section, setSection] = React.useState('');
  const [year, setYear] = React.useState('');

  // Generate section options from S01 to S30
  const SECTION_OPTIONS = Array.from({length: 30}, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
  const YEAR_OPTIONS = ['II', 'III'];

  React.useEffect(() => {
    loadUserData();
  }, []);

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
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSaveDetails = async () => {
    try {
      if (!section.trim() || !year.trim()) {
        Alert.alert('Required Fields', 'Please fill in both section and year');
        return;
      }

      const userDetails = {
        section: section.trim(),
        year: year.trim(),
      };

      await AsyncStorage.setItem('userDetails', JSON.stringify(userDetails));
      setIsEditing(false);
      Alert.alert('Success', 'Profile details updated successfully');
    } catch (error) {
      console.error('Error saving user details:', error);
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
    /*{
      id: '4',
      title: 'Notifications',
      description: 'Manage your notification settings',
      icon: '🔔',
      action: () => Alert.alert('Notifications', 'This would allow you to manage notifications')
    },
    {
      id: '5',
      title: 'Help & Support',
      description: 'Get assistance with the app',
      icon: '❓',
      action: () => Alert.alert('Help', 'This would open the support section')
    },*/
  ];

  return (
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
        <Modal
          animationType="slide"
          transparent={true}
          visible={isEditing}
          onRequestClose={() => setIsEditing(false)}
        >
          <Pressable 
                style={styles.modalOverlay}
                onPress={() => setIsEditing(false)}
              >
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Edit Academic Details</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Section</Text>
                    <TouchableOpacity
                      style={[styles.dropdownButton, section && styles.dropdownButtonSelected]}
                      onPress={() => setShowSectionModal(true)}
                    >
                      <Text style={[styles.dropdownButtonText, !section && styles.placeholderText]}>
                        {section || 'Select your section'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Year of Study</Text>
                    <TouchableOpacity
                      style={[styles.dropdownButton, year && styles.dropdownButtonSelected]}
                      onPress={() => setShowYearModal(true)}
                    >
                      <Text style={[styles.dropdownButtonText, !year && styles.placeholderText]}>
                        {year || 'Select your year'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: COLORS.divider,marginHorizontal:10}]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={[styles.buttonText,{color:'#000000'}]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => {
                    // Handle save logic
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
        
          </Pressable>
        </Modal>
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
            {section && year && (
              <View style={styles.academicInfo}>
                <Text style={styles.academicInfoText}>Section {section} • Year {year}</Text>
              </View>
            )}
          </View>
        </View>

        <>
          
    
        
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
          <Text style={styles.sectionTitle}>App Feedback</Text>
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
        </View>
        
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </>
      </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    minHeight: 200,
    maxWidth: 400,
    zIndex: 1000,
    elevation: 5,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.divider,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.secondary,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: COLORS.secondary,
  },
  modalContent: {
    backgroundColor: COLORS.secondary,
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    shadowOffset: { width: 0, height: 2, },
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
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    minHeight: 200,
    maxWidth: 400,
    zIndex: 1000,
    elevation: 5,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
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
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
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
    gap: 16
  },
  inputContainer: {
    width: '100%'
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8
  },
  dropdownButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider
  },
  dropdownButtonSelected: {
    borderColor: COLORS.primary
  },
  dropdownButtonText: {
    fontSize: 16,
    color: COLORS.text
  },
  placeholderText: {
    color: COLORS.textSecondary
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  saveButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
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
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary
  },
  scrollContent: {
    paddingBottom: 120
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  profileRole: {
    fontSize: 14,
    color: COLORS.primaryLight,
    marginBottom: 8
  },
  academicInfo: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  academicInfoText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '500'
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  optionIconText: {
    fontSize: 20
  },
  optionInfo: {
    flex: 1
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24
  },
  signOutButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
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
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center'
  },
  editContainer: {
    width: '100%',
    gap: 16
  },
  inputContainer: {
    width: '100%'
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8
  },
  dropdownButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider
  },
  dropdownButtonSelected: {
    borderColor: COLORS.primary
  },
  dropdownButtonText: {
    fontSize: 16,
    color: COLORS.text
  },
  placeholderText: {
    color: COLORS.textSecondary
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  saveButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },
});

export default ProfileScreen;