import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  StatusBar,
  SectionList,
  Alert,
  Linking,
  Modal,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import ImageViewer from 'react-native-image-zoom-viewer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS } from '../constants/Colors';

const CertificatesScreen = ({ navigation }) => {
  // State variables
  const [rawCertificates, setRawCertificates] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [tempFileName, setTempFileName] = useState('');
  const [fileNameResolver, setFileNameResolver] = useState(null);

  // Constants
  const CERTIFICATES_DIRECTORY = FileSystem.documentDirectory + 'certificates/';
  const EXTERNAL_DIRECTORY = FileSystem.cacheDirectory + 'certificates/';

  // Effects
  useEffect(() => {
    setupCertificatesDirectory();
    loadCertificates();
  }, []);

  useEffect(() => {
    processAndSortCertificates();
  }, [searchQuery, sortType, sortOrder, rawCertificates]);

  // Directory setup
  const setupCertificatesDirectory = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CERTIFICATES_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CERTIFICATES_DIRECTORY, { intermediates: true });
      }
    } catch (error) {
      console.error('Directory setup error:', error);
      Alert.alert('Error', 'Failed to initialize storage directory');
    }
  };

  // Certificate loading
  const loadCertificates = async () => {
    try {
      setLoading(true);
      const files = await FileSystem.readDirectoryAsync(CERTIFICATES_DIRECTORY);
      const certificatesData = await Promise.all(
        files.map(async (filename) => {
          const fileInfo = await FileSystem.getInfoAsync(CERTIFICATES_DIRECTORY + filename);
          return {
            filename,
            uri: CERTIFICATES_DIRECTORY + filename,
            date: new Date(fileInfo.modificationTime * 1000).toISOString().split('T')[0],
            month: new Date(fileInfo.modificationTime * 1000).toLocaleString('default', { month: 'long' })
          };
        })
      );
      setRawCertificates(certificatesData);
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  // Sorting and filtering
  const processAndSortCertificates = () => {
    if (!rawCertificates.length) {
      setCertificates([]);
      return;
    }

    const filteredData = rawCertificates.filter(item =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedData = [...filteredData].sort((a, b) => {
      if (sortType === 'date') {
        return sortOrder === 'asc' ? 
          new Date(a.date) - new Date(b.date) : 
          new Date(b.date) - new Date(a.date);
      }
      return sortOrder === 'asc' ?
        a.filename.localeCompare(b.filename) :
        b.filename.localeCompare(a.filename);
    });

    const groupedData = sortedData.reduce((acc, item) => {
      const key = sortType === 'date' ? item.month : item.filename[0].toUpperCase();
      acc[key] = [...(acc[key] || []), item];
      return acc;
    }, {});

    const sections = Object.keys(groupedData)
      .sort((a, b) => sortType === 'date' ?
        new Date(a + ' 1, 2023') - new Date(b + ' 1, 2023') :
        a.localeCompare(b))
      .map(key => ({
        title: key,
        data: groupedData[key]
      }));

    setCertificates(sortOrder === 'desc' ? sections.reverse() : sections);
  };

  // Image viewing functionality
  const openImageViewer = (uri) => {
    const images = rawCertificates.map(cert => ({ 
      url: cert.uri,
      props: { title: cert.filename } 
    }));
    const index = rawCertificates.findIndex(cert => cert.uri === uri);
    setViewerImages(images);
    setCurrentImageIndex(index);
    setIsViewerVisible(true);
  };

  // Add new certificate - this function is still missing in original code
  const showAddOptions = () => {
    Alert.alert(
      'Add Certificate',
      'Choose an option',
      [
        { text: 'Cancel' },
        { text: 'Take Photo', onPress: takePicture },
        { text: 'Choose from Gallery', onPress: pickImage },
      ]
    );
  };

  // These functions are placeholders as they weren't fully implemented in original code
  // Implement the takePicture function to capture images using the device camera
const takePicture = async () => {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your camera to take pictures.');
      return;
    }
    
    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    
    // Check if the user cancelled the operation
    if (result.canceled || !result.assets || !result.assets[0]) {
      return;
    }
    
    // Get the captured image URI
    const capturedUri = result.assets[0].uri;
    
    // Prompt user for file name
    const fileName = await promptForFileName();
    
    if (!fileName) {
      // User cancelled the file naming
      return;
    }
    
    // Show loading indicator
    setLoading(true);
    
    // Create destination path
    const destinationUri = CERTIFICATES_DIRECTORY + fileName;
    
    // Copy the file to our app directory
    await FileSystem.copyAsync({
      from: capturedUri,
      to: destinationUri,
    });
    
    // Save to external directory for access from other apps
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        // Create external directory if it doesn't exist
        const dirInfo = await FileSystem.getInfoAsync(EXTERNAL_DIRECTORY);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(EXTERNAL_DIRECTORY, { intermediates: true });
        }
        
        // Copy to external directory
        const externalUri = EXTERNAL_DIRECTORY + fileName;
        await FileSystem.copyAsync({
          from: destinationUri,
          to: externalUri,
        });
        
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(externalUri);
        
        Alert.alert(
          'Success',
          'Certificate captured and saved successfully! It is also available in your Pictures/KareBot Certificates folder.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Success',
          'Certificate captured and saved successfully within the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Media library save error:', error);
      Alert.alert(
        'Partial Success', 
        'Certificate captured and saved within the app, but could not be saved to your device gallery.'
      );
    }
    
    // Refresh the certificates list
    await loadCertificates();
  } catch (error) {
    console.error('Camera error:', error);
    Alert.alert('Error', 'Failed to capture certificate with camera');
  } finally {
    setLoading(false);
  }
};

  // Modified pickImage function to implement image selection from gallery
const pickImage = async () => {
  try {
    // Request permissions for accessing media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photo library to select images.');
      return;
    }
    
    // Open the image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    // Check if the user cancelled the operation
    if (result.canceled || !result.assets || !result.assets[0]) {
      return;
    }
    
    // Get the selected image URI
    const selectedUri = result.assets[0].uri;
    
    // Prompt user for file name
    const fileName = await promptForFileName();
    
    if (!fileName) {
      // User cancelled the file naming
      return;
    }
    
    // Show loading indicator
    setLoading(true);
    
    // Create destination path
    const destinationUri = CERTIFICATES_DIRECTORY + fileName;
    
    // Copy the file to our app directory
    await FileSystem.copyAsync({
      from: selectedUri,
      to: destinationUri,
    });
    
    // Save to external directory for access from other apps
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        // Create external directory if it doesn't exist
        const dirInfo = await FileSystem.getInfoAsync(EXTERNAL_DIRECTORY);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(EXTERNAL_DIRECTORY, { intermediates: true });
        }
        
        // Copy to external directory
        const externalUri = EXTERNAL_DIRECTORY + fileName;
        await FileSystem.copyAsync({
          from: destinationUri,
          to: externalUri,
        });
        
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(externalUri);
        
        Alert.alert(
          'Success',
          'Certificate saved successfully! It is also available in your Pictures/KareBot Certificates folder.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Success',
          'Certificate saved successfully within the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Media library save error:', error);
      Alert.alert(
        'Partial Success', 
        'Certificate saved within the app, but could not be saved to your device gallery.'
      );
    }
    
    // Refresh the certificates list
    await loadCertificates();
  } catch (error) {
    console.error('Image picking error:', error);
    Alert.alert('Error', 'Failed to import certificate from gallery');
  } finally {
    setLoading(false);
  }
};

// Also ensure the promptForFileName function has proper implementation
// This will now be called from pickImage for naming the file



  // Sharing functionality
  const shareCertificate = async (uri) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share Certificate',
        UTI: 'public.image'
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share certificate');
    }
  };

  // Certificate deletion
  const deleteCertificate = async (uri) => {
    try {
      await FileSystem.deleteAsync(uri);
      Alert.alert('Success', 'Certificate deleted');
      loadCertificates();
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete certificate');
    }
  };

  // File name prompt handling
  const promptForFileName = () => {
    return new Promise((resolve) => {
      setFileNameResolver(() => resolve);
      setTempFileName('');
      setIsPromptVisible(true);
    });
  };

  const handlePromptSubmit = () => {
    if (fileNameResolver) {
      const filename = tempFileName.trim();
      fileNameResolver(filename ? `${filename}.jpg` : null);
      setIsPromptVisible(false);
      setFileNameResolver(null);
    }
  };

  const handlePromptCancel = () => {
    if (fileNameResolver) {
      fileNameResolver(null);
      setIsPromptVisible(false);
      setFileNameResolver(null);
    }
  };

  // UI components
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.certificateCard}
      onPress={() => openImageViewer(item.uri)}
      onLongPress={() => Alert.alert(
        'Certificate Actions',
        'Choose an action',
        [
          { text: 'Cancel' },
          { text: 'Delete', onPress: () => deleteCertificate(item.uri), style: 'destructive' },
          { text: 'Share', onPress: () => shareCertificate(item.uri) },
        ]
      )}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.certificateInfo}>
        <Text style={styles.certificateTitle}>{item.filename}</Text>
        <Text style={styles.certificateDate}>{item.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <LinearGradient colors={[COLORS.primary, COLORS.primary]} style={styles.header}>
          <Text style={styles.headerTitle}>Certificates</Text>
        </LinearGradient>

        {/* Image Viewer Modal - Updated with elements from PreviewScreen */}
        <Modal 
          visible={isViewerVisible} 
          transparent={true}
          onRequestClose={() => setIsViewerVisible(false)}
          animationType="fade"
          statusBarTranslucent
          hardwareAccelerated
        >
          <View style={styles.modalBackground}>
            <ImageViewer
              imageUrls={viewerImages}
              index={currentImageIndex}
              enableSwipeDown={true}
              onSwipeDown={() => setIsViewerVisible(false)}
              saveToLocalByLongPress={false}
              renderHeader={() => (
                <View style={styles.viewerHeader}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsViewerVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => {
                      if (viewerImages[currentImageIndex]) {
                        shareCertificate(viewerImages[currentImageIndex].url);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.shareButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              )}
              renderIndicator={(currentIndex, allSize) => (
                <View style={styles.indicatorContainer}>
                  <Text style={styles.indicatorText}>
                    {viewerImages[currentIndex - 1]?.props?.title || ''}
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

        {/* File Name Prompt Modal */}
        <Modal
          visible={isPromptVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={handlePromptCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Certificate Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter certificate name"
                value={tempFileName}
                onChangeText={setTempFileName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handlePromptCancel}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handlePromptSubmit}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Main Content */}
        <View style={styles.controlsContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search certificates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textSecondary}
          />
          <View style={styles.sortControls}>
            <TouchableOpacity style={styles.sortButton} onPress={() => setSortType(prev => prev === 'date' ? 'name' : 'date')}>
              <Ionicons name={sortType === 'date' ? 'calendar' : 'text'} size={20} color={COLORS.primary} />
              <Text style={styles.sortButtonText}>{sortType === 'date' ? 'Date' : 'Name'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortButton} onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
              <Ionicons name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={20} color={COLORS.primary} />
              <Text style={styles.sortButtonText}>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortButton} onPress={showAddOptions}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
              <Text style={styles.sortButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.noticeText}>
            you can upload certificate to Websites from <Text style={styles.highlightedText}>"Pictures/KareBot Certificates"</Text> in your device
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading Certificates...</Text>
          </View>
        ) : (
          <SectionList
            sections={certificates}
            keyExtractor={(item) => item.uri}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={60} color={COLORS.grey} />
                <Text style={styles.emptyText}>No certificates found</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  certificateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    zIndex: 999,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shareButton: {
    backgroundColor: 'rgba(30, 64, 175, 0.6)',
    borderRadius: 8,
    padding: 12,
    zIndex: 999,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    zIndex: 999,
  },
  indicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  indicatorText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  sortControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  sortButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  certificateInfo: {
    flex: 1,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  certificateDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    backgroundColor: COLORS.primaryLight + '20',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: COLORS.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: COLORS.text,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  highlightedText: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  // New styles from PreviewScreen
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  
export default CertificatesScreen;