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
import { useTheme } from '../context/ThemeContext';

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
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [tempFileName, setTempFileName] = useState('');
  const [fileNameResolver, setFileNameResolver] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

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
      Alert.alert('Storage Error', 'Failed to set up storage directories. Some features may not work.');
    }
  };

  // Ensure media library permissions are granted
  const ensureMediaLibraryPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'To save certificates to your device gallery, please grant storage permissions.',
        [{ text: 'OK' }]
      );
    }
    return status === 'granted';
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
      setShowNameModal(true);
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
      setShowNameModal(true);
      await processSelectedImage(result.assets[0].uri);
    } catch (error) {
      console.error('Image picking error:', error);
      Alert.alert('Error', 'Failed to import certificate from gallery');
    }
  };

  // Common function to process and save selected images
  const processSelectedImage = async (imageUri) => {
    try {
      // Prompt user for file name
      const fileName = await promptForFileName();
      
      if (!fileName) {
        // User cancelled the file naming
        return;
      }
      
      setLoading(true);
      
      // Create destination path for internal storage
      const destinationUri = CERTIFICATES_DIRECTORY + fileName;
      
      // Copy the file to our app directory
      await FileSystem.copyAsync({
        from: imageUri,
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
        Alert.alert(
          'Success',
          `Certificate saved as "${fileName}"! It is also available in your device gallery.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Partial Success', 
          `Certificate saved within the app as "${fileName}", but could not be saved to your device gallery.`,
          [{ text: 'OK' }]
        );
      }
      
      // Refresh the certificates list
      await loadCertificates();
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert('Error', 'Failed to save certificate');
    } finally {
      setLoading(false);
    }
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

  // Certificate deletion with improved error handling
  const deleteCertificate = async (uri) => {
    try {
      const filename = uri.split('/').pop();
      
      Alert.alert(
        'Confirm Deletion',
        `Are you sure you want to delete "${filename}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                // 1. Delete from app's internal storage first
                await FileSystem.deleteAsync(uri);
                console.log(`Deleted internal file: ${uri}`);
                
                // 2. Try to delete from media library if possible
                const { status } = await MediaLibrary.getPermissionsAsync();
                if (status === 'granted') {
                  // Attempt to find and delete the matching asset in the media library
                  try {
                    await deleteFromMediaLibrary(filename);
                  } catch (mediaError) {
                    console.log('Media library deletion error:', mediaError);
                    // Don't block the flow - we've already deleted from internal storage
                  }
                }
                
                Alert.alert('Success', 'Certificate deleted successfully');
                loadCertificates();
              } catch (deleteError) {
                console.error('Deletion error:', deleteError);
                Alert.alert('Error', 'Failed to delete certificate');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete request error:', error);
      Alert.alert('Error', 'Failed to process deletion request');
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
      
      // Validate filename
      if (!filename) {
        Alert.alert('Error', 'Please enter a valid file name');
        return;
      }
      
      // Check if file already exists
      const finalName = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
      const exists = rawCertificates.some(cert => cert.filename === finalName);
      
      if (exists) {
        Alert.alert(
          'File Already Exists',
          'A certificate with this name already exists. Do you want to replace it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Replace', 
              style: 'destructive',
              onPress: () => {
                fileNameResolver(finalName);
                setIsPromptVisible(false);
                setFileNameResolver(null);
              }
            }
          ]
        );
      } else {
        fileNameResolver(finalName);
        setIsPromptVisible(false);
        setFileNameResolver(null);
      }
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
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginBottom: 12, marginHorizontal: 20, borderRadius: 14, shadowColor: '#1e40af', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
      <Image
        source={{ uri: item.uri }}
        style={{ width: 60, height: 60, borderRadius: 10, marginRight: 14 }}
        resizeMode="cover"
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 2 }} numberOfLines={1}>
          {item.filename.replace('.jpg', '')}
        </Text>
        <Text style={{ fontSize: 13, color: '#64748B' }}>Added {item.date}</Text>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section }) => (
    <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4, backgroundColor: 'transparent' }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>{section.title}</Text>
      <View style={{ height: 1, backgroundColor: '#E5EAF1', marginTop: 6 }} />
    </View>
  );

  // Add Certificate Modal
  const AddCertificateModal = () => (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,24,40,0.18)' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, width: '100%', maxWidth: 500, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 16 }}>Add Certificate</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={'#64748B'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#19C6C1', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center' }}
            onPress={async () => { setShowAddModal(false); await takePicture(); }}
          >
            <Ionicons name="camera" size={20} color={'#fff'} style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ borderWidth: 2, borderColor: '#19C6C1', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#fff' }}
            onPress={async () => { setShowAddModal(false); await pickImage(); }}
          >
            <Ionicons name="image" size={20} color={'#19C6C1'} style={{ marginRight: 8 }} />
            <Text style={{ color: '#19C6C1', fontWeight: '600', fontSize: 16 }}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Name Certificate Modal
  const NameCertificateModal = () => (
    <Modal
      visible={showNameModal && isPromptVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handlePromptCancel}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(16,24,40,0.18)' }}>
        <View style={{ backgroundColor: WHITE, borderRadius: 16, padding: 24, width: 320, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: TEXT_DARK, marginBottom: 16 }}>Name Certificate</Text>
          <TextInput
            style={{ backgroundColor: BG_LIGHT, borderRadius: 8, padding: 12, marginBottom: 20, color: TEXT_DARK, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 }}
            placeholder="Enter certificate name"
            placeholderTextColor={TEXT_SECONDARY}
            value={tempFileName}
            onChangeText={setTempFileName}
            autoFocus
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: RED, borderRadius: 8, padding: 14, alignItems: 'center' }}
              onPress={() => { setShowNameModal(false); handlePromptCancel(); }}
            >
              <Text style={{ color: WHITE, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: GREEN, borderRadius: 8, padding: 14, alignItems: 'center' }}
              onPress={() => { setShowNameModal(false); handlePromptSubmit(); }}
            >
              <Text style={{ color: WHITE, fontWeight: 'bold', fontSize: 16 }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <StatusBar barStyle={'dark-content'} />
        {/* Header */}
        <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 0, paddingHorizontal: 20, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={26} color={'#0F172A'} />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', flex: 1 }}>Certificates</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={{ padding: 4 }}>
              
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#64748B', fontSize: 15, marginTop: 6, marginBottom: 0, textAlign: 'center' }}>
            Manage your digital certificates
          </Text>
        </View>
        {/* Search Bar */}
        <View style={{ paddingHorizontal: 20, marginTop: 18, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F6FA', borderRadius: 12, paddingHorizontal: 14, height: 44 }}>
            <Ionicons name="search" size={20} color={'#64748B'} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 16, color: '#0F172A', backgroundColor: 'transparent' }}
              placeholder="Search certificates..."
              placeholderTextColor={'#64748B'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        {/* Filter/Sort Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, paddingHorizontal: 20 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sortType === 'date' ? '#19C6C1' : '#E6F8F7', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, marginRight: 4 }}
            onPress={() => setSortType('date')}
          >
            <Text style={{ color: sortType === 'date' ? '#fff' : '#19C6C1', fontWeight: '600' }}>Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sortType === 'name' ? '#19C6C1' : '#E6F8F7', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, marginRight: 4 }}
            onPress={() => setSortType('name')}
          >
            <Text style={{ color: sortType === 'name' ? '#fff' : '#19C6C1', fontWeight: '600' }}>Name</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sortOrder === 'asc' ? '#19C6C1' : '#E6F8F7', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, marginRight: 4 }}
            onPress={() => setSortOrder('asc')}
          >
            <Text style={{ color: sortOrder === 'asc' ? '#fff' : '#19C6C1', fontWeight: '600' }}>Asc</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sortOrder === 'desc' ? '#19C6C1' : '#E6F8F7', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20 }}
            onPress={() => setSortOrder('desc')}
          >
            <Text style={{ color: sortOrder === 'desc' ? '#fff' : '#19C6C1', fontWeight: '600' }}>Desc</Text>
          </TouchableOpacity>
        </View>
        {/* Certificate List */}
        <SectionList
          sections={certificates}
          keyExtractor={(item) => item.uri}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={60} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No certificates found
              </Text>
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                Tap the "+" button to add certificates
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
        {/* Add Certificate FAB (Light Mode) */}
        {!isDarkMode && (
          <TouchableOpacity
            style={{ position: 'absolute', bottom: 32, right: 32, backgroundColor: '#19C6C1', borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#19C6C1' }}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={32} color={'#fff'} />
          </TouchableOpacity>
        )}
        {/* Add Certificate Card (Dark Mode) */}
        {isDarkMode && (
          <View style={[styles.darkModeCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.darkModeCardTitle, { color: theme.text }]}>
              Add Certificate
            </Text>
            <TouchableOpacity
              style={[styles.darkModeCardButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="camera" size={20} color={theme.background} style={styles.darkModeCardIcon} />
              <Text style={[styles.darkModeCardButtonText, { color: theme.background }]}>
                Take Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.darkModeCardOutlineButton, { borderColor: theme.text }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="image" size={20} color={theme.text} style={styles.darkModeCardIcon} />
              <Text style={[styles.darkModeCardButtonText, { color: theme.text }]}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <AddCertificateModal />
        <NameCertificateModal />
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  modalOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  modalCancelButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalActionButtonText: {
    fontWeight: 'bold',
  },
});

export default CertificatesScreen;