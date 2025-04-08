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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Alert } from 'react-native';
import { COLORS } from '../constants/Colors';

const CircularsScreen = () => {
  const [circulars, setCirculars] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date'); // 'date' or 'name'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  useEffect(() => {
    fetchCirculars();
  }, []);

  // Process and sort data whenever search query or sort options change
  useEffect(() => {
    processAndSortCirculars(originalData);
  }, [searchQuery, sortType, sortOrder]);

  const fetchCirculars = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://faculty-availability-api.onrender.com/stream-circulars');
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      if (!response.body) {
        const text = await response.text();
        processTextResponse(text);
        return;
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
  
      let liveCirculars = [];
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            liveCirculars = processStreamChunk(buffer, liveCirculars);
          }
          break;
        }
  
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
  
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
  
        for (const line of lines) {
          try {
            const parsedLine = JSON.parse(line);
  
            if (
              !parsedLine.filename ||
              !parsedLine.url ||
              !parsedLine.date ||
              !parsedLine.month
            ) {
              console.error('Invalid circular data:', parsedLine);
              continue;
            }
  
            const circular = {
              filename: parsedLine.filename,
              url: parsedLine.url,
              date: parsedLine.date,
              month: parsedLine.month
            };
  
            liveCirculars.push(circular);
  
            // Real-time update!
            setOriginalData((prev) => [...prev, circular]);
            setCirculars((prev) => processAndSortCirculars([...prev, circular]));
  
          } catch (err) {
            console.error('Error parsing streamed line:', line, err);
          }
        }
      }
    } catch (error) {
      console.error('Stream fetch error:', error);
      Alert.alert('Error', 'Unable to stream circulars. Try again later.');
    } finally {
    setLoading(false);
    }
  };
  
  
  // Helper function to process text response (non-streaming fallback)
  const processTextResponse = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const files = lines.map(line => {
      try {
        const parsedLine = JSON.parse(line);
        if (!parsedLine.filename || !parsedLine.url || !parsedLine.date || !parsedLine.month) {
          console.error('Missing required fields in line:', line);
          return null;
        }
        return parsedLine;
      } catch (parseError) {
        console.error('JSON Parse error for line:', line, parseError);
        return null;
      }
    }).filter(item => item !== null);
    
    const formattedCirculars = files.map(file => ({
      filename: file.filename || 'Unknown File',
      url: file.url || '',
      date: file.date || 'Unknown Date',
      month: file.month || 'Unknown Month'
    }));
    
    // Store original data for filtering
    setOriginalData(formattedCirculars);
    processAndSortCirculars(formattedCirculars);
  };
  
  // Helper function to process stream chunks
  const processStreamChunk = (chunk, currentCirculars) => {
    const lines = chunk.split('\n').filter(line => line.trim());
    const newCirculars = [...currentCirculars];
    
    for (const line of lines) {
      try {
        const parsedLine = JSON.parse(line);
        
        if (!parsedLine.filename || !parsedLine.url || !parsedLine.date || !parsedLine.month) {
          console.error('Missing required fields in line:', line);
          continue;
        }
        
        const circular = {
          filename: parsedLine.filename || 'Unknown File',
          url: parsedLine.url || '',
          date: parsedLine.date || 'Unknown Date',
          month: parsedLine.month || 'Unknown Month'
        };
        
        newCirculars.push(circular);
      } catch (parseError) {
        console.error('JSON Parse error for line:', line, parseError);
      }
    }
    
    // Update state with new circulars if we have any
    if (newCirculars.length > currentCirculars.length) {
      setOriginalData(newCirculars);
      processAndSortCirculars(newCirculars);
    }
    
    return newCirculars;
  };

  const processAndSortCirculars = (data) => {
    // Ensure we have valid data to process
    if (!data || !Array.isArray(data) || data.length === 0) {
      setCirculars([]);
      return;
    }

    // Apply search filter
    let filteredData = data.filter(item =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.month.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort the filtered data
    const sortedData = [...filteredData].sort((a, b) => {
      if (sortType === 'date') {
        const monthOrder = {
          'January': 1, 'February': 2, 'March': 3, 'April': 4,
          'May': 5, 'June': 6, 'July': 7, 'August': 8,
          'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        
        const yearA = new Date(a.date).getFullYear();
        const yearB = new Date(b.date).getFullYear();
        const monthA = monthOrder[a.month];
        const monthB = monthOrder[b.month];
        const dayA = new Date(a.date).getDate();
        const dayB = new Date(b.date).getDate();

        // First compare by year
        if (yearA !== yearB) {
          return sortOrder === 'asc' ? yearA - yearB : yearB - yearA;
        }
        // Then by month
        if (monthA !== monthB) {
          return sortOrder === 'asc' ? monthA - monthB : monthB - monthA;
        }
        // Then by day
        return sortOrder === 'asc' ? dayA - dayB : dayB - dayA;
      } else {
        const nameA = a.filename.toLowerCase();
        const nameB = b.filename.toLowerCase();
        return sortOrder === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
    });

    // Group by month if sorting by date, or by first letter if sorting by name
    if (sortType === 'date') {
      const groupedByMonth = sortedData.reduce((acc, current) => {
        const month = current.month;
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(current);
        return acc;
      }, {});

      const sections = Object.keys(groupedByMonth)
        .sort((a, b) => {
          const monthOrder = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
          };
          return sortOrder === 'asc' ? monthOrder[a] - monthOrder[b] : monthOrder[b] - monthOrder[a];
        })
        .map(month => ({
          title: month,
          data: groupedByMonth[month]
        }));

      setCirculars(sections);
    } else {
      // Group by first letter when sorting by name
      const groupedByLetter = sortedData.reduce((acc, current) => {
        const firstLetter = current.filename.charAt(0).toUpperCase();
        if (!acc[firstLetter]) {
          acc[firstLetter] = [];
        }
        acc[firstLetter].push(current);
        return acc;
      }, {});

      const sections = Object.keys(groupedByLetter)
        .sort((a, b) => sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a))
        .map(letter => ({
          title: letter,
          data: groupedByLetter[letter]
        }));

      setCirculars(sections);
    }
  };

  const toggleSortType = () => {
    const newSortType = sortType === 'date' ? 'name' : 'date';
    setSortType(newSortType);
  };

  const toggleSortOrder = () => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

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

  const renderSearchBar = () => (
    <View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search circulars..."
        value={searchQuery}
        onChangeText={handleSearch}
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
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </Text>
        </TouchableOpacity>
      </View>
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

      {renderSearchBar()}

      {loading ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{marginTop: 10, color: COLORS.text}}>Loading circulars...</Text>
          </View>
        </View>
      ) : (
        <SectionList
          sections={circulars}
          keyExtractor={(item, index) => item.url + index}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContainer}
          stickySectionHeadersEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color={COLORS.grey} />
              <Text style={styles.emptyText}>
                {searchQuery.length > 0 
                  ? "No circulars match your search" 
                  : "No circulars available"}
              </Text>
            </View>
          }
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
    textAlignHorizontal: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  searchInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 10,
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
  clearSearchButton: {
    position: 'absolute',
    right: 26,
    top: 28,
    zIndex: 1,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    shadowRadius: 4,
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
    letterSpacing: 0.1,
  },
  circularDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
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
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.grey,
    textAlign: 'center',
  },
});

export default CircularsScreen;