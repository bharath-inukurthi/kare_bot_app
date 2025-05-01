import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Text, SafeAreaView, Platform, StatusBar, ScrollView, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { getCachedImages } from './UserDetailsScreen';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const PreviewScreen = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [isModalVisible, setModalVisible] = useState(false);
  const [timetableUri, setTimetableUri] = useState(null);
  const [calendarUri, setCalendarUri] = useState(null);
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
      const [timeTableUri, calendarUri] = await Promise.all([
        AsyncStorage.getItem('timeTableUri'),
        AsyncStorage.getItem('calendarUri')
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
  const openImageViewer = (index) => {
    const imageUrls = [];
    
    if (timetableUri) {
      imageUrls.push({ url: timetableUri, props: { title: 'Class Timetable' } });
    }
    
    if (calendarUri) {
      imageUrls.push({ url: calendarUri, props: { title: 'Academic Calendar' } });
    }
    
    setImages(imageUrls);
    setCurrentImageIndex(index);
    setModalVisible(true);
  };

  const renderScheduleCard = (title, subtitle, icon, onPress, imageUri) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1e3a8a' : '#e0f2fe' }]}>
          <Ionicons name={icon} size={24} color={isDarkMode ? '#60a5fa' : theme.primary} />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      {imageUri && (
        <View style={[styles.previewContainer, { 
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : '#ffffff'
        }]}>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
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
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.text }]}>Loading schedules...</Text>
          </View>
        ) : (
          <>
            {renderScheduleCard(
              'Class Timetable',
              'View your weekly class schedule',
              'time-outline',
              () => openImageViewer(0),
              timetableUri
            )}

            {renderScheduleCard(
              'Academic Calendar',
              'Important dates and deadlines',
              'calendar-outline',
              () => openImageViewer(timetableUri ? 1 : 0),
              calendarUri
            )}
          </>
        )}
      </ScrollView>
      
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  scrollContainer: {
    padding: 20,
    gap: 20,
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
});

export default PreviewScreen;