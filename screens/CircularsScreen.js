import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  FlatList,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Alert } from 'react-native';
import { COLORS } from '../constants/Colors';
import { fetch } from 'expo/fetch';
import { useTheme } from '../context/ThemeContext';
import { Button } from 'react-native-paper';

const CircularsScreen = ({ navigation }) => {
  const [circulars, setCirculars] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFullScreenLoading, setShowFullScreenLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedCircular, setSelectedCircular] = useState(null);

  // Animation value for loading indicator
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  // Refs
  const isMounted = useRef(true);
  const fetchControllerRef = useRef(null);
  const receivedCount = useRef(0);
  const dataByGroupRef = useRef({});

  const { isDarkMode, theme } = useTheme();

  // Helper function to parse date string in "month_name-year-day" format
  const parseDateString = (dateString) => {
    if (!dateString) return null;
    
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    if (isNaN(year) || isNaN(day) || monthMap[monthName] === undefined) {
      return null;
    }
    
    return new Date(year, monthMap[monthName], day);
  };

  // Helper to extract month from date string
  const getMonthFromDateString = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    return parts.length >= 1 ? parts[0] : null;
  };

  // Helper to extract year from date string
  const getYearFromDateString = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    return parts.length >= 2 ? parseInt(parts[1]) : null;
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchCirculars();
  }, []);

  // Memoize the processAndSortCirculars function to prevent unnecessary executions
  const processAndSortCirculars = useCallback((data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      setCirculars([]);
      return;
    }

    // Filter based on search query
    let filteredData = data;
    if (searchQuery) {
      filteredData = data.filter(item =>
        item.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Define month order for proper sorting
    const monthOrder = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };

    // Group and sort data
    if (sortType === 'date') {
      // Use the pre-sorted data from dataByGroupRef
      let groupedData = { ...dataByGroupRef.current };
      
      // If empty (first render or after filter change), rebuild the groups
      if (Object.keys(groupedData).length === 0) {
        filteredData.forEach(item => {
          if (!item.date) return;
  
          const month = getMonthFromDateString(item.date);
          const year = getYearFromDateString(item.date);
          
          if (!month || !year) return;
          
          const key = `${year} ${month}`;
  
          if (!groupedData[key]) {
            groupedData[key] = {
              title: `${month} ${year}`,
              month: month,
              year: year,
              data: []
            };
          }
  
          // Add to the group (it will be sorted later)
          groupedData[key].data.push(item);
        });
      }

      // Sort items within each month group
      Object.values(groupedData).forEach(group => {
        group.data.sort((a, b) => {
          const dateA = parseDateString(a.date);
          const dateB = parseDateString(b.date);
          
          // Handle null dates
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
      });

      // Convert to array and sort by year first, then by month
      const result = Object.values(groupedData);
      result.sort((a, b) => {
        // First sort by year
        if (a.year !== b.year) {
          return sortOrder === 'desc' ? b.year - a.year : a.year - b.year;
        }
        // Then by month
        return sortOrder === 'desc'
          ? monthOrder[b.month] - monthOrder[a.month]
          : monthOrder[a.month] - monthOrder[b.month];
      });

      setCirculars(result);
    } else {
      // Sort and group by name
      const sortedData = [...filteredData].sort((a, b) => {
        const nameA = a.filename?.toLowerCase() || '';
        const nameB = b.filename?.toLowerCase() || '';
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });

      // Group by first letter
      const grouped = {};
      sortedData.forEach(item => {
        if (!item.filename) return;
        const letter = item.filename[0].toUpperCase();
        if (!grouped[letter]) {
          grouped[letter] = {
            title: letter,
            data: []
          };
        }
        grouped[letter].data.push(item);
      });

      // Convert to array and sort alphabetically
      const result = Object.values(grouped);
      result.sort((a, b) => {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      });

      setCirculars(result);
    }
  }, [searchQuery, sortType, sortOrder]);

  // Run processing whenever dependencies change
  useEffect(() => {
    processAndSortCirculars(originalData);
  }, [originalData, searchQuery, sortType, sortOrder, processAndSortCirculars]);

  // Reset grouped data when sort type or order changes
  useEffect(() => {
    dataByGroupRef.current = {};
  }, [sortType, sortOrder, searchQuery]);

  const fetchCirculars = async () => {
    setLoading(true);
    setInitialLoading(true);
    setShowFullScreenLoading(true);
    setLoadingProgress(0);
    setOriginalData([]);
    receivedCount.current = 0;
    dataByGroupRef.current = {}; // Reset grouped data
  
    loadingOpacity.setValue(1);
  
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
  
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    
    const apiUrl = `https://faculty-availability-api.onrender.com/stream-circulars?t=${Date.now()}`;
  
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        signal: controller.signal
      });
  
      if (!response.ok || !response.body) {
        throw new Error(`HTTP error: ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
  
      while (true) {
        const { done, value } = await reader.read();
  
        if (done) {
          // Stream has finished - mark loading as complete
          if (isMounted.current) {
            setLoading(false);
            setInitialLoading(false);
            setShowFullScreenLoading(false);
          }
          break;
        }
  
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
  
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.slice(5).trim(); // 'data:' is 5 chars
              const json = JSON.parse(jsonStr);
              handleNewItem(json);
            } catch (err) {
              console.warn('Error parsing line:', line);
            }
          }
        }
  
        buffer = lines[lines.length - 1];
      }
    } catch (err) {
      if (!controller.signal.aborted && isMounted.current) {
        console.error('Fetch error:', err.message);
        setLoading(false);
        setInitialLoading(false);
        setShowFullScreenLoading(false);
  
        if (receivedCount.current === 0) {
          Alert.alert('Fetch Failed', `${err.message}`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => fetchCirculars() }
          ]);
        }
      }
    }
  };
  
  const handleNewItem = (data) => {
    // Increment received count
    receivedCount.current += 1;
    
    // Ensure all required fields exist with defaults if missing
    const processedData = {
      filename: data.filename || 'Unnamed Document',
      url: data.url || '',
      date: data.date || 'Unknown Date',
      ...data // Keep any other fields
    };

    // Add to original data
    setOriginalData(prev => [...prev, processedData]);
    setLoadingProgress(prev => prev + 1);

    // Insert into organized data structure for date sorting
    if (processedData.date) {
      const month = getMonthFromDateString(processedData.date);
      const year = getYearFromDateString(processedData.date);
      
      if (!month || !year) return;
      
      const key = `${year} ${month}`;

      // Add to or create the month-year group
      const groupedData = { ...dataByGroupRef.current };
      if (!groupedData[key]) {
        groupedData[key] = {
          title: `${month} ${year}`,
          month: month,
          year: year,
          data: [processedData]
        };
      } else {
        // Add to existing group and sort within that group
        const currentData = [...groupedData[key].data, processedData];
        
        // Sort by date inside the group
        currentData.sort((a, b) => {
          const dateA = parseDateString(a.date);
          const dateB = parseDateString(b.date);
          
          // Handle null dates
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          // Always sort newest first within the group - actual display order will be handled by sortOrder
          return dateB - dateA;
        });
        
        groupedData[key].data = currentData;
      }
      
      dataByGroupRef.current = groupedData;
    }

    // After receiving first data, remove initial loading overlay
    if (initialLoading && receivedCount.current >= 1) {
      setInitialLoading(false);
    }

    // After receiving 5 items, transition from full-screen loading to side indicator
    if (showFullScreenLoading && receivedCount.current >= 5) {
      // Animate the transition
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        setShowFullScreenLoading(false);
      });
    }
  };

  const toggleSortType = () => setSortType(prev => prev === 'date' ? 'name' : 'date');
  const toggleSortOrder = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  const renderSectionHeader = ({ section }) => (
    <Text 
      style={[
        styles.monthHeader,
        isDarkMode && styles.monthHeaderDark
      ]}
    >
      {section.title}
    </Text>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.circularItem,
        isDarkMode && styles.circularItemDark
      ]}
    >
      <View style={styles.circularContent}>
        <Text 
          style={[
            styles.circularTitle,
            isDarkMode && styles.circularTitleDark
          ]} 
          numberOfLines={1}
        >
          {item.filename}
        </Text>
        <Text 
          style={[
            styles.circularDate,
            isDarkMode && styles.circularDateDark
          ]}
        >
          {item.date}
        </Text>
      </View>
      <View style={styles.tagContainer}>
        <TouchableOpacity
          onPress={() => handleDeleteCircular(item)}
          style={styles.deleteButton}
        >
          <Ionicons 
            name="trash-outline" 
            size={20} 
            color={isDarkMode ? '#EF4444' : '#EF4444'} 
          />
        </TouchableOpacity>
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color={isDarkMode ? '#4A4A4A' : '#DEDEDE'} 
        />
      </View>
    </TouchableOpacity>
  );

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Exam':
        return styles.statusExam;
      case 'Academic':
        return styles.statusAcademic;
      case 'Event':
        return styles.statusEvent;
      case 'Research':
        return styles.statusResearch;
      case 'Notice':
        return styles.statusNotice;
      default:
        return styles.statusGeneral;
    }
  };

  const getStatusTextStyle = (status) => {
    switch(status) {
      case 'Exam':
        return styles.statusExamText;
      case 'Academic':
        return styles.statusAcademicText;
      case 'Event':
        return styles.statusEventText;
      case 'Research':
        return styles.statusResearchText;
      case 'Notice':
        return styles.statusNoticeText;
      default:
        return styles.statusGeneralText;
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color={COLORS.grey} />
      <Text style={styles.emptyText}>
        {searchQuery ? "No matching circulars" : "No circulars available"}
      </Text>
    </View>
  );

  const handleDeleteCircular = (circular) => {
    setSelectedCircular(circular);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCircular) return;

    try {
      // Remove the circular from originalData
      setOriginalData(prevData => 
        prevData.filter(item => item.filename !== selectedCircular.filename)
      );

      // Update the grouped data
      const month = getMonthFromDateString(selectedCircular.date);
      const year = getYearFromDateString(selectedCircular.date);
      if (month && year) {
        const key = `${year} ${month}`;
        if (dataByGroupRef.current[key]) {
          dataByGroupRef.current[key].data = dataByGroupRef.current[key].data.filter(
            item => item.filename !== selectedCircular.filename
          );
        }
      }

      showSnackbar('Circular deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar('Failed to delete circular');
    } finally {
      setDeleteModalVisible(false);
      setSelectedCircular(null);
    }
  };

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode && styles.containerDark
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
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
            Circulars
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <Text style={{
          color: isDarkMode ? '#fff' : '#64748B',
          fontSize: 15,
          marginTop: 6,
          marginBottom: 0,
          textAlign: 'center'
        }}>
          University announcements & notices
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
            placeholder="Search circulars..."
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

      <SectionList
        sections={circulars}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => item.url || `circular-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        stickySectionHeadersEnabled={false}
      />

      {showFullScreenLoading && (
        <Animated.View style={[
          styles.loadingOverlay,
          { 
            opacity: loadingOpacity,
            backgroundColor: isDarkMode ? 'rgba(16, 24, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)'
          }
        ]}>
          <View style={[
            styles.loadingIndicator,
            { backgroundColor: isDarkMode ? theme.surface : '#fff' }
          ]}>
            <ActivityIndicator size="large" color="#19C6C1" />
            <Text style={[
              styles.loadingText,
              { color: isDarkMode ? theme.text : '#0F172A' }
            ]}>
              {loadingProgress > 0
                ? `Loaded ${loadingProgress} items...`
                : 'Connecting to server...'}
            </Text>
            {loadingProgress >= 5 && (
              <Text style={[
                styles.loadingSubtext,
                { color: isDarkMode ? theme.textSecondary : '#64748B' }
              ]}>
                Almost ready...
              </Text>
            )}
          </View>
        </Animated.View>
      )}

      {loading && !showFullScreenLoading && originalData.length > 0 && (
        <View style={[
          styles.streamingIndicator,
          { backgroundColor: isDarkMode ? theme.surface : '#fff' }
        ]}>
          <ActivityIndicator size="small" color="#19C6C1" />
          <Text style={[
            styles.streamingText,
            { color: isDarkMode ? theme.text : '#0F172A' }
          ]}>
            Loading more... ({loadingProgress})
          </Text>
        </View>
      )}

      {!loading && originalData.length > 0 && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchCirculars}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      )}

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
              Delete Circular
            </Text>
            <Text style={[
              styles.modalMessage,
              { color: isDarkMode ? theme.textSecondary : '#64748B' }
            ]}>
              Are you sure you want to delete this circular?
            </Text>
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.modalButton, { borderColor: '#19C6C1' }]}
                textColor="#19C6C1"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleDeleteConfirm}
                style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                textColor="#FFFFFF"
              >
                Delete
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#101828',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  monthHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 24,
    marginBottom: 12,
  },
  monthHeaderDark: {
    color: '#0A84FF',
  },
  circularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  circularItemDark: {
    backgroundColor: '#1A2536',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
  },
  circularContent: {
    flex: 1,
    marginRight: 12,
  },
  
  circularTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 4,
  },
  circularTitleDark: {
    color: '#FFFFFF',
  },
  circularDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  circularDateDark: {
    color: '#8E8E93',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
  },
  streamingIndicator: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  streamingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2196F3',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    color: '#666',
    textAlign: 'center',
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
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
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
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
});

export default CircularsScreen;