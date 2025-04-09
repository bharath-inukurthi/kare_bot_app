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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Alert } from 'react-native';
import { COLORS } from '../constants/Colors';
import {fetch} from 'expo/fetch';

const CircularsScreen = () => {
  const [circulars, setCirculars] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFullScreenLoading, setShowFullScreenLoading] = useState(true);

  // Animation value for loading indicator
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  // Refs
  const isMounted = useRef(true);
  const fetchControllerRef = useRef(null);
  const receivedCount = useRef(0);

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

  const fetchCirculars = async () => {
    setLoading(true);
    setInitialLoading(true);
    setShowFullScreenLoading(true);
    setLoadingProgress(0);
    setOriginalData([]);
    receivedCount.current = 0;
  
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
  
        if (done) break;
  
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
  
      clearTimeout(timeout);
      setLoading(false);
    } catch (err) {
      clearTimeout(timeout);
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
      month: data.month || 'Unknown Month',
      ...data // Keep any other fields
    };

    // Add to original data
    setOriginalData(prev => [...prev, processedData]);
    setLoadingProgress(prev => prev + 1);

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
          editable={!initialLoading}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
            disabled={initialLoading}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <View style={styles.sortOptions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={toggleSortType}
            disabled={initialLoading}
          >
            <Ionicons
              name={sortType === 'date' ? 'calendar' : 'text'}
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.sortButtonText}>
              {sortType === 'date' ? 'Date' : 'Name'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={toggleSortOrder}
            disabled={initialLoading}
          >
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

      {/* Main content with SectionList */}
      <SectionList
        sections={circulars}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContainer}
        stickySectionHeadersEnabled={true}
        ListEmptyComponent={!loading ? renderEmptyList : null}
      />

      {/* Full-screen loading overlay (shown until 5 items are received) */}
      {showFullScreenLoading && (
        <Animated.View style={[styles.loadingOverlay, { opacity: loadingOpacity }]}>
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 10, color: COLORS.text }}>
              {loadingProgress > 0
                ? `Loaded ${loadingProgress} items...`
                : 'Connecting to server...'}
            </Text>
            {loadingProgress >= 5 && (
              <Text style={styles.loadingSubtext}>Almost ready...</Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* Side loading indicator (shown after 5 items are received) */}
      {loading && !showFullScreenLoading && originalData.length > 0 && (
        <View style={styles.streamingIndicator}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.streamingText}>Loading more... ({loadingProgress})</Text>
        </View>
      )}

      {/* Refresh button (shown when loading is complete) */}
      {!loading && originalData.length > 0 && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchCirculars}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
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
    zIndex: 10,
  },
  loadingIndicator: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    minWidth: 200,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    maxWidth: '60%',
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