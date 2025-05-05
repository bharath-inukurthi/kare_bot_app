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
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const FormsScreen = ({ navigation }) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);

  const { isDarkMode, theme } = useTheme();

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
      style={[
        styles.formCard,
        isDarkMode && styles.formCardDark
      ]}
      onPress={() => handleDownload(item.url)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="document-text" size={24} color="#FF4444" />
      </View>
      <View style={styles.formInfo}>
        <Text style={[
          styles.formTitle,
          isDarkMode && styles.formTitleDark
        ]}>
          {item.title}
        </Text>
      </View>
      <Ionicons name="download-outline" size={24} color="#00BFA5" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode && styles.containerDark
    ]}>
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
            Forms
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
          Download university forms & documents
        </Text>
      </View>

      {/* Search Bar */}
      <View style={{ 
        paddingHorizontal: 20, 
        marginTop: 18, 
        marginBottom: 8,
        backgroundColor: isDarkMode ? '#101828' : '#F8FAFC',
      }}>
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
        placeholder="Search forms..."
            placeholderTextColor={isDarkMode ? '#A0AEC0' : '#64748B'}
        value={searchQuery}
        onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={isDarkMode ? '#A0AEC0' : '#64748B'} 
              />
            </TouchableOpacity>
      )}
        </View>
      </View>

      <FlatList
        data={filteredForms}
        renderItem={renderFormItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="document-text-outline" 
                size={60} 
                color={isDarkMode ? '#4A4A4A' : '#DEDEDE'} 
              />
              <Text style={[
                styles.emptyText,
                isDarkMode && styles.emptyTextDark
              ]}>
                {searchQuery ? "No matching forms" : "No forms available"}
              </Text>
            </View>
          )
        }
      />

      {loading && (
        <View style={[
          styles.loadingOverlay,
          isDarkMode && styles.loadingOverlayDark
        ]}>
          <ActivityIndicator size="large" color="#19C6C1" />
    </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#101828',
  },
  listContainer: {
    padding: 16,
  },
  formCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formCardDark: {
    backgroundColor: '#1A2536',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 20,
  },
  formInfo: {
    flex: 1,
    marginRight: 8,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
  },
  formTitleDark: {
    color: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#A0AEC0',
  },
});

export default FormsScreen;