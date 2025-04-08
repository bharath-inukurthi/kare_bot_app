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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing'; // Added missing import
import { COLORS } from '../constants/Colors';

const CertificatesScreen = ({ navigation }) => {
  const [rawCertificates, setRawCertificates] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const CERTIFICATES_DIRECTORY = FileSystem.documentDirectory + 'certificates/';
  const EXTERNAL_DIRECTORY = FileSystem.cacheDirectory + 'certificates/';

  useEffect(() => {
    setupCertificatesDirectory();
    loadCertificates();
  }, []);

  useEffect(() => {
    processAndSortCertificates();
  }, [searchQuery, sortType, sortOrder, rawCertificates]);

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

  const showAddOptions = () => {
    Alert.alert(
      'Add Certificate',
      'Select the method to add a certificate',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Scan Document', onPress: scanDocument },
        { text: 'Choose from Gallery', onPress: selectFromGallery },
      ]
    );
  };

  const scanDocument = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to scan documents');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 1,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleImageSelection(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Document scanning failed');
    }
  };

  const selectFromGallery = async () => {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newStatus !== 'granted') return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 1,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleImageSelection(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image from gallery');
    }
  };

  const handleImageSelection = async (uri) => {
    const filename = await promptForFileName();
    if (filename) {
      await saveCertificate(uri, filename);
      loadCertificates();
    }
  };

  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [tempFileName, setTempFileName] = useState('');
  const [fileNameResolver, setFileNameResolver] = useState(null);

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

  const saveCertificate = async (uri, filename) => {
    try {
      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library access is needed to save certificates');
        return;
      }

      // First save to app's directory for management
      const destination = CERTIFICATES_DIRECTORY + filename;
      await FileSystem.copyAsync({ from: uri, to: destination });

      // Get file info to check if it exists and is accessible
      const fileInfo = await FileSystem.getInfoAsync(destination);
      if (!fileInfo.exists) {
        throw new Error('Failed to save file to app directory');
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(destination);
      if (!asset) {
        throw new Error('Failed to create asset in media library');
      }

      // Create or get the album
      const albumName = 'KareBot Certificates';
      let album = await MediaLibrary.getAlbumAsync(albumName);
      
      if (!album) {
        // Create new album with the saved asset
        album = await MediaLibrary.createAlbumAsync(albumName, asset);
      } else {
        // Add the asset to the existing album
        await MediaLibrary.addAssetsToAlbumAsync([asset], album);
      }

      // Verify the asset was saved correctly
      const savedAsset = await MediaLibrary.getAssetInfoAsync(asset);
      if (!savedAsset) {
        throw new Error('Failed to verify saved asset');
      }
      
      Alert.alert('Success', 'Certificate saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save certificate: ' + error.message);
    }
  };

  const viewCertificate = async (uri) => {
    try {
      // Check if file exists first
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Certificate file not found');
        return;
      }

      // Check if sharing is available (for Android)
      if (Platform.OS === 'android') {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (!isSharingAvailable) {
          Alert.alert('Error', 'Sharing is not available on this device');
          return;
        }
      }

      // Request media library permissions if needed
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library access is needed to view certificates');
        return;
      }

      // Open the image in the native photo viewer
      if (Platform.OS === 'ios') {
        await Linking.openURL(uri);
      } else {
        // For Android, use expo-sharing to open in default viewer
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'View Certificate'
        });
      }
    } catch (error) {
      console.error('View error:', error);
      Alert.alert('Error', 'Cannot open certificate. Please try again.');
    }
  };

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

  const handleSearch = (text) => setSearchQuery(text);

  const toggleSortType = () => setSortType(prev => prev === 'date' ? 'name' : 'date');
  const toggleSortOrder = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.certificateCard}
      onPress={() => viewCertificate(item.uri)} // Direct viewing on click
      onLongPress={() => Alert.alert(
        'Certificate Actions',
        'Choose an action',
        [
          { text: 'Cancel' },
          { text: 'Delete', onPress: () => deleteCertificate(item.uri), style: 'destructive' },
          { text: 'Share', onPress: () => viewCertificate(item.uri) },
        ]
      )}
    >
      <Ionicons name="document-text" size={32} color={COLORS.primary} />
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Certificates</Text>
      </LinearGradient>

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

      <View style={styles.controlsContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search certificates..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={COLORS.textSecondary}
        />
        <View style={styles.sortControls}>
          <TouchableOpacity style={styles.sortButton} onPress={toggleSortType}>
            <Ionicons name={sortType === 'date' ? 'calendar' : 'text'} size={20} color={COLORS.primary} />
            <Text style={styles.sortButtonText}>{sortType === 'date' ? 'Date' : 'Name'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={toggleSortOrder}>
            <Ionicons name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={20} color={COLORS.primary} />
            <Text style={styles.sortButtonText}>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={showAddOptions}>
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.sortButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
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
    </View>
  );
};

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
  certificateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 16,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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
});

export default CertificatesScreen;