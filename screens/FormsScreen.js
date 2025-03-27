import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/Colors';
import { StatusBar } from 'react-native';

const FormsScreen = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://faculty-availability-api.onrender.com/list-objects/?folder=Forms');
        const data = await response.json();
        const formattedForms = data.files.map((file, index) => ({
          id: String(index + 1),
          title: file.file_name.replace(/-/g, ' '),
          url: file.public_url
        }));
        setForms(formattedForms);
      } catch (error) {
        console.error('Error fetching forms:', error);
        Alert.alert('Error', 'Unable to load forms. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);


  const filteredForms = forms.filter(form =>
    form.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = async (url) => {
    try {
      setLoading(true);
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error downloading form:', error);
      Alert.alert('Error', 'Unable to download the form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderFormItem = ({ item }) => (
    <TouchableOpacity
      style={styles.formCard}
      onPress={() => handleDownload(item.url)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="document-text" size={32} color={COLORS.primary} />
      </View>
      <View style={styles.formInfo}>
        <Text style={styles.formTitle}>{item.title}</Text>
        <Text style={styles.downloadText}>Tap to download</Text>
      </View>
      <Ionicons name="download-outline" size={24} color={COLORS.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Forms</Text>
        <Text style={styles.headerSubtitle}>Access University Forms</Text>
      </LinearGradient>
      <TextInput
        style={styles.searchInput}
        placeholder="Search forms..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={COLORS.textSecondary}
      />

      {selectedForm && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={!!selectedForm}
          onRequestClose={() => setSelectedForm(null)}>
          <View style={styles.modalContainer}>
            <WebView
              source={{ uri: selectedForm.url }}
              style={styles.webview}
              startInLoadingState={true}
              renderLoading={() => (
                <ActivityIndicator
                  color={COLORS.primary}
                  size="large"
                  style={styles.loadingIndicator}
                />
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedForm(null)}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      <FlatList
        data={filteredForms}
        renderItem={renderFormItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
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
    shadowColor: COLORS.shadow,
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
    textAlignHorizontal:'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  listContainer: {
    padding: 14,
  },
  formCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '10'
  },
  formInfo: {
    flex: 1,
    marginRight: 8
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  downloadText: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  searchInput: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: COLORS.text,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  webview: {
    flex: 1
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 10,
    right: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }]
  },
  
  formInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  downloadText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
  },
  loadingIndicator: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    color: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  webview: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 48 : 24,
    backgroundColor: COLORS.secondary,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight + 16,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  }
});
export default FormsScreen;