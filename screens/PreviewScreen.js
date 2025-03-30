import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Text, SafeAreaView, Platform, StatusBar, ScrollView, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

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
  const [modalImageUri, setModalImageUri] = useState(null);
  
  // State for image transformations
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [savedScale, setSavedScale] = useState(1);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const timetable = await AsyncStorage.getItem('timeTableUri');
      const calendar = await AsyncStorage.getItem('calendarUri');

      if (timetable) {
        setTimetableUri(timetable);
      }
      if (calendar) {
        setCalendarUri(calendar);
      }
    } catch (error) {
      console.error('Error loading PDFs:', error);
    }
  };

  const isPdfFile = (uri) => {
    return uri && uri.toLowerCase().endsWith('.pdf');
  };

  const toggleImagePreview = (uri) => {
    if (uri) {
      setModalImageUri(uri);
      setModalVisible(true);
      resetZoomAndPosition();
    } else {
      setModalVisible(false);
      setModalImageUri(null);
      resetZoomAndPosition();
    }
  };

  const resetZoomAndPosition = () => {
    setScale(1);
    setSavedScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  // Define pan gesture
  const panGesture = Gesture.Pan()
    .minDistance(10)
    .enabled(scale > 1)
    .onUpdate((event) => {
      if (scale > 1) {
        setTranslateX(translateX + event.changeX);
        setTranslateY(translateY + event.changeY);
      }
    });

  // Define pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      setSavedScale(scale);
    })
    .onUpdate((event) => {
      // Apply new scale based on pinch gesture
      let newScale = savedScale * event.scale;
      
      // Limit scale between 0.5 and 5
      newScale = Math.min(Math.max(newScale, 0.5), 5);
      
      setScale(newScale);
      
      console.log("Pinch Update - Scale:", newScale, "Event Scale:", event.scale);
    });

  // Define double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // Toggle between normal and zoomed view (2x)
      const newScale = scale > 1 ? 1 : 2.5;
      
      setScale(newScale);
      setSavedScale(newScale);
      
      // If scaling back to 1, reset position
      if (newScale === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
      
      console.log("Double Tap - New Scale:", newScale);
    });

  // Combine all gestures
  const composedGestures = Gesture.Exclusive(
    doubleTapGesture,
    Gesture.Simultaneous(
      pinchGesture,
      panGesture
    )
  );

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
            <TouchableOpacity onPress={() => toggleImagePreview(timetableUri)} style={styles.imageContainer}>
              <Text style={styles.imageLabel}>Class Timetable</Text>
              <Image
                source={{ uri: timetableUri }}
                style={styles.thumbnail}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {calendarUri && (
            <TouchableOpacity onPress={() => toggleImagePreview(calendarUri)} style={styles.imageContainer}>
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
          onRequestClose={() => toggleImagePreview(null)}
          animationType="fade"
          statusBarTranslucent
          hardwareAccelerated
        >
          <View style={styles.modalBackground}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => toggleImagePreview(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            
            <View style={styles.modalContainer}>
              {modalImageUri && (
                <GestureDetector gesture={composedGestures}>
                  <View style={styles.modalImageContainer}>
                    <Image
                      source={{ uri: modalImageUri }}
                      style={[
                        styles.fullImage, 
                        { 
                          transform: [
                            { scale: scale }, 
                            { translateX: translateX }, 
                            { translateY: translateY }
                          ] 
                        }
                      ]}
                      resizeMode="contain"
                      onError={(error) => {
                        console.error('Image loading error:', error);
                        Alert.alert('Error', 'Failed to load image');
                        toggleImagePreview(null);
                      }}
                    />
                  </View>
                </GestureDetector>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={resetZoomAndPosition}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalImageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
    alignSelf: 'center',
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
  resetButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 12,
    borderRadius: 8,
    zIndex: 999,
    elevation: 5,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 8,
    borderRadius: 8,
    zIndex: 999,
    elevation: 5,
  },
  zoomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

const WrappedPreviewScreen = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <PreviewScreen />
  </GestureHandlerRootView>
);

export default WrappedPreviewScreen;