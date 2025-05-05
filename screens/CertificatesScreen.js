import React, { useState, useEffect, useRef } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
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
import { useTheme } from '../context/ThemeContext';
import { Button, Snackbar } from 'react-native-paper';

const TEAL = '#19C6C1';
const LIGHT_TEAL = '#E6F8F7';
const RED = '#F56565';
const GREEN = '#22C55E';
const WHITE = '#fff';
const CARD_BG_LIGHT = '#fff';
const CARD_BG_DARK = '#1A2536';
const BG_LIGHT = '#F8FAFC';
const BG_DARK = '#101828';
const TEXT_DARK = '#0F172A';
const TEXT_LIGHT = '#fff';
const TEXT_SECONDARY = '#64748B';

const SortButton = ({ label, active, onPress, style, isDarkMode, theme }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      {
        backgroundColor: active
          ? '#19C6C1'
          : isDarkMode
            ? '#232B3A'
            : '#E6F8F7',
        paddingVertical: 8,
        paddingHorizontal: 22,
        borderRadius: 8,
        marginRight: 8,
      },
      style,
    ]}
  >
    <Text style={{
      color: active
        ? '#fff'
        : '#19C6C1',
      fontWeight: '600'
    }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const CertificatesScreen = ({ navigation }) => {
  const { isDarkMode, theme } = useTheme();
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info'); // 'success', 'error', 'info'
  const [localFileName, setLocalFileName] = useState('');

  // Constants
  const CERTIFICATES_DIRECTORY = FileSystem.documentDirectory + 'certificates/';
  const FOLDER_NAME = 'KareBot Certificates';

  // Effects
  useEffect(() => {
    setupDirectories();
    loadCertificates();
  }, []);

  useEffect(() => {
    processAndSortCertificates();
  }, [searchQuery, sortType, sortOrder, rawCertificates]);

  // Directory setup
  const setupDirectories = async () => {
    try {
      // Create internal app directory
      const dirInfo = await FileSystem.getInfoAsync(CERTIFICATES_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CERTIFICATES_DIRECTORY, { intermediates: true });
      }
      
      // Ensure media library permissions for external storage
      await ensureMediaLibraryPermissions();
    } catch (error) {
      console.error('Directory setup error:', error);
      showSnackbar('Failed to set up storage directories. Some features may not work.');
    }
  };

  // Ensure media library permissions are granted
  const ensureMediaLibraryPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      showSnackbar('To save certificates to your device gallery, please grant storage permissions.');
    }
    return status === 'granted';
  };

  // Certificate loading
  const loadCertificates = async () => {
    try {
      setLoading(true);
      
      // Load certificates from internal storage
      const files = await FileSystem.readDirectoryAsync(CERTIFICATES_DIRECTORY);
      const internalCertificates = await Promise.all(
        files.map(async (filename) => {
          const fileInfo = await FileSystem.getInfoAsync(CERTIFICATES_DIRECTORY + filename);
          return {
            filename,
            uri: CERTIFICATES_DIRECTORY + filename,
            date: new Date(fileInfo.modificationTime * 1000).toISOString().split('T')[0],
            month: new Date(fileInfo.modificationTime * 1000).toLocaleString('default', { month: 'long' }),
            source: 'internal'
          };
        })
      );

      // Load certificates from media library
      let mediaCertificates = [];
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') {
        try {
          const albums = await MediaLibrary.getAlbumsAsync();
          const targetAlbum = albums.find(album => album.title === FOLDER_NAME);
          
          if (targetAlbum) {
            const assets = await MediaLibrary.getAssetsAsync({
              album: targetAlbum.id,
              mediaType: 'photo'
            });
            
            mediaCertificates = assets.assets.map(asset => ({
              filename: asset.filename,
              uri: asset.uri,
              date: new Date(asset.creationTime).toISOString().split('T')[0],
              month: new Date(asset.creationTime).toLocaleString('default', { month: 'long' }),
              source: 'media'
            }));
          }
        } catch (mediaError) {
          console.warn('Error loading media library certificates:', mediaError);
        }
      }

      // Combine and deduplicate certificates
      const allCertificates = [...internalCertificates, ...mediaCertificates];
      const uniqueCertificates = allCertificates.reduce((acc, current) => {
        const x = acc.find(item => item.filename === current.filename);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      setRawCertificates(uniqueCertificates);
    } catch (error) {
      console.error('Load error:', error);
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

    // Filter certificates based on search query
    const filteredData = rawCertificates.filter(item =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort certificates based on sort type and order
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

    // Group certificates by section
    const groupedData = sortedData.reduce((acc, item) => {
      const key = sortType === 'date' ? item.month : item.filename[0].toUpperCase();
      acc[key] = [...(acc[key] || []), item];
      return acc;
    }, {});

    // Create sections for SectionList
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

  // Add new certificate options
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

  // Handle image capture and saving
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
      await processSelectedImage(result.assets[0].uri);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture certificate with camera');
    }
  };

  // Handle picking image from gallery
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
      await processSelectedImage(result.assets[0].uri);
    } catch (error) {
      console.error('Image picking error:', error);
      Alert.alert('Error', 'Failed to import certificate from gallery');
    }
  };

  // Common function to process and save selected images
  const processSelectedImage = async (imageUri) => {
    try {
      setShowNameModal(true);
      // Store the imageUri in state to use it later
      setSelectedImageUri(imageUri);
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert('Error', 'Failed to process image');
    }
  };

  const handleFileNameSubmit = async () => {
    if (!fileName.trim()) {
      showSnackbar('Please enter a valid file name', 'error');
      return;
    }

    if (!selectedImageUri) {
      showSnackbar('No image selected', 'error');
      return;
    }

    try {
      setLoading(true);
      setShowNameModal(false);
      
      // Create destination path for internal storage
      const finalName = fileName.trim().endsWith('.jpg') ? fileName.trim() : `${fileName.trim()}.jpg`;
      const destinationUri = CERTIFICATES_DIRECTORY + finalName;
      
      // Copy the file to our app directory
      await FileSystem.copyAsync({
        from: selectedImageUri,
        to: destinationUri,
      });
      
      // Save to external storage if permissions granted
      const hasPermission = await ensureMediaLibraryPermissions();

      // First consider the operation successful after internal save
      let savedToGallery = false;

      if (hasPermission) {
        try {
          // Save to media library with a more robust approach
          const asset = await MediaLibrary.createAssetAsync(destinationUri);
          
          if (asset) {
            // Try to get or create the album
            const album = await getOrCreateAlbum();
            
            if (album) {
              // Add the asset to the album with error handling
              try {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                savedToGallery = true;
              } catch (albumError) {
                console.warn('Could not add asset to album:', albumError);
                // The asset is still saved to the media library, just not in our album
                savedToGallery = true;
              }
            } else {
              // Album creation/fetching failed, but asset is still in the media library
              savedToGallery = true;
            }
          }
        } catch (externalSaveError) {
          console.error('External save error:', externalSaveError);
          // Continue with the flow, we'll show appropriate messages
        }
      }
      
      // Show appropriate success message
      if (savedToGallery) {
        showSnackbar(`Certificate saved as "${finalName}"! It is also available in your device gallery.`, 'success');
      } else {
        showSnackbar(`Certificate saved within the app as "${finalName}", but could not be saved to your device gallery.`, 'info');
      }
      
      // Refresh the certificates list
      await loadCertificates();
    } catch (error) {
      console.error('Image processing error:', error);
      showSnackbar('Failed to save certificate', 'error');
    } finally {
      setLoading(false);
      setFileName('');
      setSelectedImageUri(null);
      Keyboard.dismiss();
    }
  };

  const handleFileNameCancel = () => {
    Keyboard.dismiss();
    setShowNameModal(false);
    setFileName('');
  };

  // File Name Modal Component
 const FileNameModal = () => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (showNameModal) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showNameModal]);


    const handleModalClose = () => {
      setIsModalVisible(false);
      setLocalFileName('');
      handleFileNameCancel();
    };

    const handleTextChange = (text) => {
      setLocalFileName(text);
      setFileName(text);
    };

    const handleSubmit = () => {
      if (localFileName.trim()) {
        setFileName(localFileName);
        handleFileNameSubmit();
      }
    };

    return (
          <Modal
      visible={showNameModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleFileNameCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={handleFileNameCancel}>
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(16,24,40,0.18)'
          }}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={{ 
                backgroundColor: isDarkMode ? theme.surface : WHITE, 
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
                  color: isDarkMode ? theme.text : TEXT_DARK, 
                  marginBottom: 16 
                }}>
                  Name Certificate
                </Text>
                <TextInput
                  ref={inputRef}
                  style={{ 
                    backgroundColor: isDarkMode ? '#232B3A' : BG_LIGHT, 
                    borderRadius: 8, 
                    padding: 12, 
                    marginBottom: 20, 
                    color: isDarkMode ? theme.text : TEXT_DARK, 
                    borderWidth: 1, 
                    borderColor: isDarkMode ? theme.border : '#E2E8F0', 
                    fontSize: 16 
                  }}
                  placeholder="Enter certificate name"
                  placeholderTextColor={isDarkMode ? theme.textSecondary : TEXT_SECONDARY}
                  value={fileName}
                  onChangeText={setFileName}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                  textContentType="none"
                  maxLength={50}
                  blurOnSubmit={false}
                  returnKeyType="done"
                  onSubmitEditing={handleFileNameSubmit}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                  <Button
                    mode="outlined"
                    onPress={handleFileNameCancel}
                    style={{ flex: 1 }}
                    textColor={RED}
                    buttonColor={isDarkMode ? theme.surface : WHITE}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleFileNameSubmit}
                    style={{ flex: 1 }}
                    buttonColor={isDarkMode ? TEAL : GREEN}
                  >
                    Confirm
                  </Button>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

  // Get or create album for certificates with improved error handling
  const getOrCreateAlbum = async () => {
    try {
      // First try to find existing album
      const albums = await MediaLibrary.getAlbumsAsync();
      const certificatesAlbum = albums.find(album => album.title === FOLDER_NAME);
      
      if (certificatesAlbum) {
        return certificatesAlbum;
      }
      
      // Album doesn't exist, create it based on platform
      if (Platform.OS === 'android') {
        // For Android, we'll create a temporary asset first if needed
        const tempAsset = await createTemporaryAssetIfNeeded();
        if (tempAsset) {
          try {
            const newAlbum = await MediaLibrary.createAlbumAsync(FOLDER_NAME, tempAsset, false);
            return newAlbum;
          } catch (albumError) {
            console.warn('Failed to create album with asset:', albumError);
            return null;
          }
        }
        return null;
      } else if (Platform.OS === 'ios') {
        // On iOS, we can create an empty album
        try {
          await MediaLibrary.createAlbumAsync(FOLDER_NAME, null, false);
          return await MediaLibrary.getAlbumAsync(FOLDER_NAME);
        } catch (iosAlbumError) {
          console.warn('Failed to create iOS album:', iosAlbumError);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Album creation/fetch error:', error);
      return null;
    }
  };

  // Create a temporary asset if needed for album creation on Android
  const createTemporaryAssetIfNeeded = async () => {
    // This function is only needed for Android when creating a new album
    if (Platform.OS !== 'android') return null;
    
    try {
      // Check if we have any existing certificates
      if (rawCertificates.length > 0) {
        // Use an existing certificate as the asset for album creation
        const firstCert = rawCertificates[0];
        return await MediaLibrary.createAssetAsync(firstCert.uri);
      }
      
      // If no certificates exist, we'll need a temporary image
      // We'll use a simple approach - copy from the selected image
      return null; // This will be handled in the calling function
    } catch (error) {
      console.warn('Failed to create temporary asset:', error);
      return null;
    }
  };

  // Handle certificate sharing
  const handleShareCertificate = async () => {
    if (!selectedCertificate) return;

    try {
      if (!(await Sharing.isAvailableAsync())) {
        return;
      }
      
      await Sharing.shareAsync(selectedCertificate.uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share Certificate',
        UTI: 'public.image'
      });
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setShowOptionsModal(false);
      setSelectedCertificate(null);
    }
  };

  // Handle certificate deletion
  const handleDeleteCertificate = async () => {
    if (!selectedCertificate) return;
    setShowOptionsModal(false);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCertificate) return;

    try {
      setLoading(true);
      // Delete from app's internal storage
      await FileSystem.deleteAsync(selectedCertificate.uri);
      
      // Try to delete from media library if possible
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') {
        try {
          await deleteFromMediaLibrary(selectedCertificate.filename);
        } catch (mediaError) {
          console.log('Media library deletion error:', mediaError);
        }
      }
      
      await loadCertificates();
    } catch (error) {
      console.error('Deletion error:', error);
    } finally {
      setLoading(false);
      setDeleteModalVisible(false);
      setSelectedCertificate(null);
    }
  };

  // Helper function to delete asset from media library
  const deleteFromMediaLibrary = async (filename) => {
    // 1. Try to find the certificate in our album first
    try {
      const albums = await MediaLibrary.getAlbumsAsync();
      const targetAlbum = albums.find(album => album.title === FOLDER_NAME);
      
      if (targetAlbum) {
        const assets = await MediaLibrary.getAssetsAsync({
          album: targetAlbum.id,
          mediaType: 'photo'
        });
        
        // Find assets that match our filename
        const matchingAssets = assets.assets.filter(asset => 
          asset.filename === filename || 
          asset.uri.includes(filename) ||
          asset.filename.includes(filename.replace('.jpg', ''))
        );
        
        if (matchingAssets.length > 0) {
          // Found matching assets in our album, delete them
          await MediaLibrary.deleteAssetsAsync(matchingAssets);
          console.log(`Deleted ${matchingAssets.length} matching assets from album`);
          return;
        }
      }
      
      // 2. If not found in our album, search in all photos
      const allPhotos = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 100 // Limit search to recent photos
      });
      
      const matchingAssets = allPhotos.assets.filter(asset => 
        asset.filename === filename || 
        asset.uri.includes(filename) ||
        asset.filename.includes(filename.replace('.jpg', ''))
      );
      
      if (matchingAssets.length > 0) {
        await MediaLibrary.deleteAssetsAsync(matchingAssets);
        console.log(`Deleted ${matchingAssets.length} matching assets from all photos`);
      } else {
        console.log('No matching assets found to delete');
      }
    } catch (error) {
      console.warn('Asset deletion error:', error);
      throw error;
    }
  };

  // Handle certificate press
  const handleCertificatePress = (item) => {
    const images = rawCertificates.map(cert => ({ 
      url: cert.uri,
      props: { title: cert.filename } 
    }));
    const index = rawCertificates.findIndex(cert => cert.uri === item.uri);
    setViewerImages(images);
    setCurrentImageIndex(index);
    setIsViewerVisible(true);
  };

  // Handle certificate long press
  const handleCertificateLongPress = (item) => {
    setSelectedCertificate(item);
    setShowOptionsModal(true);
  };

  // Update the renderItem function
  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleCertificatePress(item)}
      onLongPress={() => handleCertificateLongPress(item)}
      activeOpacity={0.7}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? theme.surface : '#fff',
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 20,
        borderRadius: 14,
        shadowColor: isDarkMode ? '#000' : '#1e40af',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4
      }}>
        <Image
          source={{ uri: item.uri }}
          style={{ width: 60, height: 60, borderRadius: 10, marginRight: 14 }}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: isDarkMode ? theme.text : '#0F172A', 
            marginBottom: 2 
          }} numberOfLines={1}>
            {item.filename.replace('.jpg', '')}
          </Text>
          <Text style={{ 
            fontSize: 13, 
            color: isDarkMode ? theme.textSecondary : '#64748B' 
          }}>
            Added {item.date}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }) => (
    <View style={{
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 4,
      backgroundColor: 'transparent'
    }}>
      <Text style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: isDarkMode ? theme.text : '#0F172A'
      }}>
        {section.title}
      </Text>
      <View style={{
        height: 1,
        backgroundColor: isDarkMode ? '#232B3A' : '#E5EAF1',
        marginTop: 6
      }} />
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={60} color={theme.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        No certificates found
      </Text>
      <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
        Tap the "+" button to add certificates
      </Text>
    </View>
  );

  // Floating Action Button (Both Themes)
  <TouchableOpacity
    style={[
      styles.fab,
      {
        backgroundColor: isDarkMode ? '#19C6C1' : '#19C6C1',
        shadowColor: isDarkMode ? '#000' : '#19C6C1',
        shadowOpacity: isDarkMode ? 0.3 : 0.4,
        shadowRadius: isDarkMode ? 8 : 6,
      }
    ]}
    onPress={() => setShowAddModal(true)}
    activeOpacity={0.85}
  >
    <Ionicons name="add" size={32} color={'#fff'} />
  </TouchableOpacity>

  // Add Certificate Modal
  const AddCertificateModal = () => (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={{ 
        flex: 1, 
        justifyContent: 'flex-end', 
        backgroundColor: 'rgba(16,24,40,0.18)' 
      }}>
        <View style={{ 
          backgroundColor: isDarkMode ? '#1A2536' : '#fff', 
          borderTopLeftRadius: 24, 
          borderTopRightRadius: 24, 
          padding: 24, 
          width: '100%', 
          maxWidth: 500, 
          alignSelf: 'center' 
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: 18 
          }}>
            <Text style={{ 
              color: isDarkMode ? '#fff' : '#0F172A', 
              fontWeight: 'bold', 
              fontSize: 16 
            }}>
              Add Certificate
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={isDarkMode ? '#A0AEC0' : '#64748B'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={{ 
              backgroundColor: isDarkMode ? '#19C6C1' : '#19C6C1', 
              borderRadius: 10, 
              padding: 16, 
              alignItems: 'center', 
              marginBottom: 12, 
              flexDirection: 'row', 
              justifyContent: 'center' 
            }}
            onPress={async () => { setShowAddModal(false); await takePicture(); }}
          >
            <Ionicons name="camera" size={20} color={'#fff'} style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ 
              borderWidth: 2, 
              borderColor: '#19C6C1', 
              borderRadius: 10, 
              padding: 16, 
              alignItems: 'center', 
              marginBottom: 12, 
              flexDirection: 'row', 
              justifyContent: 'center', 
              backgroundColor: isDarkMode ? '#1A2536' : '#fff' 
            }}
            onPress={async () => { setShowAddModal(false); await pickImage(); }}
          >
            <Ionicons name="image" size={20} color={'#19C6C1'} style={{ marginRight: 8 }} />
            <Text style={{ color: '#19C6C1', fontWeight: '600', fontSize: 16 }}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const showSnackbar = (message, type = 'info') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  // Options Modal Component
  const OptionsModal = () => (
    <Modal
      visible={showOptionsModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowOptionsModal(false)}
      >
        <View style={[
          styles.optionsModalContent,
          { backgroundColor: isDarkMode ? theme.surface : WHITE }
        ]}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleShareCertificate}
          >
            <Ionicons name="share-outline" size={24} color={isDarkMode ? theme.text : TEXT_DARK} />
            <Text style={[styles.optionText, { color: isDarkMode ? theme.text : TEXT_DARK }]}>
              Share
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, styles.deleteButton]}
            onPress={handleDeleteCertificate}
          >
            <Ionicons name="trash-outline" size={24} color={RED} />
            <Text style={[styles.optionText, { color: RED }]}>
              Delete
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => setShowOptionsModal(false)}
          >
            <Ionicons name="close-outline" size={24} color={isDarkMode ? theme.text : TEXT_DARK} />
            <Text style={[styles.optionText, { color: isDarkMode ? theme.text : TEXT_DARK }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? theme.background : '#F8FAFC' }}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={{
          paddingTop: Platform.OS === 'ios' ? 30 : 15,
          paddingBottom: 12,
          paddingHorizontal: 10,
          backgroundColor: isDarkMode ? (theme.background || '#101828') : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: isDarkMode ? 0.4 : 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderBottomWidth: isDarkMode ? 1 : 0,
          borderBottomColor: isDarkMode ? '#2D3748' : 'transparent',
          zIndex: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={26} color={isDarkMode ? '#fff' : '#0F172A'} />
            </TouchableOpacity>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: isDarkMode ? '#fff' : '#0F172A',
              textAlign: 'center',
              flex: 1
            }}>
              Certificates
            </Text>
            <View style={{ width: 34 }} />
          </View>
          <Text style={{
            color: isDarkMode ? '#fff' : '#64748B',
            fontSize: 15,
            marginTop: 6,
            marginBottom: 4,
            textAlign: 'center',
            opacity: 0.8
          }}>
            Track your academic certificates
          </Text>
        </View>
        {/* Search Bar */}
        <View style={{ paddingHorizontal: 20, marginTop: 18, marginBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#232B3A' : '#F3F6FA',
              borderRadius: 12,
              paddingHorizontal: 14,
              height: 44,
            }}
          >
            <Ionicons
              name="search"
              size={20}
              color={isDarkMode ? '#fff' : '#64748B'}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: isDarkMode ? '#fff' : '#0F172A',
                backgroundColor: 'transparent',
              }}
              placeholder="Search certificates..."
              placeholderTextColor={isDarkMode ? '#A0AEC0' : '#64748B'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        {/* Filter/Sort Buttons */}
        <View style={{
          flexDirection: 'row',
          gap: 6,
          marginBottom: 8,
          paddingHorizontal: 10,
        }}>
          {/* Group 1: Date/Name */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDarkMode ? '#232B3A' : '#E6F8F7',
            borderRadius: 12,
            padding: 4,
            marginRight: 12,
          }}>
            <SortButton
              label="Date"
              active={sortType === 'date'}
              onPress={() => setSortType('date')}
              style={{ borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
              isDarkMode={isDarkMode}
              theme={theme}
            />
            <SortButton
              label="Name"
              active={sortType === 'name'}
              onPress={() => setSortType('name')}
              style={{ borderTopLeftRadius: 5, borderBottomLeftRadius: 5, marginRight: 0 }}
              isDarkMode={isDarkMode}
              theme={theme}
            />
          </View>
          {/* Group 2: Asc/Desc */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDarkMode ? '#232B3A' : '#E6F8F7',
            borderRadius: 12,
            padding: 4,
          }}>
            <SortButton
              label="Asc"
              active={sortOrder === 'asc'}
              onPress={() => setSortOrder('asc')}
              style={{ borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
              isDarkMode={isDarkMode}
              theme={theme}
            />
            <SortButton
              label="Desc"
              active={sortOrder === 'desc'}
              onPress={() => setSortOrder('desc')}
              style={{ borderTopLeftRadius: 5, borderBottomLeftRadius: 5, marginRight: 0 }}
              isDarkMode={isDarkMode}
              theme={theme}
            />
          </View>
        </View>
        {/* Certificate List */}
        <SectionList
          sections={certificates}
          keyExtractor={(item) => item.uri}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={styles.listContent}
        />
        {/* Floating Action Button (Both Themes) */}
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: isDarkMode ? '#19C6C1' : '#19C6C1',
              shadowColor: isDarkMode ? '#000' : '#19C6C1',
              shadowOpacity: isDarkMode ? 0.3 : 0.4,
              shadowRadius: isDarkMode ? 8 : 6,
            }
          ]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={32} color={'#fff'} />
        </TouchableOpacity>
       
        <AddCertificateModal />
        <FileNameModal />
        <OptionsModal />
        <Modal
          visible={isViewerVisible}
          transparent={true}
          onRequestClose={() => setIsViewerVisible(false)}
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.viewerBackground}>
            <ImageViewer
              imageUrls={viewerImages}
              index={currentImageIndex}
              enableSwipeDown={true}
              onSwipeDown={() => setIsViewerVisible(false)}
              saveToLocalByLongPress={false}
              renderHeader={() => (
                <View style={styles.viewerHeader}>
                  <View style={styles.viewerButtons}>
                    <TouchableOpacity 
                      style={[styles.shareButton, { backgroundColor: 'rgba(25, 198, 193, 0.3)' }]} 
                      onPress={() => handleShareCertificate()}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-outline" size={20} color="#fff" />
                      <Text style={[styles.shareButtonText, { fontWeight: '900' }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.closeButton, { backgroundColor: 'rgba(255, 255, 255, 0.36)' }]} 
                      onPress={() => setIsViewerVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={{color: '#ffff', fontWeight: '900'}}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              renderIndicator={(currentIndex, allSize) => (
                <View style={[styles.indicatorContainer, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
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
              backgroundColor="rgba(0, 0, 0, 0.9)"
              loadingRender={() => (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: '#fff' }]}>Loading...</Text>
                </View>
              )}
            />
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent={true}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[
              styles.modalContent,
              { 
                backgroundColor: isDarkMode ? theme.surface : '#fff',
                borderColor: isDarkMode ? theme.border : '#E2E8F0'
              }
            ]}>
              <Text style={[
                styles.modalTitle,
                { color: isDarkMode ? theme.text : '#0F172A' }
              ]}>
                Delete Certificate
              </Text>
              <Text style={[
                styles.modalMessage,
                { color: isDarkMode ? theme.textSecondary : '#64748B' }
              ]}>
                Are you sure you want to delete this certificate?
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setDeleteModalVisible(false)}
                  style={[styles.modalButton, { borderColor: '#19C6C1' }]}
                  labelStyle={{ color: '#19C6C1' }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleDeleteConfirm}
                  style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                >
                  Delete
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={5000}
          style={{
            backgroundColor: snackbarType === 'error' 
              ? isDarkMode ? '#EF4444' : '#FEE2E2'
              : snackbarType === 'success'
                ? isDarkMode ? '#22C55E' : '#DCFCE7'
                : isDarkMode ? theme.surface : WHITE
          }}
          action={{
            label: 'Dismiss',
            onPress: () => setSnackbarVisible(false),
            textColor: snackbarType === 'error' 
              ? isDarkMode ? '#FEE2E2' : '#EF4444'
              : snackbarType === 'success'
                ? isDarkMode ? '#DCFCE7' : '#22C55E'
                : isDarkMode ? theme.text : TEXT_DARK
          }}
        >
          <Text style={{ 
            color: snackbarType === 'error' 
              ? isDarkMode ? '#FEE2E2' : '#EF4444'
              : snackbarType === 'success'
                ? isDarkMode ? '#DCFCE7' : '#22C55E'
                : isDarkMode ? theme.text : TEXT_DARK
          }}>
            {snackbarMessage}
          </Text>
        </Snackbar>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonText: {
    fontWeight: '600',
    marginLeft: 6,
  },
  certificateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 14,
  },
  certificateImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 14,
  },
  certificateInfo: {
    flex: 1,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  certificateDate: {
    fontSize: 13,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionDivider: {
    height: 1,
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  darkModeCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  darkModeCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  darkModeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  darkModeCardOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  darkModeCardIcon: {
    marginRight: 8,
  },
  darkModeCardButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
  snackbar: {
    margin: 16,
    borderRadius: 8,
  },
  viewerBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  viewerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 999,
  },
  viewerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  indicatorContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
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
  },
  loadingText: {
    fontSize: 16,
  },
  optionsModalContent: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default CertificatesScreen;