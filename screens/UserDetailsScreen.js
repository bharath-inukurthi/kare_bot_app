import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { manipulateAsync } from 'expo-image-manipulator';

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
  divider: '#e2e8f0', // Light gray for dividers
};

// Generate section options from S01 to S30
const SECTION_OPTIONS = Array.from({length: 30}, (_, i) => `S${String(i + 1).padStart(2, '0')}`);const SEMESTER_OPTIONS = ['Odd', 'Even'];
const YEAR_OPTIONS = ['II', 'III'];

const UserDetailsScreen = ({ navigation, onComplete }) => {
  const [section, setSection] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);

  React.useEffect(() => {
    loadUserDetails();
  }, []);

  const loadUserDetails = async () => {
    try {
      const savedDetails = await AsyncStorage.getItem('userDetails');
      if (savedDetails) {
        const details = JSON.parse(savedDetails);
        setSection(details.section);
        setYear(details.year);
        setSemester(details.semester);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const processAndCacheImage = async (imageUrl, storageKey) => {
    try {
        // Download image to cache
        const cacheFilePath = `${FileSystem.cacheDirectory}${storageKey}_${Date.now()}.jpg`;
        await FileSystem.downloadAsync(imageUrl, cacheFilePath);

        // Process the image with optimal quality settings
        const manipulateResult = await manipulateAsync(
            cacheFilePath,
            [{
                resize: {
                    width: 1200, // Reasonable size for mobile display
                    mode: 'contain'
                }
            }],
            {
                format: 'jpeg',
                compress: 0.8 // Good balance between quality and size
            }
        );

        // Clean up the temporary downloaded file
        await FileSystem.deleteAsync(cacheFilePath, { idempotent: true });

        return manipulateResult.uri;
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error(`Image processing failed: ${error.message}`);
    }
};

const fetchAndCacheTimeTable = async (yearValue, sectionValue, semesterValue) => {
    try {
        const sectionNumber = sectionValue.substring(1);

        // Timetable file key
        const timetableKey = `Time-Tables/${yearValue}-year-S${sectionNumber}.jpg`;
        const timetableApiUrl = `https://faculty-availability-api.onrender.com/get-item/?object_key=${timetableKey}`;
        
        // Calendar file key
        const calendarKey = `Calenders/${semesterValue}-Semester.jpg`;
        const calendarApiUrl = `https://faculty-availability-api.onrender.com/get-item/?object_key=${calendarKey}`;

        for (const [apiUrl, storageKey] of [
            [timetableApiUrl, 'timeTableUri'],
            [calendarApiUrl, 'calendarUri']
        ]) {
            console.log('Fetching:', apiUrl);
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.presigned_url) {
                // Process and cache the image
                const processedImageUri = await processAndCacheImage(data.presigned_url, storageKey);
                
                // Save the processed image URI to AsyncStorage
                await AsyncStorage.setItem(storageKey, processedImageUri);
            }
        }
    } catch (error) {
        console.error('Error fetching timetable or calendar:', error);
    }
};

  const saveUserDetails = async () => {
    try {
      if (!section.trim() || !year.trim() || !semester.trim()) {
        Alert.alert('Required Fields', 'Please fill in all fields');
        return;
      }

      const userDetails = {
        section: section.trim(),
        year: year.trim(),
        semester: semester.trim(),
      };

      await AsyncStorage.setItem('userDetails', JSON.stringify(userDetails));
      await fetchAndCacheTimeTable(year, section,semester);
      
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.replace('MainTabs');
      } else {
        console.warn('Neither navigation nor onComplete callback provided');
      }
    } catch (error) {
      console.error('Error saving user details:', error);
      Alert.alert('Error', 'Failed to save user details. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <Text style={styles.headerSubtitle}>Please provide your academic details</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.formContainer}>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Semester</Text>
            <TouchableOpacity
              style={[styles.dropdownButton, semester && styles.dropdownButtonSelected]}
              onPress={() => setShowSemesterModal(true)}
            >
              <Text style={[styles.dropdownButtonText, !semester && styles.placeholderText]}>
                {semester || 'Select your semester'}
              </Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={showSectionModal}
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
            visible={showYearModal}
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

          <Modal
            visible={showSemesterModal}
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

          <TouchableOpacity
            style={styles.submitButton}
            onPress={saveUserDetails}
          >
            <Text style={styles.submitButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
  },
  dropdownButtonSelected: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderText: {
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
    borderRadius: 15,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectedOptionText: {
    color: COLORS.secondary,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserDetailsScreen;