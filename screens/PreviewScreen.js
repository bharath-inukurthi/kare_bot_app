import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Text,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  TextInput,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { getCachedImages } from './UserDetailsScreen';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import DraggableFlatList from 'react-native-draggable-flatlist';

const AVAILABLE_ICONS = [
  'document-text-outline',
  'calendar-outline',
  'alarm-outline',
  'book-outline',
  'briefcase-outline',
  'school-outline',
  'fitness-outline',
  'game-controller-outline',
  'headset-outline',
  'musical-notes-outline',
  'airplane-outline',
  'cart-outline',
];

const PreviewScreen = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [isModalVisible, setModalVisible] = useState(false);
  const [timetableUri, setTimetableUri] = useState(null);
  const [calendarUri, setCalendarUri] = useState(null);
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Custom schedules state
  const [customSchedules, setCustomSchedules] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  
  // New state for the add schedule flow
  const [showNameAndIconModal, setShowNameAndIconModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [selectedIconName, setSelectedIconName] = useState('document-outline'); // Default icon
  const [scheduleImageUri, setScheduleImageUri] = useState(null); // For the picked image
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef(null); // Ref for the name input in the new modal

  const handleAddSchedule = async () => {
    if (!newScheduleName.trim()) {
      setNameError('Please enter a schedule name');
      return;
    }
    setNameError('');

    if (!scheduleImageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    setIsLoading(true); // Set loading true
    try {
      const newSchedule = {
        id: Math.random().toString(36).substr(2, 9),
        name: newScheduleName.trim(),
        subtitle: 'Custom Schedule',
        icon: selectedIconName, 
        imageUri: scheduleImageUri,
        isDefault: false
      };

      const updatedSchedules = [...customSchedules, newSchedule];
      setCustomSchedules(updatedSchedules);
      setAllSchedules([...allSchedules, newSchedule]); 

      await AsyncStorage.setItem('customSchedules', JSON.stringify(updatedSchedules));
      setShowNameAndIconModal(false); 
      setNewScheduleName('');
      setSelectedIconName('document-outline');
      setScheduleImageUri(null);
      setNameError(''); 
    } catch (error) {
      console.error('Error saving custom schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setIsLoading(false); // Set loading false
    }
  };

  // All schedules combined (default + custom)
  const [allSchedules, setAllSchedules] = useState([]);

  // Reload images whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadImages();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  const loadImages = async () => {
    try {
      setIsLoading(true);
      console.log('Starting to load cached images');

      // Get the latest user details
      const userDetailsString = await AsyncStorage.getItem('userDetails');
      if (!userDetailsString) {
        console.warn('No user details found');
        setIsLoading(false);
        return;
      }

      const userDetails = JSON.parse(userDetailsString);
      console.log('Loaded user details:', userDetails);

      // Get stored image paths from AsyncStorage
      const [timeTableUri, calendarUri, customSchedulesString] = await Promise.all([
        AsyncStorage.getItem('timeTableUri'),
        AsyncStorage.getItem('calendarUri'),
        AsyncStorage.getItem('customSchedules')
      ]);

      // Verify files exist in protected storage
      const [timeTableInfo, calendarInfo] = await Promise.all([
        timeTableUri ? FileSystem.getInfoAsync(timeTableUri) : { exists: false },
        calendarUri ? FileSystem.getInfoAsync(calendarUri) : { exists: false }
      ]);

      if (timeTableInfo.exists) {
        console.log('Setting timetable URI:', timeTableUri.substring(0, 50) + '...');
        setTimetableUri(timeTableUri);
      } else {
        console.warn('No timetable found in protected storage');
      }

      if (calendarInfo.exists) {
        console.log('Setting calendar URI:', calendarUri.substring(0, 50) + '...');
        setCalendarUri(calendarUri);
      } else {
        console.warn('No calendar found in protected storage');
      }

      // Load custom schedules
      let loadedCustomSchedules = [];
      if (customSchedulesString) {
        try {
          loadedCustomSchedules = JSON.parse(customSchedulesString);

          // Verify each custom schedule image exists
          const validCustomSchedules = [];
          for (const schedule of loadedCustomSchedules) {
            if (schedule.imageUri) {
              const info = await FileSystem.getInfoAsync(schedule.imageUri);
              if (info.exists) {
                validCustomSchedules.push(schedule);
              } else {
                console.warn(`Custom schedule image not found: ${schedule.name}`);
              }
            }
          }

          setCustomSchedules(validCustomSchedules);
        } catch (e) {
          console.error('Error parsing custom schedules:', e);
          setCustomSchedules([]);
        }
      }

      // Create default schedules
      const defaultSchedules = [];

      if (timeTableInfo.exists) {
        defaultSchedules.push({
          id: 'timetable',
          name: 'Class Timetable',
          subtitle: 'View your weekly class schedule',
          icon: 'time-outline',
          imageUri: timeTableUri,
          isDefault: true
        });
      }

      if (calendarInfo.exists) {
        defaultSchedules.push({
          id: 'calendar',
          name: 'Academic Calendar',
          subtitle: 'Important dates and deadlines',
          icon: 'calendar-outline',
          imageUri: calendarUri,
          isDefault: true
        });
      }

      // Check if we have a saved order
      const savedOrderString = await AsyncStorage.getItem('scheduleOrder');
      if (savedOrderString) {
        try {
          // Parse the saved order
          const savedOrder = JSON.parse(savedOrderString);

          // Create a map of all schedules by ID for easy lookup
          const scheduleMap = {};
          [...defaultSchedules, ...loadedCustomSchedules].forEach(schedule => {
            scheduleMap[schedule.id] = schedule;
          });

          // Reconstruct the ordered list, filtering out any IDs that no longer exist
          const orderedSchedules = savedOrder
            .map(id => scheduleMap[id])
            .filter(schedule => schedule !== undefined);

          // Add any new schedules that weren't in the saved order
          const existingIds = new Set(savedOrder);
          const newSchedules = [...defaultSchedules, ...loadedCustomSchedules]
            .filter(schedule => !existingIds.has(schedule.id));

          setAllSchedules([...orderedSchedules, ...newSchedules]);
        } catch (error) {
          console.error('Error parsing saved schedule order:', error);
          setAllSchedules([...defaultSchedules, ...loadedCustomSchedules]);
        }
      } else {
        // No saved order, use default order
        setAllSchedules([...defaultSchedules, ...loadedCustomSchedules]);
      }

    } catch (error) {
      console.error('Error loading cached images:', {
        message: error.message,
        stack: error.stack
      });
      Alert.alert(
        'Error',
        'Failed to load schedules. Please try updating your details in the Profile screen.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  const openImageViewer = (schedule) => {
    // Create image URLs array from all schedules
    const imageUrls = allSchedules.map(s => ({
      url: s.imageUri,
      props: { title: s.name }
    }));

    // Find the index of the selected schedule
    const index = allSchedules.findIndex(s => s.id === schedule.id);

    setImages(imageUrls);
    setCurrentImageIndex(index >= 0 ? index : 0);
    setModalVisible(true);
  };

  // Function to pick an image from the device
  // Replace the add schedule modal and image picker logic with a flow similar to CertificatesScreen.js
  // 1. Add state for modal visibility, file name, selected image URI, loading, and snackbar
  const [showNameModal, setShowNameModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("info");
  
  // 2. Add functions for showing snackbar, picking image, taking picture, and handling file name modal
  const showSnackbar = (message, type = "info") => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };
  
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to select images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      setSelectedImageUri(result.assets[0].uri);
      setShowNameModal(true);
    } catch (error) {
      console.error('Image picking error:', error);
      Alert.alert('Error', 'Failed to import image from gallery');
    }
  };
  
  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your camera to take pictures.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        mediaTypes: 'Images',
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      setSelectedImageUri(result.assets[0].uri);
      setShowNameModal(true);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture image with camera');
    }
  };
  
  const handleFileNameSubmit = async (name) => {
    if (!name || !name.trim()) {
      showSnackbar('Please enter a valid schedule name', 'error');
      return false;
    }
    const finalName = name.trim().endsWith('.jpg') ? name.trim() : `${name.trim()}.jpg`;
    const destinationDir = `${FileSystem.documentDirectory}schedules/`;
    const destinationUri = destinationDir + finalName;
    const fileExists = await FileSystem.getInfoAsync(destinationUri);
    if (fileExists.exists) {
      showSnackbar('A schedule with this name already exists. Please choose a different name.', 'error');
      return false;
    }
    if (!selectedImageUri) {
      showSnackbar('No image selected', 'error');
      return false;
    }
    try {
      setLoading(true);
      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(destinationDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(destinationDir, { intermediates: true });
      }
      await FileSystem.copyAsync({ from: selectedImageUri, to: destinationUri });
      // Save schedule to AsyncStorage
      const newSchedule = {
        id: `custom_${Date.now()}`,
        name: name.trim(),
        subtitle: 'Custom schedule',
        icon: scheduleIcon,
        imageUri: destinationUri,
        isDefault: false
      };
      const updatedCustomSchedules = [...customSchedules, newSchedule];
      setCustomSchedules(updatedCustomSchedules);
      const defaultSchedules = allSchedules.filter(s => s.isDefault);
      const updatedAllSchedules = [...defaultSchedules, ...updatedCustomSchedules];
      setAllSchedules(updatedAllSchedules);
      await AsyncStorage.setItem('customSchedules', JSON.stringify(updatedCustomSchedules));
      const scheduleIds = updatedAllSchedules.map(s => s.id);
      await AsyncStorage.setItem('scheduleOrder', JSON.stringify(scheduleIds));
      showSnackbar(`Schedule saved as "${finalName}"!`, 'success');
      setShowNameModal(false);
      setFileName('');
      setSelectedImageUri(null);
      Keyboard.dismiss();
      return true;
    } catch (error) {
      console.error('Image processing error:', error);
      showSnackbar('Failed to save schedule', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileNameCancel = () => {
    Keyboard.dismiss();
    setShowNameModal(false);
    setFileName('');
    setSelectedImageUri(null);
  };
  
  // 3. Add a modal component for entering the schedule name
  const FileNameModal = () => {
    const inputRef = useRef(null);
    const [localFileName, setLocalFileName] = useState("");
    const [error, setError] = useState("");
    React.useEffect(() => {
      if (showNameModal) {
        setLocalFileName("");
        setError("");
        const timer = setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [showNameModal]);
    const handleModalClose = () => {
      if (!loading) {
        setShowNameModal(false);
        setLocalFileName("");
        setError("");
        handleFileNameCancel();
      }
    };
    const handleInputChange = (text) => {
      setLocalFileName(text);
      if (text.trim()) setError("");
    };
    const handleSubmit = async () => {
      if (!localFileName.trim()) {
        setError("Please enter a valid schedule name");
        return;
      }
      setFileName(localFileName);
      await handleFileNameSubmit(localFileName);
    };
    return (
      <Modal
        visible={showNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}
        statusBarTranslucent
        onShow={() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust as needed
          enabled
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: 'rgba(16,24,40,0.18)'
            }}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={{ 
                  backgroundColor: isDarkMode ? theme.surface : '#FFFFFF', 
                  borderRadius: 16,
                  padding: 24, 
                  width: '90%',
                  maxWidth: 320,
                  shadowColor: '#000', 
                  shadowOpacity: 0.12, 
                  shadowRadius: 16, 
                  shadowOffset: { width: 0, height: 8 }, 
                  elevation: 8
                }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: isDarkMode ? theme.text : '#0F172A', 
                    marginBottom: 16 
                  }}>
                    Name Your Schedule
                  </Text>
                  <TextInput
                    ref={inputRef}
                    style={{ 
                      backgroundColor: isDarkMode ? '#232B3A' : '#F8FAFC', 
                      borderRadius: 8, 
                      padding: 12, 
                      marginBottom: 20, 
                      color: isDarkMode ? theme.text : '#0F172A', 
                      borderWidth: 1, 
                      borderColor: isDarkMode ? theme.border : '#E2E8F0', 
                      fontSize: 16 
                    }}
                    placeholder="Enter schedule name"
                    placeholderTextColor={isDarkMode ? theme.textSecondary : '#64748B'}
                    value={localFileName}
                    onChangeText={handleInputChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={50}
                    blurOnSubmit={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                    <TouchableOpacity
                      onPress={handleModalClose}
                      style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: isDarkMode ? theme.surface : '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 }}
                    >
                      <Text style={{ color: '#F56565', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmit}
                      style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: isDarkMode ? '#19C6C1' : '#22C55E' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // Function to save a custom schedule
  const saveCustomSchedule = async () => {
    if (!newScheduleName.trim()) {
      Alert.alert('Error', 'Please enter a name for the schedule');
      return;
    }

    if (!scheduleImageUri) {
      Alert.alert('Error', 'Please select an image for the schedule');
      return;
    }

    try {
      // Create a new schedule object
      const newSchedule = {
        id: `custom_${Date.now()}`,
        name: newScheduleName.trim(),
        subtitle: 'Custom schedule',
        icon: selectedIconName,
        imageUri: scheduleImageUri,
        isDefault: false
      };

      // Add to custom schedules
      const updatedCustomSchedules = [...customSchedules, newSchedule];
      setCustomSchedules(updatedCustomSchedules);

      // Update all schedules
      const defaultSchedules = allSchedules.filter(s => s.isDefault);
      const updatedAllSchedules = [...defaultSchedules, ...updatedCustomSchedules];
      setAllSchedules(updatedAllSchedules);

      // Save to AsyncStorage
      await AsyncStorage.setItem('customSchedules', JSON.stringify(updatedCustomSchedules));

      // Update the saved order
      const scheduleIds = updatedAllSchedules.map(s => s.id);
      await AsyncStorage.setItem('scheduleOrder', JSON.stringify(scheduleIds));

      // Reset form
      setNewScheduleName('');
      setSelectedIconName('document-outline');
      setScheduleImageUri(null);
      

    } catch (error) {
      console.error('Error saving custom schedule:', error);
      Alert.alert('Error', 'Failed to save custom schedule. Please try again.');
    }
  };

  // Function to update schedule order
  const updateScheduleOrder = async (data) => {
    try {
      setAllSchedules(data);

      // Extract and save custom schedules
      const updatedCustomSchedules = data.filter(s => !s.isDefault);
      setCustomSchedules(updatedCustomSchedules);

      // Save to AsyncStorage
      await AsyncStorage.setItem('customSchedules', JSON.stringify(updatedCustomSchedules));

      // Save the order of schedule IDs
      const scheduleIds = data.map(schedule => schedule.id);
      await AsyncStorage.setItem('scheduleOrder', JSON.stringify(scheduleIds));

    } catch (error) {
      console.error('Error updating schedule order:', error);
      Alert.alert('Error', 'Failed to update schedule order. Please try again.');
    }
  };

  // Function to delete a custom schedule
  const deleteCustomSchedule = async (schedule) => {
    try {
      // Remove from custom schedules
      const updatedCustomSchedules = customSchedules.filter(s => s.id !== schedule.id);
      setCustomSchedules(updatedCustomSchedules);

      // Update all schedules
      const defaultSchedules = allSchedules.filter(s => s.isDefault);
      const updatedAllSchedules = [...defaultSchedules, ...updatedCustomSchedules];
      setAllSchedules(updatedAllSchedules);

      // Delete the image file
      if (schedule.imageUri) {
        await FileSystem.deleteAsync(schedule.imageUri, { idempotent: true });
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem('customSchedules', JSON.stringify(updatedCustomSchedules));

      // Update the saved order
      const scheduleIds = updatedAllSchedules.map(s => s.id);
      await AsyncStorage.setItem('scheduleOrder', JSON.stringify(scheduleIds));

    } catch (error) {
      console.error('Error deleting custom schedule:', error);
      Alert.alert('Error', 'Failed to delete custom schedule. Please try again.');
    }
  };

  // Render a schedule card item for the DraggableFlatList
  const renderScheduleCard = useCallback(({ item, drag, isActive }) => {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            opacity: isActive ? 0.9 : 1,
            transform: [{ scale: isActive ? 1.05 : 1 }],
            elevation: isActive ? 8 : 5,
            shadowOpacity: isActive ? 0.2 : 0.1,
          }
        ]}
        onPress={() => openImageViewer(item)}
        onLongPress={() => {
          if (!item.isDefault) {
            // Show options for custom schedules
            setSelectedSchedule(item);
            Alert.alert(
              'Schedule Options',
              `What would you like to do with "${item.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteCustomSchedule(item)
                },
                {
                  text: 'Reorder',
                  onPress: drag
                }
              ]
            );
          } else {
            // Only allow reordering for default schedules
            drag();
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1e3a8a' : '#e0f2fe' }]}>
            <Ionicons name={item.icon} size={24} color={isDarkMode ? '#60a5fa' : theme.primary} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
          </View>
          {!item.isDefault && (
            <TouchableOpacity
              style={styles.dragHandle}
              onPressIn={drag}
            >
              <Ionicons name="menu" size={24} color={isDarkMode ? '#60a5fa' : theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        {item.imageUri && (
          <View style={[styles.previewContainer, {
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : '#ffffff'
          }]}>
            <Image
              source={{ uri: item.imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [theme, isDarkMode]);

  // Available icons for custom schedules
  const availableIcons = [
    'document-outline',
    'calendar-outline',
    'time-outline',
    'book-outline',
    'school-outline',
    'library-outline',
    'clipboard-outline',
    'newspaper-outline',
    'list-outline'
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Schedules</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Your academic timetable and calendar</Text>
            </View>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: isDarkMode ? '#1e3a8a' : '#e0f2fe' }]}
              onPress={toggleTheme}
            >
              <Ionicons
                name={isDarkMode ? 'sunny' : 'moon'}
                size={24}
                color={isDarkMode ? '#60a5fa' : theme.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.text }]}>Loading schedules...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <DraggableFlatList
              data={allSchedules}
              renderItem={renderScheduleCard}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => updateScheduleOrder(data)}
              contentContainerStyle={styles.scrollContainer}
              autoscrollSpeed={100}
              activationDistance={10}
            />
          </View>
        )}

        {/* Add Schedule Button (Floating Action Button) */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => setShowAddOptionsModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={'#fff'} />
        </TouchableOpacity>

        {/* Image Viewer Modal */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.modalBackground}>
            <ImageViewer
              imageUrls={images}
              index={currentImageIndex}
              enableSwipeDown={true}
              onSwipeDown={() => setModalVisible(false)}
              saveToLocalByLongPress={false}
              renderHeader={() => (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              )}
              renderIndicator={(currentIndex, allSize) => (
                <View style={styles.indicatorContainer}>
                  <Text style={styles.indicatorText}>
                    {images[currentIndex - 1]?.props?.title || ''}
                  </Text>
                  {allSize > 1 && (
                    <Text style={styles.pageIndicator}>
                      {currentIndex}/{allSize}
                    </Text>
                  )}
                </View>
              )}
              backgroundColor="rgba(0, 0, 0, 0.9)"
              loadingRender={() => (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              )}
            />
          </View>
        </Modal>

        {/* Add Custom Schedule Modal */}
        <Modal
          
          transparent={true}
          
          animationType="slide"
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[
                styles.modalContent,
                { backgroundColor: isDarkMode ? theme.surface : '#fff' }
              ]}>
                <View style={styles.modalHeader}>
                  <Text style={[
                    styles.modalTitle,
                    { color: theme.text }
                  ]}>Add Custom Schedule</Text>
                  <TouchableOpacity
                    
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Schedule Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#e2e8f0'
                      }
                    ]}
                    placeholder="Enter schedule name"
                    placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.5)' : '#94a3b8'}
                    value={scheduleName}
                    onChangeText={setScheduleName}
                    autoFocus={true}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Select Icon</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.iconSelector}
                  >
                    {availableIcons.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconOption,
                          scheduleIcon === icon && {
                            backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.3)' : 'rgba(0, 179, 179, 0.1)',
                            borderColor: isDarkMode ? '#60a5fa' : theme.primary
                          }
                        ]}
                        onPress={() => setScheduleIcon(icon)}
                      >
                        <Ionicons
                          name={icon}
                          size={24}
                          color={isDarkMode ? '#60a5fa' : theme.primary}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Schedule Image</Text>
                  {scheduleImageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: scheduleImageUri }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={pickImage}
                      >
                        <Text style={styles.changeImageText}>Change Image</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.imagePicker,
                        {
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc'
                        }
                      ]}
                      onPress={pickImage}
                    >
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color={isDarkMode ? '#60a5fa' : theme.primary}
                      />
                      <Text style={[
                        styles.imagePickerText,
                        { color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#64748b' }
                      ]}>
                        Select Image from Device
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: isDarkMode ? '#1e3a8a' : theme.primary,
                      opacity: (!scheduleName.trim() || !scheduleImageUri) ? 0.5 : 1
                    }
                  ]}
                  onPress={saveCustomSchedule}
                  disabled={!scheduleName.trim() || !scheduleImageUri}
                >
                  <Text style={styles.saveButtonText}>Save Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Add Options Modal */}
        <Modal
          visible={showAddOptionsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddOptionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode ? theme.surface : '#fff',
                borderColor: isDarkMode ? '#2D3748' : '#E2E8F0'
              }
            ]}>
              <Text style={[
                styles.modalTitle,
                { color: isDarkMode ? '#fff' : '#0F172A' }
              ]}>
                Add Schedule
              </Text>

              {/* Schedule Name Input */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  { color: isDarkMode ? '#fff' : '#0F172A' }
                ]}>
                  Schedule Name
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: isDarkMode ? '#fff' : '#0F172A',
                      backgroundColor: isDarkMode ? '#1A2536' : '#F8FAFC',
                      borderColor: isDarkMode ? '#2D3748' : '#E2E8F0'
                    }
                  ]}
                  placeholder="Enter schedule name"
                  placeholderTextColor={isDarkMode ? '#A0AEC0' : '#64748B'}
                  value={scheduleName}
                  onChangeText={setScheduleName}
                />
              </View>

              {/* Icon Selection */}
              <View style={styles.formGroup}>
                <Text style={[
                  styles.label,
                  { color: isDarkMode ? '#fff' : '#0F172A' }
                ]}>
                  Select Icon
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconSelector}
                >
                  {availableIcons.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        scheduleIcon === icon && {
                          backgroundColor: isDarkMode ? '#1e3a8a' : '#e0f2fe',
                          borderColor: '#19C6C1'
                        }
                      ]}
                      onPress={() => setScheduleIcon(icon)}
                    >
                      <Ionicons
                        name={icon}
                        size={24}
                        color={scheduleIcon === icon ? '#19C6C1' : isDarkMode ? '#A0AEC0' : '#64748B'}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={[
                styles.label,
                { color: isDarkMode ? '#fff' : '#0F172A' }
              ]}>
                Choose Image Source
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#19C6C1' }]}
                  onPress={async () => {
                    if (!scheduleName.trim()) {
                      Alert.alert('Error', 'Please enter a name for the schedule');
                      return;
                    }
                    setShowAddOptionsModal(false);
                    await takePicture();
                  }}
                >
                  <Ionicons name="camera" size={20} color={'#fff'} style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: '#19C6C1', borderWidth: 1 }]}
                  onPress={async () => {
                    if (!scheduleName.trim()) {
                      Alert.alert('Error', 'Please enter a name for the schedule');
                      return;
                    }
                    setShowAddOptionsModal(false);
                    await pickImage();
                  }}
                >
                  <Ionicons name="image" size={20} color={'#19C6C1'} style={{ marginRight: 8 }} />
                  <Text style={{ color: '#19C6C1', fontWeight: '600' }}>Gallery</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddOptionsModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A'
  },
  inputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0F172A'
  },
  imagePickerContainer: {
    marginBottom: 20
  },
  imagePicker: {
    height: 200,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 16,
    color: '#0F172A'
  },
  selectedImageContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden'
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    alignItems: 'center'
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  },
  addButton: {
    overflow: 'hidden',
    borderRadius: 8
  },
  addButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : StatusBar.currentHeight - 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  themeToggle: {
    padding: 10,
    borderRadius: 20,
    marginTop: 5,
  },
  listContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Extra padding for FAB
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  dragHandle: {
    padding: 8,
    borderRadius: 20,
  },
  previewContainer: {
    marginTop: 12,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 12,
    borderRadius: 8,
    zIndex: 999,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  indicatorContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 12,
    borderRadius: 8,
    zIndex: 999,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pageIndicator: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
  },
  // Refresh button style (copied from CircularsScreen)
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#19C6C1',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  addOptionsModalContent: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  iconSelector: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imagePicker: {
    height: 150,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#19C6C1',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#19C6C1',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryButtonText: {
    color: '#19C6C1',
    fontWeight: '600',
    fontSize: 16,
  },
  // Additional modal styles
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalCloseButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  modalCloseText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PreviewScreen;