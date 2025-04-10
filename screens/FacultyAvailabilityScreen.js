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
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

// Define the enhanced color scheme
const COLORS = {
  // Primary colors
  primary: '#1e40af', // Richer blue
  primaryLight: '#3b82f6', // Lighter blue
  primaryGradient: ['#1e40af', '#3b82f6'], // Blue gradient
  
  // Secondary colors
  secondary: '#ffffff', // White
  secondaryDark: '#f8fafc', // Very light gray
  secondaryGradient: ['#ffffff', '#f8fafc'], // Subtle white gradient
  
  // Accent colors
  accent: '#7c3aed', // Vibrant purple
  accentLight: '#a78bfa', // Light purple
  accentGradient: ['#7c3aed', '#a78bfa'], // Purple gradient
  
  // Text colors
  text: '#0f172a', // Dark blue-gray for primary text
  textSecondary: '#475569', // Gray for secondary text
  textLight: '#94a3b8', // Light gray for tertiary text
  
  // Background colors
  background: '#f1f5f9', // Light gray background
  backgroundDark: '#e2e8f0', // Slightly darker background for contrast
  backgroundGradient: ['#f1f5f9', '#e2e8f0'], // Background gradient
  
  // Status colors
  success: '#10b981', // Green
  successLight: '#d1fae5', // Light green background
  successGradient: ['#059669', '#10b981'], // Green gradient
  
  warning: '#f59e0b', // Amber
  warningLight: '#fef3c7', // Light amber background
  warningGradient: ['#d97706', '#f59e0b'], // Amber gradient
  
  error: '#ef4444', // Red
  errorLight: '#fee2e2', // Light red background
  errorGradient: ['#dc2626', '#ef4444'], // Red gradient
  
  // UI Element colors
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  divider: '#e2e8f0',
  inputBorder: '#cbd5e1',
  inputFocus: '#3b82f6',
  shadow: 'rgba(15, 23, 42, 0.1)',
  shimmer: ['#f6f7f8', '#edeef1', '#f6f7f8'], // For loading animations
};

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
const Card = ({ children, style }) => {
  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={COLORS.secondaryGradient}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

// Custom Dropdown component
const Dropdown = ({ label, value, options, onSelect, searchable = false, icon }) => {
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

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdownButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.dropdownButtonContent}>
          {icon && <View style={styles.dropdownIcon}>{icon}</View>}
          <Text 
            style={[
              styles.dropdownButtonText,
              value ? styles.dropdownButtonTextSelected : null
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value || `Select ${label}`}
          </Text>
        </View>
        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
          
            <View style={styles.modalContent}>
              <LinearGradient
                colors={COLORS.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>Select {label}</Text>
                <TouchableOpacity 
                  onPress={() => setVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.secondary} />
                </TouchableOpacity>
              </LinearGradient>
              
              {searchable && (
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    placeholder={`Search for ${label.toLowerCase()}...`}
                    placeholderTextColor={COLORS.textLight}
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
                      <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.optionItem,
                        value === option && styles.selectedOptionItem
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
                          value === option && styles.selectedOptionText
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {option}
                      </Text>
                      {value === option && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={40} color={COLORS.textLight} />
                    <Text style={styles.noResultsText}>No matching {label.toLowerCase()} found</Text>
                  </View>
                )}
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const FacultyAvailabilityScreen = () => {
  // State variables for tab selection
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' or 'room'

  // State variables for faculty availability
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);

  // State variables for empty room
  const [roomDay, setRoomDay] = useState('');
  const [roomTime, setRoomTime] = useState('');
  const [roomResult, setRoomResult] = useState(null);
  const [isQueryingRoom, setIsQueryingRoom] = useState(false);
  const [roomError, setRoomError] = useState(null);

  // Function to fetch empty room
  const handleEmptyRoomQuery = async () => {
    if (!roomDay || !roomTime) return;

    setIsQueryingRoom(true);
    setRoomError(null);
    setRoomResult(null);
    
    try {
      const response = await fetch(`https://faculty-availability-api.onrender.com/empty-rooms/?day=${roomDay}&time=${roomTime}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      setRoomResult(data);
    } catch (error) {
      console.error('Error in room query:', error);
      setRoomError(`Error fetching room data: ${error.message}. Please try again later.`);
    } finally {
      setIsQueryingRoom(false);
    }
  };
  
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
      return COLORS.successGradient;
    } else if (result.includes('busy')) {
      return COLORS.warningGradient;
    } else {
      return COLORS.errorGradient;
    }
  };

  const getStatusIcon = (result) => {
    if (!result) return null;
    if (result.includes('available')) {
      return <MaterialCommunityIcons name="account-check" size={24} color={COLORS.secondary} />;
    } else if (result.includes('busy')) {
      return <MaterialCommunityIcons name="account-clock" size={24} color={COLORS.secondary} />;
    } else {
      return <MaterialCommunityIcons name="account-cancel" size={24} color={COLORS.secondary} />;
    }
  };

  const statusColors = getStatusBackground(queryResult);
  const statusIcon = getStatusIcon(queryResult);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <LinearGradient
        colors={COLORS.primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Availability Checker</Text>
      </LinearGradient>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faculty' && styles.activeTab]}
          onPress={() => setActiveTab('faculty')}
        >
          <Text style={[styles.tabText, activeTab === 'faculty' && styles.activeTabText]}>Faculty Availability</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'room' && styles.activeTab]}
          onPress={() => setActiveTab('room')}
        >
          <Text style={[styles.tabText, activeTab === 'room' && styles.activeTabText]}>Empty Room</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={COLORS.backgroundGradient}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Faculty Availability Query Interface */}
          {activeTab === 'faculty' && (
            <Card style={styles.queryContainer}>
              <View style={styles.noticeContainer}>
  <Ionicons name="information-circle" size={20} color={COLORS.primary} />
  <Text style={styles.noticeText}>
    Any <Text style={styles.highlightedText}>unavailability of faculty </Text>due to any unforeseen reasons like <Text style={styles.highlightedText}>leave or meetings </Text>will not be reflected here
  </Text>
</View>
            <View style={styles.queryTitleContainer}>
              <MaterialCommunityIcons name="account-search" size={24} color={COLORS.primary} style={styles.queryTitleIcon} />
              <Text style={styles.queryTitle}>Find Faculty Availability</Text>
            </View>
            
            <Text style={styles.querySubtitle}>Where can I meet</Text>
            
            <View style={styles.queryForm}>
              {/* Faculty Dropdown with Loading State */}
              {isLoadingFaculty ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.shimmerContainer}>
                    <LinearGradient
                      colors={COLORS.shimmer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shimmer}
                    />
                  </View>
                  <Text style={styles.loadingText}>Loading faculty list...</Text>
                </View>
              ) : facultyError ? (
                <View style={styles.errorInfoContainer}>
                  <MaterialIcons name="error-outline" size={24} color={COLORS.error} style={styles.errorInfoIcon} />
                  <Text style={styles.errorInfoText}>{facultyError}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => {
                      // Reset faculty loading states and trigger useEffect again
                      setFacultyList([]);
                      setIsLoadingFaculty(true);
                      setFacultyError(null);
                      fetchFacultyList()
                        .then(list => {
                          setFacultyList(list);
                          setFacultyError(null);
                        })
                        .catch(err => {
                          setFacultyError('Failed to load faculty list. Please try again.');
                        })
                        .finally(() => {
                          setIsLoadingFaculty(false);
                        });
                    }}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Dropdown
                  label="Faculty"
                  value={selectedFaculty}
                  options={facultyList}
                  onSelect={setSelectedFaculty}
                  searchable={true}
                  icon={<MaterialCommunityIcons name="account-tie" size={18} color={COLORS.primary} />}
                />
              )}
              
              <Text style={styles.queryText}>on</Text>
              
              <Dropdown
                label="Day"
                value={selectedDay}
                options={WEEK_DAYS}
                onSelect={setSelectedDay}
                icon={<MaterialCommunityIcons name="calendar-week" size={18} color={COLORS.primary} />}
              />
              
              <Text style={styles.queryText}>after</Text>
              
              <Dropdown
                label="Time"
                value={selectedTime}
                options={TIME_SLOTS}
                onSelect={setSelectedTime}
                icon={<MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.primary} />}
              />
              
              <TouchableOpacity
                style={[
                  styles.queryButtonContainer,
                  (!selectedFaculty || !selectedDay || !selectedTime || isLoadingFaculty) && styles.queryButtonDisabled
                ]}
                onPress={handleFacultyQuery}
                disabled={!selectedFaculty || !selectedDay || !selectedTime || isQuerying || isLoadingFaculty}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(!selectedFaculty || !selectedDay || !selectedTime || isLoadingFaculty) 
                    ? [COLORS.textLight, COLORS.textLight] 
                    : COLORS.accentGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.queryButton}
                >
                  {isQuerying ? (
                    <ActivityIndicator size="small" color={COLORS.secondary} />
                  ) : (
                    <>
                      <Feather name="search" size={18} color={COLORS.secondary} style={styles.queryButtonIcon} />
                      <Text style={styles.queryButtonText}>Search</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Loading indicator */}
            {isQuerying && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Checking faculty availability...</Text>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <LinearGradient
                colors={COLORS.errorGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.errorContainer}
              >
                <MaterialIcons name="error-outline" size={22} color={COLORS.secondary} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </LinearGradient>
            )}

            {/* Query Result Card */}
            {(queryResult || error) && (
              <Card style={styles.resultCard}>
                {queryResult && (
                  <LinearGradient
                    colors={COLORS.successGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.resultHeader}
                  >
                    
                  </LinearGradient>
                )}
                <View style={styles.resultContent}>
                  {queryResult ? (
                    <LinearGradient
                      colors={COLORS.successGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.resultContainer}
                    >
                      <Text style={[styles.resultText, styles.resultTextLight]}>{queryResult}</Text>
                    </LinearGradient>
                  ) : error ? (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={24} color={COLORS.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            )}
            </Card>
          )}

          {/* Empty Room Query Interface */}
          {activeTab === 'room' && (
            <Card style={styles.queryContainer}>
              <View style={styles.queryTitleContainer}>
                <MaterialCommunityIcons name="door-open" size={24} color={COLORS.primary} style={styles.queryTitleIcon} />
                <Text style={styles.queryTitle}>Find Empty Room</Text>
              </View>

              <View style={styles.queryForm}>
                <Dropdown
                  label="Day"
                  value={roomDay}
                  options={WEEK_DAYS}
                  onSelect={setRoomDay}
                  icon={<MaterialCommunityIcons name="calendar-week" size={18} color={COLORS.primary} />}
                />

                <Dropdown
                  label="Time"
                  value={roomTime}
                  options={TIME_SLOTS}
                  onSelect={setRoomTime}
                  icon={<MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.primary} />}
                />

                <TouchableOpacity
                  style={[
                    styles.queryButtonContainer,
                    (!roomDay || !roomTime) && styles.queryButtonDisabled
                  ]}
                  onPress={handleEmptyRoomQuery}
                  disabled={!roomDay || !roomTime || isQueryingRoom}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={(!roomDay || !roomTime) 
                      ? [COLORS.textLight, COLORS.textLight] 
                      : COLORS.accentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.queryButton}
                  >
                    {isQueryingRoom ? (
                      <ActivityIndicator size="small" color={COLORS.secondary} />
                    ) : (
                      <>
                        <Feather name="search" size={18} color={COLORS.secondary} style={styles.queryButtonIcon} />
                        <Text style={styles.queryButtonText}>Search</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Loading indicator */}
              {isQueryingRoom && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Searching for empty rooms...</Text>
                </View>
              )}

              {/* Error Message */}
              {roomError && (
                <LinearGradient
                  colors={COLORS.errorGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.errorContainer}
                >
                  <MaterialIcons name="error-outline" size={22} color={COLORS.secondary} style={styles.errorIcon} />
                  <Text style={styles.errorText}>{roomError}</Text>
                </LinearGradient>
              )}

              {/* Room Result */}
              {roomResult && (
                <Card style={styles.resultCard}>
                  <LinearGradient
                    colors={COLORS.successGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.resultHeader}
                  >
                    
                  </LinearGradient>
                  <View style={styles.resultContent}>
                    <LinearGradient
                      colors={COLORS.successGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.resultContainer}
                    >
                      <Text style={[styles.resultText, styles.resultTextLight]}>
                        Room {roomResult.free_room} is free from {roomResult.time} on {roomResult.day}
                      </Text>
                    </LinearGradient>
                  </View>
                </Card>
              )}
            </Card>
          )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Card style={styles.queryCard}>
                <View style={styles.dropdownsContainer}>
                  <Dropdown
                    label="Day"
                    value={roomDay}
                    options={WEEK_DAYS}
                    onSelect={setRoomDay}
                    icon={<MaterialIcons name="calendar-today" size={20} color={COLORS.textSecondary} />}
                  />
                  <Dropdown
                    label="Time"
                    value={roomTime}
                    options={TIME_SLOTS}
                    onSelect={setRoomTime}
                    icon={<MaterialIcons name="access-time" size={20} color={COLORS.textSecondary} />}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.queryButton, (!roomDay || !roomTime) && styles.queryButtonDisabled]}
                  onPress={handleRoomSearch}
                  disabled={!roomDay || !roomTime || isSearchingRoom}
                >
                  {isSearchingRoom ? (
                    <ActivityIndicator color={COLORS.secondary} />
                  ) : (
                    <>
                      <MaterialIcons name="search" size={20} color={COLORS.secondary} />
                      <Text style={styles.queryButtonText}>Search Empty Room</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Card>

              {/* Room Search Result Card */}
              {(roomResult || roomError) && (
                <Card style={styles.resultCard}>
                  <LinearGradient
                    colors={COLORS.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.resultHeader}
                  >
                    <View style={styles.resultIconContainer}>
                      <MaterialIcons name="meeting-room" size={24} color={COLORS.secondary} />
                    </View>
                    <Text style={styles.resultHeaderText}>Room Status</Text>
                  </LinearGradient>
                  <View style={styles.resultContent}>
                    {roomResult ? (
                      <Text style={styles.resultText}>{roomResult}</Text>
                    ) : roomError ? (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error-outline" size={24} color={COLORS.error} />
                        <Text style={styles.errorText}>{roomError}</Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        

};

const styles = StyleSheet.create({
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
 container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  backgroundGradient: {
    flex: 1,
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  } 
  // Card Styles
  ,
  card: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 16,
  },
  // Query Interface Styles
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
    color: COLORS.primary,
    textAlign: 'center',
  },
  querySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  queryForm: {
    marginBottom: 16,
  },
  queryText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginVertical: 5,
    fontWeight: '500',
    textAlign: 'center',
  },
  queryButtonContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.shadow,
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
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 16,
  },
  resultWrapper: {
    marginTop: 16,
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.shadow,
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
    color: COLORS.text,
    textAlign: 'center',
    marginVertical: 8,
  },
  resultTextLight: {
    color: COLORS.secondary,
  },
  resultContainer: {
    padding: 8,
    width: '115%',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: 12,
    shadowColor: COLORS.shadow,
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
  // Dropdown Styles
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdownLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
    marginLeft: 4,
  },
  dropdownButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: COLORS.textLight,
    flex: 1,
  },
  dropdownButtonTextSelected: {
    color: COLORS.text,
    fontWeight: '500',
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
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '75%',
    elevation: 6,
    shadowColor: COLORS.shadow,
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
    color: COLORS.secondary,
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
    borderBottomColor: COLORS.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOptionItem: {
    backgroundColor: COLORS.accent + '10', // 10% opacity
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  cancelButton: {
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
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
    backgroundColor: COLORS.backgroundDark,
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
    color: COLORS.primary,
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
    color: COLORS.secondary,
    fontSize: 14,
    flex: 1,
  },
  errorInfoContainer: {
    padding: 12,
    backgroundColor: COLORS.errorLight,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
  },
  errorInfoIcon: {
    marginBottom: 8,
  },
  errorInfoText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.secondary,
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
    color: COLORS.primary,
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
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: COLORS.shadow,
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
    borderLeftColor: COLORS.primary,
  },
  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.text,
  },highlightedText: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  instructionNumberText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  instructionsText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: COLORS.text,
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
    color: COLORS.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
});

export default FacultyAvailabilityScreen;