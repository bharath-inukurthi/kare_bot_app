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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Alert } from 'react-native';
import { COLORS } from '../constants/Colors';

const CircularsScreen = () => {
  const [circulars, setCirculars] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true); // Track initial loading separately
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const isMounted = useRef(true);
  const fetchControllerRef = useRef(null);
  const hasData = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const activityTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
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
        item.date?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.month?.toLowerCase().includes(searchQuery.toLowerCase())
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
      // Group by month and year
      const grouped = {};
      
      filteredData.forEach(item => {
        if (!item.date || !item.month) return;
        
        const month = item.month;
        const dateParts = item.date.split('/');
        const year = dateParts.length === 3 ? parseInt(dateParts[2]) : new Date().getFullYear();
        const key = `${year} ${month}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            title: `${month} ${year}`,
            month: month,
            year: year,
            data: []
          };
        }
        
        grouped[key].data.push(item);
      });
      
      // Sort items within each month group - most recent dates first
      Object.values(grouped).forEach(group => {
        group.data.sort((a, b) => {
          // Convert DD/MM/YYYY to Date objects
          const [dayA, monthA, yearA] = a.date.split('/').map(Number);
          const [dayB, monthB, yearB] = b.date.split('/').map(Number);
          
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
      });
      
      // Convert to array and sort months
      const result = Object.values(grouped);
      result.sort((a, b) => {
        if (a.year !== b.year) {
          return sortOrder === 'desc' ? b.year - a.year : a.year - b.year;
        }
        return sortOrder === 'desc' 
          ? monthOrder[b.month] - monthOrder[a.month]
          : monthOrder[a.month] - monthOrder[b.month];
      });
      
      setCirculars(result);
    } else {
      // Sort and group by name
      const sortedData = [...filteredData].sort((a, b) => {
        const nameA = a.filename.toLowerCase();
        const nameB = b.filename.toLowerCase();
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

  // Function to handle SSE data parsing
  const handleSSEData = (data) => {
    // Reset activity timer
    lastActivityRef.current = Date.now();
    
    // Update our data state
    if (data.message === 'No files found in Circulars/') {
      console.log('No files found message received');
      setLoading(false);
      setInitialLoading(false);
      return;
    }
    
    if (data.filename && data.url && data.date && data.month) {
      console.log('Received data:', data.filename);
      hasData.current = true;
      
      setOriginalData(prev => [...prev, data]);
      setLoadingProgress(prev => prev + 1);
      
      // After receiving first data, remove initial loading overlay
      if (initialLoading) {
        setInitialLoading(false);
      }
    }
  };

  // Check if stream is inactive (no new data for a while)
  const checkStreamActivity = () => {
    const now = Date.now();
    const elapsed = now - lastActivityRef.current;
    
    // If no activity for 3 seconds, consider stream complete
    if (elapsed > 3000 && isMounted.current) {
      console.log('Stream appears complete (no activity for 3 seconds)');
      setLoading(false);
      return;
    }
    
    // Otherwise, check again soon
    activityTimerRef.current = setTimeout(checkStreamActivity, 1000);
  };

  const fetchCirculars = () => {
    setLoading(true);
    setInitialLoading(true);
    setLoadingProgress(0);
    setOriginalData([]);
    hasData.current = false;
    lastActivityRef.current = Date.now();
    
    // Clear any existing timers
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    
    // Abort any ongoing fetch
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    
    // Create new AbortController
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    
    // Set timeout for slow connections
    const loadingTimeout = setTimeout(() => {
      if (isMounted.current && !hasData.current) {
        controller.abort();
        setLoading(false);
        setInitialLoading(false);
        Alert.alert('Error', 'Taking too long to load. Please check your connection.');
      }
    }, 20000);

    // Use fetch with text processing for SSE
    fetch('https://faculty-availability-api.onrender.com/stream-circulars', {
      method: 'GET',
      signal: controller.signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Start checking for stream inactivity
      activityTimerRef.current = setTimeout(checkStreamActivity, 1000);
      
      // React Native doesn't support response.body.getReader(),
      // so we use response.text() with a different approach
      let buffer = '';
      
      // Set up streaming with a recursive function
      const processStream = (text) => {
        if (!isMounted.current || controller.signal.aborted) return;
        
        // Process the received text
        const lines = text.split('\n\n');
        
        lines.forEach(line => {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6).trim(); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);
              
              // Process the SSE data
              handleSSEData(data);
            } catch (e) {
              console.error('Parse error:', e, 'on line:', line);
            }
          }
        });
      };
      
      // Use fetch streaming technique specifically for React Native
      const reader = response.body._readableState;
      response.text().then(text => {
        // Process the entire response text as SSE format
        const events = text.split('\n\n').filter(event => 
          event.trim() && event.startsWith('data: ')
        );
        
        // Process each event
        events.forEach((event, index) => {
          setTimeout(() => {
            if (!isMounted.current || controller.signal.aborted) return;
            
            try {
              const jsonStr = event.substring(6).trim(); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);
              handleSSEData(data);
              
              // If this is the last event, end the stream
              if (index === events.length - 1) {
                clearTimeout(loadingTimeout);
                setLoading(false);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }, index * 100); // Simulate streaming with delays
        });
        
        // If no events, clear loading state
        if (events.length === 0) {
          clearTimeout(loadingTimeout);
          setLoading(false);
          setInitialLoading(false);
        }
      });
    })
    .catch(error => {
      clearTimeout(loadingTimeout);
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
      
      if (isMounted.current && !controller.signal.aborted) {
        console.error('Fetch error:', error);
        setLoading(false);
        setInitialLoading(false);
        if (!hasData.current) {
          Alert.alert('Error', 'Failed to load circulars. Please try again later.');
        }
      }
    });
  };

  const toggleSortType = () => setSortType(prev => prev === 'date' ? 'name' : 'date');
  const toggleSortOrder = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.circularCard}
      onPress={() => Linking.openURL(item.url)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="document-text" size={32} color={COLORS.primary} />
      </View>
      <View style={styles.circularInfo}>
        <Text style={styles.circularTitle}>{item.filename}</Text>
        <Text style={styles.circularDate}>{item.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color={COLORS.grey} />
      <Text style={styles.emptyText}>
        {searchQuery ? "No matching circulars" : "No circulars available"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primary]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Circulars</Text>
        <Text style={styles.headerSubtitle}>Latest updates and notifications</Text>
      </LinearGradient>

      <View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search circulars..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearSearchButton} 
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <View style={styles.sortOptions}>
          <TouchableOpacity style={styles.sortButton} onPress={toggleSortType}>
            <Ionicons 
              name={sortType === 'date' ? 'calendar' : 'text'} 
              size={20} 
              color={COLORS.primary} 
            />
            <Text style={styles.sortButtonText}>
              {sortType === 'date' ? 'Date' : 'Name'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={toggleSortOrder}>
            <Ionicons 
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
              size={20} 
              color={COLORS.primary} 
            />
            <Text style={styles.sortButtonText}>
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {initialLoading ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 10, color: COLORS.text }}>
              {loadingProgress > 0 
                ? `Loaded ${loadingProgress} items...` 
                : 'Connecting to server...'}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <SectionList
            sections={circulars}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContainer}
            stickySectionHeadersEnabled={true}
            ListEmptyComponent={renderEmptyList}
          />
          {loading && originalData.length > 0 && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.streamingText}>Receiving updates... ({loadingProgress})</Text>
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
        </>
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
    paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight + 10,
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
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    opacity: 0.9,
  },
  searchInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    margin: 10,
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 26,
    top: 28,
  },
  sortOptions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginRight: 16,
    marginBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '10',
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  sortButtonText: {
    color: COLORS.text,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  listContainer: {
    padding: 14,
    flexGrow: 1,
  },
  circularCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
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
  circularInfo: {
    flex: 1,
    marginRight: 8
  },
  circularTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  circularDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    backgroundColor: '#e9ecef',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingIndicator: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.grey,
  },
  streamingIndicator: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  streamingText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  }
});

export default CircularsScreen;