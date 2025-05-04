import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Dimensions,
  StatusBar,
  useColorScheme
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

// Mock data for dropdowns
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// Function to call real API endpoint
const fetchFacultyAvailability = async (facultyName, weekDay, time) => {
  try {
    // Remove the "Sir" suffix before sending to API
    const cleanName = facultyName.replace(' Sir', '');
    
    const apiUrl = `https://faculty-availability-api.onrender.com/faculty-schedule?faculty_name=${cleanName}&day=${weekDay}&time=${time}`;
    console.log('Calling API:', apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response:', data);
    
    // Format the response into a user-friendly message
    if (data.faculty && data.cabin && data.slot) {
      return `You can meet ${data.faculty} in cabin ${data.cabin} from ${data.slot}`;
    } else if (data.schedule) {
      return data.schedule;
    }
    return 'Faculty availability information not found.';
  } catch (error) {
    console.error('Error fetching faculty availability:', error);
    throw error;
  }
};

// Function to fetch faculty list from API
const fetchFacultyList = async () => {
  try {
    const response = await fetch('https://faculty-availability-api.onrender.com/faculty_list');
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // The API returns a direct array, not a JSON object with a faculty_list property
    const data = await response.json();
    
    // Add "Sir" suffix to each faculty name
  
    return data;
  } catch (error) {
    console.error('Error fetching faculty list:', error);
    throw error;
  }
};

// Custom Card component for sections
const Card = ({ children, style, theme }) => (
  <View style={[{ borderRadius: 18, backgroundColor: theme.surface, padding: 18, marginBottom: 18 }, style]}>
    {children}
  </View>
);

// Custom Dropdown component
const Dropdown = ({ label, value, options, onSelect, searchable = false, icon, theme }) => {
  const [visible, setVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const inputRef = React.useRef(null);

  // Filter options based on search text
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => 
        option.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchText, options]);

  // Reset search when modal is closed
  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  // Focus input when modal opens (if searchable)
  useEffect(() => {
    if (visible && searchable && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300); // Delay to ensure modal is fully open
    }
  }, [visible, searchable]);

  // Theme-aware background and border
  const isDark = theme.background === '#0f172a';
  const dropdownBg = isDark ? theme.surface : theme.surface;
  const dropdownBorder = isDark ? theme.border : theme.border;
  const dropdownText = isDark ? theme.text : theme.text;
  const dropdownPlaceholder = isDark ? theme.textSecondary : theme.textSecondary;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 6, fontWeight: '500', marginLeft: 4 }}>{label}</Text>
      <TouchableOpacity 
        style={{
          backgroundColor: dropdownBg,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: dropdownBorder,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          elevation: 0,
        }}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {icon && <View style={{ marginRight: 10 }}>{icon}</View>}
          <Text 
            style={{
              fontSize: 15,
              color: value ? dropdownText : dropdownPlaceholder,
              fontWeight: value ? '600' : '400',
              flex: 1,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value || `Select ${label}`}
          </Text>
        </View>
        <MaterialIcons name="arrow-drop-down" size={24} color={dropdownPlaceholder} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <LinearGradient
                colors={[theme.primary, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.modalHeader, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modalTitle, { color: '#FFFFFF', fontWeight: '600' }]}>Select {label}</Text>
                <TouchableOpacity 
                  onPress={() => setVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </LinearGradient>
              
              {searchable && (
                <View style={[styles.searchContainer, { 
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderWidth: 1,
                  marginHorizontal: 16,
                  marginVertical: 12,
                  borderRadius: 8
                }]}>
                  <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    ref={inputRef}
                    style={[styles.searchInput, { 
                      color: theme.text,
                      fontSize: 15,
                      paddingVertical: 8
                    }]}
                    placeholder={`Search for ${label.toLowerCase()}...`}
                    placeholderTextColor={theme.textSecondary}
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity 
                      style={styles.clearButton}
                      onPress={() => setSearchText('')}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <ScrollView style={[styles.optionsList, { maxHeight: 300 }]} showsVerticalScrollIndicator={false}>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.optionItem,
                        { 
                          borderBottomColor: theme.border,
                          backgroundColor: value === option ? (theme.background === '#0f172a' ? theme.primary + '55' : theme.primaryLight + '55') : 'transparent',
                          borderLeftWidth: value === option ? 4 : 0,
                          borderLeftColor: value === option ? (theme.background === '#0f172a' ? theme.primary : theme.primaryLight) : 'transparent',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginHorizontal: 8,
                          borderRadius: 8,
                          marginVertical: 4
                        }
                      ]}
                      onPress={() => {
                        onSelect(option);
                        setVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text 
                        style={[
                          styles.optionText,
                          { 
                            color: value === option ? (theme.background === '#0f172a' ? theme.primaryLight : theme.primary) : (theme.background === '#0f172a' ? theme.text : theme.text),
                            fontWeight: value === option ? 'bold' : '400',
                            fontSize: 15
                          }
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {option}
                      </Text>
                      {value === option && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.noResultsContainer, { padding: 24 }]}>
                    <Ionicons name="search-outline" size={40} color={theme.textSecondary} />
                    <Text style={[styles.noResultsText, { 
                      color: theme.textSecondary,
                      marginTop: 12,
                      fontSize: 15
                    }]}>No matching {label.toLowerCase()} found</Text>
                  </View>
                )}
              </ScrollView>
              
              <TouchableOpacity 
                style={[styles.cancelButton, { 
                  backgroundColor: theme.primary,
                  borderWidth: 1,
                  borderColor: theme.primary
                }]}
                onPress={() => setVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { 
                  color: '#FFFFFF',
                  fontWeight: '600'
                }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// Add a helper for status banners
const StatusBanner = ({ type, text, theme }) => {
  let icon, bg, fg, borderColor;
  if (type === 'warning') {
    icon = <MaterialIcons name="warning" size={22} color={theme.warning} style={{ marginRight: 10 }} />;
    bg = theme.warningBackground;
    fg = theme.warningText;
    borderColor = theme.warning;
  } else if (type === 'success') {
    icon = <MaterialIcons name="check-circle" size={22} color={theme.success} style={{ marginRight: 10 }} />;
    bg = theme.successBackground;
    fg = theme.successText;
    borderColor = theme.success;
  } else if (type === 'busy') {
    icon = <MaterialIcons name="schedule" size={22} color={theme.warning} style={{ marginRight: 10 }} />;
    bg = theme.warningBackground;
    fg = theme.warningText;
    borderColor = theme.warning;
  } else if (type === 'error') {
    icon = <MaterialIcons name="error-outline" size={22} color={theme.error} style={{ marginRight: 10 }} />;
    bg = theme.errorBackground;
    fg = theme.errorText;
    borderColor = theme.error;
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, padding: 14, borderRadius: 12, marginBottom: 16, marginHorizontal: 0, borderWidth: 0, borderColor, minHeight: 48 }}>
      {icon}
      <Text style={{ color: fg, fontWeight: '600', fontSize: 15, flex: 1 }}>{text}</Text>
    </View>
  );
};

const FacultyAvailabilityScreen = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const navigation = useNavigation();

  // State variables for tab selection
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' or 'room'

  // State variables for faculty availability
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);

  // New state variables for faculty list
  const [facultyList, setFacultyList] = useState([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);
  const [facultyError, setFacultyError] = useState(null);

  // Fetch faculty list when component mounts
  useEffect(() => {
    const loadFacultyList = async () => {
      try {
        setIsLoadingFaculty(true);
        setFacultyError(null);
        const list = await fetchFacultyList();
        setFacultyList(list);
      } catch (error) {
        console.error('Failed to load faculty list:', error);
        setFacultyError('Failed to load faculty list. Please try again later.');
      } finally {
        setIsLoadingFaculty(false);
      }
    };

    loadFacultyList();
  }, []);

  // Handle the faculty availability query
  const handleFacultyQuery = async () => {
    if (!selectedFaculty || !selectedDay || !selectedTime) {
      // Alert the user to complete all fields
      return;
    }

    setIsQuerying(true);
    setError(null);
    setQueryResult(null);
    
    try {
      // Call the real API endpoint
      const response = await fetchFacultyAvailability(selectedFaculty, selectedDay, selectedTime);
      setQueryResult(response);
    } catch (error) {
      console.error('Error in faculty query:', error);
      setError(`Error fetching availability data: ${error.message}. Please try again later.`);
    } finally {
      setIsQuerying(false);
    }
  };

  const getStatusBackground = (result) => {
    if (!result) return null;
    if (result.includes('can meet')) {
      return theme.successGradient;
    } else if (result.includes('busy')) {
      return theme.warningGradient;
    } else {
      return theme.errorGradient;
    }
  };

  const getStatusIcon = (result) => {
    if (!result) return null;
    if (result.includes('available')) {
      return <MaterialCommunityIcons name="account-check" size={24} color={theme.secondary} />;
    } else if (result.includes('busy')) {
      return <MaterialCommunityIcons name="account-clock" size={24} color={theme.secondary} />;
    } else {
      return <MaterialCommunityIcons name="account-cancel" size={24} color={theme.secondary} />;
    }
  };

  const statusColors = getStatusBackground(queryResult);
  const statusIcon = getStatusIcon(queryResult);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar backgroundColor={theme.background} barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={{ backgroundColor: theme.surface, paddingTop: 18, paddingBottom: 12, paddingHorizontal: 0, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', left: 18, top: 18, zIndex: 2 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, textAlign: 'center', flex: 1 }}>Availability Checker</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 0, backgroundColor: theme.background, minHeight: '100%' }}>
        {/* Info/alert message */}
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.surface, borderRadius: 12, padding: 10, marginBottom: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '400', marginBottom: 0, marginLeft: 0 }}>
                Check faculty availability for meetings and consultations
              </Text>
            </View>
          </View>
          {/* Warning banner if not all fields are selected */}
          {(!selectedFaculty || !selectedDay || !selectedTime) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.warningBackground, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 18 }}>
              <MaterialIcons name="warning" size={22} color={theme.warning} style={{ marginRight: 10 }} />
              <Text style={{ color: theme.warningText, fontWeight: '600', fontSize: 15, flex: 1 }}>
              Any <Text style={styles.highlightedText}>unavailability of faculty </Text>due to any unforeseen reasons like <Text style={styles.highlightedText}>leave or meetings </Text>will not be reflected here

              </Text>
            </View>
          )}
        </View>
        {/* Card for dropdowns and search */}
        <View style={{ backgroundColor: theme.surface, borderRadius: 18, marginHorizontal: 18, padding: 18, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
          
          <Dropdown
            label="Faculty"
            value={selectedFaculty}
            options={facultyList}
            onSelect={setSelectedFaculty}
            searchable={true}
            icon={<MaterialIcons name="account-circle" size={20} color={theme.success} />}
            theme={theme}
          />
          <Dropdown
            label="Day"
            value={selectedDay}
            options={WEEK_DAYS}
            onSelect={setSelectedDay}
            icon={<MaterialIcons name="calendar-today" size={20} color={theme.primaryLight} />}
            theme={theme}
          />
          <Dropdown
            label="Time"
            value={selectedTime}
            options={TIME_SLOTS}
            onSelect={setSelectedTime}
            icon={<MaterialIcons name="schedule" size={20} color={theme.textSecondary} />}
            theme={theme}
          />
          {/* Search button */}
          <TouchableOpacity
            style={{
              marginTop: 10,
              borderRadius: 12,
              overflow: 'hidden',
              width: '100%',
              marginBottom: 8,
              backgroundColor: '#249CA7',
              alignItems: 'center',
              justifyContent: 'center',
              height: 48,
              opacity: 1,
            }}
            onPress={() => {
              if (selectedFaculty && selectedDay && selectedTime && !isQuerying && !isLoadingFaculty) {
                handleFacultyQuery();
              }
            }}
            activeOpacity={0.8}
          >
            {isQuerying ? (
              <ActivityIndicator size="small" color={'#fff'} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="search" size={18} color={'#fff'} style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Search</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Status cards */}
        <View style={{ marginHorizontal: 18 }}>
          {error && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.errorBackground, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 14 }}>
              <MaterialIcons name="error-outline" size={22} color={theme.error} style={{ marginRight: 10 }} />
              <Text style={{ color: theme.errorText, fontWeight: '600', fontSize: 15, flex: 1 }}>{error}</Text>
            </View>
          )}
          {queryResult && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor:
                queryResult.includes('can meet') ? theme.successBackground :
                queryResult.includes('busy') ? theme.warningBackground :
                theme.errorBackground,
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 14,
            }}>
              {queryResult.includes('can meet') && <MaterialIcons name="check-circle" size={22} color={theme.success} style={{ marginRight: 10 }} />}
              {queryResult.includes('busy') && <MaterialIcons name="schedule" size={22} color={theme.warning} style={{ marginRight: 10 }} />}
              {!queryResult.includes('can meet') && !queryResult.includes('busy') && <MaterialIcons name="error-outline" size={22} color={theme.error} style={{ marginRight: 10 }} />}
              <Text style={{
                color:
                  queryResult.includes('can meet') ? theme.successText :
                  queryResult.includes('busy') ? theme.warningText :
                  theme.errorText,
                fontWeight: '600',
                fontSize: 15,
                flex: 1,
              }}>{queryResult}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  backgroundGradient: {
    flex: 1,
  },
  queryContainer: {
    marginBottom: 8,
  },
  queryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  queryTitleIcon: {
    marginRight: 8,
  },
  queryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  querySubtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  queryForm: {
    marginBottom: 16,
  },
  queryText: {
    fontSize: 16,
    color: '#475569',
    marginVertical: 5,
    fontWeight: '500',
    textAlign: 'center',
  },
  queryButtonContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  queryButton: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queryButtonDisabled: {
    opacity: 0.7,
  },
  queryButtonIcon: {
    marginRight: 8,
  },
  queryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  resultWrapper: {
    marginTop: 16,
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  queryResultContainer: {
    padding: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIconContainer: {
    marginRight: 10,
  },
  availabilityText: {
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginVertical: 8,
  },
  resultTextLight: {
    color: '#fff',
  },
  resultContainer: {
    padding: 8,
    width: '115%',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityContainer: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '75%',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOptionItem: {
    backgroundColor: '#7c3aed10', // 10% opacity
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  selectedOptionText: {
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  cancelButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginVertical: 5,
  },
  shimmerContainer: {
    height: 20,
    width: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  errorContainer: {
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  errorInfoContainer: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
  },
  errorInfoIcon: {
    marginBottom: 8,
  },
  errorInfoText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  instructionsContainer: {
    marginTop: 0,
  },
  instructionsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionsTitleIcon: {
    marginRight: 8,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  instructionsContent: {
    paddingLeft: 6,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    borderLeftColor: '#7c3aed',
  },
  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#000',
  },
  highlightedText: {
    fontWeight: 'bold',
    color: '#B7791F',
  },
  instructionNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  instructionsText: {
    fontSize: 15,
    color: '#000',
    flex: 1,
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 4,
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  resultCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  resultHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultContent: {
    padding: 16,
  },
});

export default FacultyAvailabilityScreen;