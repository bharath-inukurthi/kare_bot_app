import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Text, SafeAreaView, Platform, StatusBar, ScrollView, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { getCachedImages } from './UserDetailsScreen'; // Adjust the path as needed

const COLORS = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  primaryGradient: ['#1e40af', '#3b82f6'],
  secondary: '#ffffff',
  text: '#0f172a',
  background: '#f1f5f9',
};

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const PreviewScreen = () => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [timetableUri, setTimetableUri] = useState(null);
  const [calendarUri, setCalendarUri] = useState(null);
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadImages();
    }, [])
  );

  const loadImages = async () => {
    try {
      console.log('Starting to load cached images');
      
      // Import the getCachedImages function at the top of your file
      // Add import statement: import { getCachedImages } from './path-to-first-file';
      
      // Use the helper function from the first file
      const { timeTableUri, calendarUri } = await getCachedImages();
      
      console.log('Cache status:', {
        hasTimetable: !!timeTableUri,
        hasCalendar: !!calendarUri
      });
  
      if (timeTableUri) {
        console.log('Setting timetable URI:', timeTableUri.substring(0, 50) + '...');
        setTimetableUri(timeTableUri);
      } else {
        console.warn('No timetable found in cache');
      }
  
      if (calendarUri) {
        console.log('Setting calendar URI:', calendarUri.substring(0, 50) + '...');
        setCalendarUri(calendarUri);
      } else {
        console.warn('No calendar found in cache');
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
    }
  };
  const isPdfFile = (uri) => {
    return uri && uri.toLowerCase().endsWith('.pdf');
  };

  const openImageViewer = (index) => {
    // Prepare the images array for ImageViewer
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <LinearGradient
          colors={COLORS.primaryGradient}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Schedules</Text>
          <Text style={styles.headerSubtitle}>View your academic Schedules</Text>
        </LinearGradient>
      
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {timetableUri && (
            <TouchableOpacity onPress={() => openImageViewer(0)} style={styles.imageContainer}>
              <Text style={styles.imageLabel}>Class Timetable</Text>
              <Image
                source={{ uri: timetableUri }}
                style={styles.thumbnail}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {calendarUri && (
            <TouchableOpacity onPress={() => openImageViewer(timetableUri ? 1 : 0)} style={styles.imageContainer}>
              <Text style={styles.imageLabel}>Academic Calendar</Text>
              <Image
                source={{ uri: calendarUri }}
                style={styles.thumbnail}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </ScrollView>
      
        <Modal 
          visible={isModalVisible} 
          transparent={true} 
          onRequestClose={() => setModalVisible(false)}
          animationType="fade"
          statusBarTranslucent
          hardwareAccelerated
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
              onClick={() => {
                // Toggle visibility of the title bar
                return true; // return true to prevent the dismiss
              }}
              backgroundColor="rgba(0, 0, 0, 0.9)"
              loadingRender={() => (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              )}
              renderFooter={() => (
                <View style={styles.footerContainer}>
                  <Text style={styles.footerText}>Pinch to zoom • Double tap to reset</Text>
                </View>
              )}
              onError={(error) => {
                console.error('ImageViewer error:', error);
                Alert.alert('Error', 'Failed to load image');
              }}
            />
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight-25,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    opacity: 0.9,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  scrollContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  imageLabel: {
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  imageContainer: {
    width: screenWidth - 40,
    marginVertical: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: COLORS.secondary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignSelf: 'center',
  },
  thumbnail: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/10,
    borderRadius: 10,
    resizeMode: 'contain',
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
    elevation: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  indicatorContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 12,
    borderRadius: 8,
    zIndex: 999,
    elevation: 5,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pageIndicator: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  footerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 8,
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PreviewScreen;