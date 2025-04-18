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
const SECTION_OPTIONS = Array.from({length: 30}, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
const SEMESTER_OPTIONS = ['Odd', 'Even'];
const YEAR_OPTIONS = ['II', 'III'];

// Create a protected directory that won't be cleared by cleaner apps
const PROTECTED_DIRECTORY = FileSystem.documentDirectory + 'protected_data/';

// Helper function to ensure the protected directory exists
const ensureProtectedDirectory = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(PROTECTED_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PROTECTED_DIRECTORY, { intermediates: true });
      console.log('Created protected directory:', PROTECTED_DIRECTORY);
    }
    return true;
  } catch (error) {
    console.error('Failed to create protected directory:', error);
    return false;
  }
};

// Helper function to process and store images in protected storage
const processAndStoreImage = async (imageUrl, storageKey) => {
    try {
        // Ensure protected directory exists
        await ensureProtectedDirectory();
        
        // Create a temporary file path for downloading
        const tempFilePath = `${FileSystem.cacheDirectory}temp_${Date.now()}.jpg`;
        
        // Download image to temp location
        const downloadResult = await FileSystem.downloadAsync(imageUrl, tempFilePath);
        if (downloadResult.status !== 200) {
            throw new Error(`Download failed with status ${downloadResult.status}`);
        }

        // Process the image with optimal quality settings
        const manipulateResult = await manipulateAsync(
            tempFilePath,
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

        // Define the protected storage path for this image
        const protectedFilePath = `${PROTECTED_DIRECTORY}${storageKey}_${Date.now()}.jpg`;
        
        // Move the processed image to protected storage
        await FileSystem.moveAsync({
            from: manipulateResult.uri,
            to: protectedFilePath
        });

        // Clean up the temporary downloaded file
        await FileSystem.deleteAsync(tempFilePath, { idempotent: true });

        // Store the protected path in AsyncStorage for later retrieval
        await AsyncStorage.setItem(storageKey, protectedFilePath);
        
        console.log(`Successfully stored ${storageKey} in protected directory`);
        return protectedFilePath;
    } catch (error) {
        console.error('Error processing and storing image:', error);
        throw new Error(`Image processing failed: ${error.message}`);
    }
};

// Function to restore images from protected storage if available
const restoreProtectedImages = async () => {
    try {
        // Check if the protected directory exists
        const dirInfo = await FileSystem.getInfoAsync(PROTECTED_DIRECTORY);
        if (!dirInfo.exists) {
            console.log('Protected directory does not exist yet');
            return false;
        }
        
        // Get the stored file paths from AsyncStorage
        const [timeTableUri, calendarUri] = await Promise.all([
            AsyncStorage.getItem('timeTableUri'),
            AsyncStorage.getItem('calendarUri')
        ]);
        
        // Verify that these files actually exist in the filesystem
        const verifyResults = await Promise.all([
            timeTableUri ? FileSystem.getInfoAsync(timeTableUri) : { exists: false },
            calendarUri ? FileSystem.getInfoAsync(calendarUri) : { exists: false }
        ]);
        
        const [timeTableExists, calendarExists] = verifyResults.map(result => result.exists);
        
        console.log('Cache restoration check:', {
            timeTableExists,
            calendarExists
        });
        
        // Return true if both files exist, false otherwise
        return timeTableExists && calendarExists;
    } catch (error) {
        console.error('Error restoring protected images:', error);
        return false;
    }
};

// Function to fetch and cache timetable and calendar images
export const fetchAndCacheTimeTable = async (yearValue, sectionValue, semesterValue) => {
    try {
        console.log('Starting fetchAndCacheTimeTable:', { yearValue, sectionValue, semesterValue });
        const sectionNumber = sectionValue.substring(1);

        // Check if we can restore from protected storage first
        const restoredFromProtected = await restoreProtectedImages();
        if (restoredFromProtected) {
            console.log('Successfully restored images from protected storage');
            // If we're here, the paths are already in AsyncStorage so we can just return
            return;
        }

        // Timetable file key
        const timetableKey = `Time-Tables/${yearValue}-year-S${sectionNumber}.jpg`;
        const timetableApiUrl = `https://faculty-availability-api.onrender.com/get-item/?object_key=${timetableKey}`;
        
        // Calendar file key
        const calendarKey = `Calenders/${semesterValue}-Semester.jpg`;
        const calendarApiUrl = `https://faculty-availability-api.onrender.com/get-item/?object_key=${calendarKey}`;

        console.log('API URLs:', { timetableApiUrl, calendarApiUrl });

        const fetchQueue = [];
        
        // Always fetch new images when details are updated
        fetchQueue.push([timetableApiUrl, 'timeTableUri', timetableKey]);
        fetchQueue.push([calendarApiUrl, 'calendarUri', calendarKey]);

        const results = await Promise.allSettled(
            fetchQueue.map(async ([apiUrl, storageKey, fileKey]) => {
                try {
                    console.log(`Fetching ${storageKey} from ${apiUrl}`);
                    const response = await fetch(apiUrl);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log(`API response for ${storageKey}:`, { status: response.status, hasPresignedUrl: !!data.presigned_url });
                    
                    if (!data.presigned_url) {
                        throw new Error(`No presigned URL available for ${fileKey}`);
                    }

                    // Process and store the image in protected storage
                    const protectedImageUri = await processAndStoreImage(data.presigned_url, storageKey);
                    console.log(`Successfully stored image for ${storageKey} at ${protectedImageUri}`);
                    
                    return { success: true, storageKey, uri: protectedImageUri };
                } catch (error) {
                    console.error(`Error processing ${storageKey}:`, error.message);
                    // Throw the error to be caught by Promise.allSettled
                    throw error;
                }
            })
        );

        // Log results summary
        const summary = results.map((result, index) => ({
            file: fetchQueue[index][2],
            status: result.status,
            ...(result.status === 'rejected' && { error: result.reason?.message })
        }));
        console.log('Fetch and cache summary:', summary);

        // Check if any critical errors occurred
        const failedOperations = results.filter(result => result.status === 'rejected');
        if (failedOperations.length > 0) {
            console.warn(`${failedOperations.length} operations failed during fetch and cache`);
        }

    } catch (error) {
        console.error('Critical error in fetchAndCacheTimeTable:', error);
        throw error; // Propagate error to caller
    }
};

// Helper function to get cached image URIs
export const getCachedImages = async () => {
    try {
        // Get stored image paths from AsyncStorage
        const [timeTableUri, calendarUri] = await Promise.all([
            AsyncStorage.getItem('timeTableUri'),
            AsyncStorage.getItem('calendarUri')
        ]);
        
        // Verify files exist
        const [timeTableInfo, calendarInfo] = await Promise.all([
            timeTableUri ? FileSystem.getInfoAsync(timeTableUri) : { exists: false },
            calendarUri ? FileSystem.getInfoAsync(calendarUri) : { exists: false }
        ]);
        
        return {
            timeTableUri: timeTableInfo.exists ? timeTableUri : null,
            calendarUri: calendarInfo.exists ? calendarUri : null
        };
    } catch (error) {
        console.error('Error getting cached images:', error);
        return { timeTableUri: null, calendarUri: null };
    }
};

const UserDetailsScreen = ({ navigation, onComplete }) => {
  const [section, setSection] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    loadUserDetails();
    // Ensure protected directory exists on component mount
    ensureProtectedDirectory();
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

  const saveUserDetails = async () => {
    try {
      if (!section.trim() || !year.trim() || !semester.trim()) {
        Alert.alert('Required Fields', 'Please fill in all fields');
        return;
      }

      setIsLoading(true);

      const userDetails = {
        section: section.trim(),
        year: year.trim(),
        semester: semester.trim(),
      };

      await AsyncStorage.setItem('userDetails', JSON.stringify(userDetails));
      await fetchAndCacheTimeTable(year, section, semester);
      
      setIsLoading(false);
      
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.navigate('MainTabs');
      } else {
        console.warn('Neither navigation nor onComplete callback provided');
      }
    } catch (error) {
      setIsLoading(false);
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
              disabled={isLoading}
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
              onPress={() => setShowSemesterModal(true)}
              disabled={isLoading}
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
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={saveUserDetails}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Loading...' : 'Continue'}
            </Text>
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
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserDetailsScreen;