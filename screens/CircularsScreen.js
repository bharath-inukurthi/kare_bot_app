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
  SafeAreaView,
  PanResponder,
  Linking, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetch } from 'expo/fetch';
import { useTheme } from '../context/ThemeContext';

// Indexed ScrollBar Component
const IndexedScrollBar = ({ sections, onIndexPress, sortType, isDarkMode, sectionListRef }) => {
  const getIndices = () => {
    if (sortType === 'date') {
      return sections.map(section => {
        const [month, year] = section.title.split(' ');
        const shortYear = year ? year.slice(-2) : '';
        return {
          label: `${month ? month.substring(0, 3).toUpperCase() : ''}\n'${shortYear}`,
          value: section.title
        };
      });
    } else {
      return sections.map(section => ({
        label: section.title ? section.title[0].toUpperCase() : '',
        value: section.title
      }));
    }
  };

  const [activeIndex, setActiveIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const indices = getIndices();
  const itemHeight = sortType === 'date' ? 32 : 20;
  const POP_DISTANCE = -35;

  // Use individual animation refs for better tracking
  const scaleAnims = useRef(indices.map(() => new Animated.Value(1))).current;
  const translateXAnims = useRef(indices.map(() => new Animated.Value(0))).current;

  const containerRef = useRef(null);
  const scrollbarMeasurements = useRef({
    y: 0,
    height: 0,
    measured: false
  });

  // Track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Reset animations when sections change
  useEffect(() => {
    // Create new animation values if length changed
    if (scaleAnims.length !== indices.length) {
      scaleAnims.length = 0;
      translateXAnims.length = 0;

      indices.forEach((_, i) => {
        scaleAnims[i] = new Animated.Value(1);
        translateXAnims[i] = new Animated.Value(0);
      });
    }

    resetAllAnimations();

    // Force measure on next render
    if (containerRef.current) {
      setTimeout(() => {
        if (isMounted.current && containerRef.current) {
          measureScrollbar();
        }
      }, 300);
    }
  }, [sections, sortType]);

  // Measure scrollbar whenever it's layout changes
  const measureScrollbar = () => {
    if (containerRef.current) {
      try {
        containerRef.current.measure((_, __, ___, height, ____, pageY) => {
          if (isMounted.current) {
            scrollbarMeasurements.current = {
              y: pageY,
              height: height,
              measured: true
            };
          }
        });
      } catch (error) {
        console.warn('Error measuring scrollbar:', error);
      }
    }
  };

  // Helper function to animate an index
  const animateIndex = useCallback((index, isActive, isDraggingNow = false) => {
    if (index < 0 || index >= indices.length || !isMounted.current) return;

    const scale = isActive ? (isDraggingNow ? 1.4 : 1.2) : 1;
    const translateX = isActive ? (isDraggingNow ? POP_DISTANCE : POP_DISTANCE / 2) : 0;

    Animated.parallel([
      Animated.spring(scaleAnims[index], {
        toValue: scale,
        friction: 5,
        tension: 120,
        useNativeDriver: true
      }),
      Animated.spring(translateXAnims[index], {
        toValue: translateX,
        friction: 5,
        tension: 120,
        useNativeDriver: true
      })
    ]).start();
  }, [indices.length, scaleAnims, translateXAnims]);

  // Reset all animations to default state
  const resetAllAnimations = useCallback(() => {
    if (!isMounted.current) return;

    indices.forEach((_, i) => {
      animateIndex(i, false);
    });
    setActiveIndex(null);
    setIsDragging(false);
  }, [indices, animateIndex]);

  // Handle index activation
  const activateIndex = useCallback((index, i, isDraggingNow = false) => {
    if (!index || !index.value || !isMounted.current) return;

    // Reset previous active index if different
    if (activeIndex !== null && activeIndex !== i) {
      animateIndex(activeIndex, false);
    }

    setActiveIndex(i);

    // Add a small delay before triggering the scroll to ensure animations are processed first
    setTimeout(() => {
      if (isMounted.current) {
        console.log(`Activating index ${i} with value ${index.value}`);
        onIndexPress(index.value);
      }
    }, 10);

    animateIndex(i, true, isDraggingNow);
  }, [onIndexPress, animateIndex, activeIndex]);

  // Handle press on an index
  const handleIndexPress = useCallback((index, i) => {
    console.log(`Index pressed: ${i}, value: ${index.value}`);

    // Ensure the index is valid
    if (!index || !index.value) {
      console.warn('Invalid index pressed');
      return;
    }

    // Activate the index with a visual indication
    activateIndex(index, i, true);

    // Auto-reset animation after a delay
    setTimeout(() => {
      if (isMounted.current && i === activeIndex) {
        animateIndex(i, true, false);
      }
    }, 500);

    // Reset all animations after longer delay
    setTimeout(() => {
      if (isMounted.current) {
        resetAllAnimations();
      }
    }, 2000);
  }, [activateIndex, activeIndex, animateIndex, resetAllAnimations]);

  // Measure container position and size
  const handleLayout = useCallback(() => {
    // Use setTimeout to ensure the component is fully rendered
    setTimeout(measureScrollbar, 100);
  }, []);

  // Calculate index from Y position
  const getIndexFromY = useCallback((y) => {
    const { y: scrollbarY, height: scrollbarHeight, measured } = scrollbarMeasurements.current;

    if (!measured) return 0;

    const relativeY = y - scrollbarY;
    const totalHeight = indices.length * itemHeight;
    const normalizedY = (relativeY / scrollbarHeight) * totalHeight;
    return Math.max(0, Math.min(indices.length - 1, Math.floor(normalizedY / itemHeight)));
  }, [indices.length, itemHeight]);

  // Create pan responder for dragging interaction
  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (_, gestureState) => {
      setIsDragging(true);
      // Measure again to ensure accurate positioning
      measureScrollbar();

      // Small delay to ensure measurement is complete
      setTimeout(() => {
        if (isMounted.current) {
          const idx = getIndexFromY(gestureState.y0);
          if (indices[idx] && indices[idx].value) {
            activateIndex(indices[idx], idx, true);
          }
        }
      }, 10);
    },

    onPanResponderMove: (_, gestureState) => {
      const currentIdx = getIndexFromY(gestureState.moveY);
      if (currentIdx !== activeIndex && indices[currentIdx] && indices[currentIdx].value) {
        activateIndex(indices[currentIdx], currentIdx, true);
      }
    },

    onPanResponderRelease: () => {
      setIsDragging(false);
      if (activeIndex !== null) {
        animateIndex(activeIndex, true, false);
        setTimeout(() => {
          if (isMounted.current) {
            resetAllAnimations();
          }
        }, 2000);
      }
    },

    onPanResponderTerminate: () => {
      setIsDragging(false);
      resetAllAnimations();
    }
  }), [indices, activeIndex, getIndexFromY, activateIndex, animateIndex, resetAllAnimations]);

  // Calculate dynamic top offset for centering
  const totalHeight = indices.length * itemHeight;
  const translateY = -(totalHeight / 2);

  // Create ref for viewability config outside of useEffect
  const viewabilityConfigCallbackPairsRef = useRef([]);

  // Listen to scroll events to update active index
  useEffect(() => {
    if (!sectionListRef?.current || sections.length === 0) return;

    const handleScroll = (info) => {
      if (isDragging || !info.viewableItems || info.viewableItems.length === 0) return;

      // Get the first visible section
      const firstVisibleSection = info.viewableItems.find(item => item.section)?.section;
      if (!firstVisibleSection) return;

      console.log('Visible section:', firstVisibleSection.title);

      // Find the index of this section in our indices
      const sectionIndex = indices.findIndex(idx => idx.value === firstVisibleSection.title);
      if (sectionIndex !== -1 && sectionIndex !== activeIndex) {
        console.log(`Updating active index to ${sectionIndex} for section ${firstVisibleSection.title}`);

        // Just update the active index without scrolling (to avoid loops)
        setActiveIndex(sectionIndex);
        animateIndex(sectionIndex, true, false);

        // Reset after a delay
        setTimeout(() => {
          if (isMounted.current) {
            resetAllAnimations();
          }
        }, 2000);
      }
    };

    // Set up the viewability config
    const viewabilityConfig = {
      itemVisiblePercentThreshold: 30,
      minimumViewTime: 100,
    };

    // Create the viewability config list
    viewabilityConfigCallbackPairsRef.current = [{
      viewabilityConfig,
      onViewableItemsChanged: handleScroll
    }];

    // Set the viewability config on the SectionList
    if (sectionListRef.current) {
      // Use a timeout to ensure the SectionList is fully initialized
      setTimeout(() => {
        if (sectionListRef.current && isMounted.current) {
          try {
            sectionListRef.current.viewabilityConfigCallbackPairs = viewabilityConfigCallbackPairsRef.current;
            console.log('Set up viewability config on SectionList');
          } catch (error) {
            console.error('Error setting viewability config:', error);
          }
        }
      }, 100);
    }

    return () => {
      // Clean up
      viewabilityConfigCallbackPairsRef.current = [];
    };
  }, [sections, indices, activeIndex, isDragging, animateIndex, resetAllAnimations, sectionListRef]);

  return (
    <Animated.View
      ref={containerRef}
      style={[
        styles.indexedScrollBar,
        isDarkMode && styles.indexedScrollBarDark,
        {
          position: 'absolute',
          right: 8,
          top: sortType === 'date' ? '35%' : '45%',
          transform: [{ translateY }],
          opacity: 0.9,
          zIndex: 20,
        }
      ]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.indexList}>
        {indices.map((index, i) => (
          <Animated.View
            key={i}
            style={{
              transform: [
                { scale: scaleAnims[i] || new Animated.Value(1) },
                { translateX: translateXAnims[i] || new Animated.Value(0) }
              ],
              marginVertical: sortType === 'date' ? 1 : 0,
              borderRadius: 10,
              backgroundColor: 'transparent',
              shadowColor: activeIndex === i ? '#000' : 'transparent',
              shadowOpacity: activeIndex === i ? 0.2 : 0,
              shadowRadius: activeIndex === i ? 4 : 0,
              elevation: activeIndex === i ? 4 : 0,
              minWidth: sortType === 'date' ? 32 : 24,
              minHeight: itemHeight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TouchableOpacity
              style={[
                styles.indexItem,
                isDarkMode && styles.indexItemDark,
                activeIndex === i && styles.indexItemActive,
                {
                  minWidth: sortType === 'date' ? 32 : 24,
                  minHeight: itemHeight,
                  backgroundColor: activeIndex === i ? (isDarkMode ? '#19C6C1' : '#0F172A') : 'transparent',
                },
              ]}
              onPress={() => handleIndexPress(index, i)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.indexText,
                isDarkMode && styles.indexTextDark,
                {
                  fontSize: 9,
                  fontWeight: 'bold',
                  letterSpacing: 2,
                  textAlign: 'center',
                  lineHeight: sortType === 'date' ? 14 : 11
                },
                activeIndex === i && { color: isDarkMode ? '#fff' : '#fff' }
              ]}>
                {index.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

// Add module-level variables to persist data and loading state across screen navigation
let globalCircularsData = [];
let hasLoadedData = false;
let isLoadingInBackground = false;
let backgroundLoadingController = null;
let lastLoadingProgress = 0;
let shouldShowLoadingIndicator = false;
let isProcessingData = false;
let processingQueue = [];
let loadingUpdateInterval = null;
let initialLoadStarted = false; // Track if initial load has started

const CircularsScreen = ({ navigation }) => {
  const [circulars, setCirculars] = useState([]);
  const [originalData, setOriginalData] = useState(globalCircularsData);
  const [loading, setLoading] = useState(!hasLoadedData);
  const [initialLoading, setInitialLoading] = useState(!hasLoadedData);
  const [loadingProgress, setLoadingProgress] = useState(lastLoadingProgress);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFullScreenLoading, setShowFullScreenLoading] = useState(!hasLoadedData);
  const [loadingItems, setLoadingItems] = useState(new Map());
  const [showSideLoading, setShowSideLoading] = useState(shouldShowLoadingIndicator);

  // Animation value for loading indicator
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  // Add a ref to track if we're currently processing data
  const isProcessingRef = useRef(false);
  const isMounted = useRef(true);
  const fetchControllerRef = useRef(null);
  const receivedCount = useRef(0);
  const dataByGroupRef = useRef({});

  const { isDarkMode, theme } = useTheme();

  // Add refs to track component state
  const loadingItemsRef = useRef(new Map());
  const sectionListRef = useRef(null);

  // Add refs for viewability config
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 100,
  });
  const viewabilityConfigCallbackPairsRef = useRef([]);
  const isViewabilityConfigSet = useRef(false);

  // Add effect to handle component lifecycle
  useEffect(() => {
    isMounted.current = true;

    // Reset loading items when component mounts
    loadingItemsRef.current = new Map();
    setLoadingItems(new Map());

    return () => {
      isMounted.current = false;
      // Clear any pending loading states
      loadingItemsRef.current.clear();
      setLoadingItems(new Map());
    };
  }, []);

  // Add effect to handle navigation focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reset loading states when screen comes into focus
      if (isMounted.current) {
        loadingItemsRef.current = new Map();
        setLoadingItems(new Map());
      }
    });

    return unsubscribe;
  }, [navigation]);

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

  // Process data queue periodically
  useEffect(() => {
    let processingInterval;

    const processQueue = () => {
      if (isProcessingData || processingQueue.length === 0) return;
      
      isProcessingData = true;
      try {
        const data = processingQueue[processingQueue.length - 1];
        processAndSortCirculars(data);
        processingQueue.length = 0; // Clear queue after processing
      } finally {
        isProcessingData = false;
      }
    };

    // Process queue every 100ms
    processingInterval = setInterval(processQueue, 100);

    return () => {
      clearInterval(processingInterval);
    };
  }, []);

  // Handle data updates
  const updateData = useCallback((newData) => {
    setOriginalData(newData);
    processingQueue.push(newData); // Add to processing queue
  }, []);

  // Add effect to handle loading updates
  useEffect(() => {
    // Start interval for loading updates when component mounts
    if (isLoadingInBackground) {
      loadingUpdateInterval = setInterval(() => {
        if (isLoadingInBackground) {
          setLoadingProgress(lastLoadingProgress);
          setShowSideLoading(shouldShowLoadingIndicator);
        }
      }, 100); // Update every 100ms
    }

    return () => {
      // Clear interval when component unmounts
      if (loadingUpdateInterval) {
        clearInterval(loadingUpdateInterval);
        loadingUpdateInterval = null;
      }
    };
  }, [isLoadingInBackground]);

  // Add effect to handle initial loading
  useEffect(() => {
    if (!initialLoadStarted && !hasLoadedData) {
      initialLoadStarted = true;
      startBackgroundLoading();
    }
  }, []);

  // Modify startBackgroundLoading to handle initial loading better
  const startBackgroundLoading = async () => {
    if (isLoadingInBackground && hasLoadedData) return;

    // Clear any existing interval
    if (loadingUpdateInterval) {
      clearInterval(loadingUpdateInterval);
      loadingUpdateInterval = null;
    }

    // Reset all states
    isLoadingInBackground = true;
    setLoading(true);
    setInitialLoading(true);
    setShowFullScreenLoading(true);
    setShowSideLoading(false);
    setLoadingProgress(0);
    lastLoadingProgress = 0;
    shouldShowLoadingIndicator = false;
    receivedCount.current = 0;
    dataByGroupRef.current = {};
    processingQueue.length = 0;

    // Force an immediate progress update
    setLoadingProgress(0);
    loadingOpacity.setValue(1);

    if (backgroundLoadingController) {
      backgroundLoadingController.abort();
    }

    const controller = new AbortController();
    backgroundLoadingController = controller;

    // Start loading update interval immediately
    loadingUpdateInterval = setInterval(() => {
      if (isLoadingInBackground) {
        const currentProgress = receivedCount.current;
        lastLoadingProgress = currentProgress;
        setLoadingProgress(currentProgress);
        
        // Update loading indicator visibility
        if (currentProgress >= 5) {
          shouldShowLoadingIndicator = true;
          setShowFullScreenLoading(false);
          setShowSideLoading(true);
          setInitialLoading(false);
        }
      }
    }, 50); // Update more frequently for smoother progress

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
      let allData = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Clear loading interval
          if (loadingUpdateInterval) {
            clearInterval(loadingUpdateInterval);
            loadingUpdateInterval = null;
          }

          hasLoadedData = true;
          globalCircularsData = allData;
          isLoadingInBackground = false;
          lastLoadingProgress = receivedCount.current;
          shouldShowLoadingIndicator = false;
          
          setLoading(false);
          setInitialLoading(false);
          setShowFullScreenLoading(false);
          setShowSideLoading(false);
          updateData(allData);
          setLoadingProgress(receivedCount.current);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.slice(5).trim();
              const json = JSON.parse(jsonStr);
              allData.push(json);
              
              // Update progress immediately
              receivedCount.current += 1;
              const currentProgress = receivedCount.current;
              lastLoadingProgress = currentProgress;
              
              // Update data and trigger processing
              updateData([...allData]);

              // Force progress update
              setLoadingProgress(currentProgress);

              if (currentProgress >= 5) {
                shouldShowLoadingIndicator = true;
                setShowFullScreenLoading(false);
                setShowSideLoading(true);
                setInitialLoading(false);
              }
            } catch (err) {
              console.warn('Error parsing line:', line);
            }
          }
        }

        buffer = lines[lines.length - 1];
      }
    } catch (err) {
      // Clear loading interval on error
      if (loadingUpdateInterval) {
        clearInterval(loadingUpdateInterval);
        loadingUpdateInterval = null;
      }

      if (!controller.signal.aborted) {
        console.error('Fetch error:', err.message);
        isLoadingInBackground = false;
        lastLoadingProgress = receivedCount.current;
        shouldShowLoadingIndicator = receivedCount.current >= 5;
        
        setLoading(false);
        setShowFullScreenLoading(false);
        setShowSideLoading(shouldShowLoadingIndicator);
        
        if (receivedCount.current === 0) {
          Alert.alert('Fetch Failed', `${err.message}`, [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry', 
              onPress: () => {
                initialLoadStarted = false; // Reset initial load flag
                startBackgroundLoading();
              }
            }
          ]);
        }
      }
    }
  };

  // Modify the cleanup in useEffect for screen focus/blur
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isLoadingInBackground) {
        setLoading(true);
        setLoadingProgress(lastLoadingProgress);
        
        if (lastLoadingProgress < 5) {
          setShowFullScreenLoading(true);
          setShowSideLoading(false);
          setInitialLoading(true);
        } else {
          setShowFullScreenLoading(false);
          setShowSideLoading(true);
          setInitialLoading(false);
        }

        // Start loading update interval if not already running
        if (!loadingUpdateInterval) {
          loadingUpdateInterval = setInterval(() => {
            if (isLoadingInBackground) {
              setLoadingProgress(lastLoadingProgress);
              setShowSideLoading(shouldShowLoadingIndicator);
            }
          }, 100);
        }

        if (originalData.length > 0) {
          processingQueue.push(originalData);
        }
      } else if (hasLoadedData) {
        setLoading(false);
        setShowFullScreenLoading(false);
        setShowSideLoading(false);
        setInitialLoading(false);
        setLoadingProgress(lastLoadingProgress);
        processingQueue.push(globalCircularsData);
      } else {
        startBackgroundLoading();
      }
    });

    return () => {
      unsubscribe();
      // Clear loading interval on unmount
      if (loadingUpdateInterval) {
        clearInterval(loadingUpdateInterval);
        loadingUpdateInterval = null;
      }
    };
  }, [navigation, originalData]);

  // Memoize the processAndSortCirculars function
  const processAndSortCirculars = useCallback((data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    
    try {
      const processedData = data.map(item => ({
        ...item,
        id: item.id || `circular-${item.filename}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        displayName: item.filename ? item.filename.split(':::')[1] || item.filename : 'Unnamed Document',
        originalFilename: item.filename
      }));

      let filteredData = processedData;
      if (searchQuery) {
        filteredData = processedData.filter(item =>
          item.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        let groupedData = {};

        // Process each item and add to appropriate group
        filteredData.forEach((item) => {
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

          groupedData[key].data.push(item);
        });

        // Sort items within each month group
        Object.values(groupedData).forEach(group => {
          group.data.sort((a, b) => {
            const dateA = parseDateString(a.date);
            const dateB = parseDateString(b.date);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
          });
        });

        // Convert to array and sort by year first, then by month
        const result = Object.values(groupedData);
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
          const nameA = a.displayName?.toLowerCase() || '';
          const nameB = b.displayName?.toLowerCase() || '';
          return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        // Group by first letter
        const grouped = {};
        sortedData.forEach((item) => {
          if (!item.displayName) return;

          const letter = item.displayName[0].toUpperCase();
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
    } catch (error) {
      console.error('Error processing data:', error);
    }
  }, [searchQuery, sortType, sortOrder]);

  const handleNewItem = (data) => {
    try {
      receivedCount.current += 1;

      const processedData = {
        filename: data.filename || 'Unnamed Document',
        url: data.url || '',
        date: data.date || 'Unknown Date',
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        ...data
      };

      setOriginalData(prev => {
        const newData = [...prev, processedData];
        return newData;
      });

      setLoadingProgress(prev => prev + 1);

      // After receiving first data, remove initial loading overlay
      if (initialLoading && receivedCount.current >= 1) {
        setInitialLoading(false);
      }

      // After receiving 5 items, transition from full-screen loading to side indicator
      if (showFullScreenLoading && receivedCount.current >= 5) {
        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }).start(() => {
          if (isMounted.current) {
            setShowFullScreenLoading(false);
            setLoading(true); // Set loading to true to show side indicator
          }
        });
      }
    } catch (error) {
      console.error('Error handling new item:', error);
    }
  };

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

  const renderItem = useCallback(({ item, index, section }) => {
    // Ensure item has an ID
    const itemId = item.id || `circular-${item.filename}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Memoize the press handler
    const handlePress = useCallback(async () => {
      if (!isMounted.current) return;
      
      console.log('Circular press handler called for:', item.displayName, 'with ID:', itemId);
      
      try {
        // Validate item data
        if (!item || !item.filename) {
          console.warn('Invalid item data:', item);
          Alert.alert(
            'Error',
            'This document is not available.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Set loading state using ref to ensure we have latest state
        console.log('Setting loading state for item:', itemId);
        const newLoadingItems = new Map(loadingItemsRef.current);
        newLoadingItems.set(itemId, true);
        loadingItemsRef.current = newLoadingItems;
        setLoadingItems(newLoadingItems);

        // Construct and log the URL
        const url = `https://faculty-availability-api.onrender.com/get-item/?object_key=Circulars/${encodeURIComponent(item.filename)}`;
        console.log('Fetching from URL:', url);

        // Make the request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!isMounted.current) return;

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const data = await response.json();

          if (!isMounted.current) return;

          if (!data || !data.presigned_url) {
            throw new Error('Invalid response: No presigned URL');
          }

          // Check if we can open the URL
          const canOpen = await Linking.canOpenURL(data.presigned_url);

          if (!isMounted.current) return;

          if (!canOpen) {
            throw new Error('Cannot open this type of document');
          }

          // Open the URL with timeout
          const openTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout opening URL')), 5000)
          );
          
          const openPromise = Linking.openURL(data.presigned_url);
          await Promise.race([openPromise, openTimeout]);
          
          if (!isMounted.current) return;
          
          console.log('Successfully opened document');
        } catch (error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timed out');
          }
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if (!isMounted.current) return;
        
        let errorMessage = 'Failed to open document. Please try again later.';
        
        if (error.message.includes('Server error: 404')) {
          errorMessage = 'This document is no longer available.';
        } else if (error.message.includes('Server error: 500')) {
          errorMessage = 'Server is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Please check your internet connection and try again.';
        } else if (error.message.includes('Cannot open this type of document')) {
          errorMessage = 'This document format is not supported on your device.';
        } else if (error.message.includes('Invalid response')) {
          errorMessage = 'Unable to get document URL. Please try again.';
        } else if (error.message.includes('Timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }

        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      } finally {
        if (!isMounted.current) return;
        
        // Clear loading state using ref
        const newLoadingItems = new Map(loadingItemsRef.current);
        newLoadingItems.delete(itemId);
        loadingItemsRef.current = newLoadingItems;
        setLoadingItems(newLoadingItems);
      }
    }, [item, itemId]);

    const isLoading = loadingItemsRef.current.get(itemId);

    return (
      <TouchableOpacity
        key={itemId}
        style={[
          styles.circularItem,
          isDarkMode && styles.circularItemDark,
          isLoading && styles.circularItemLoading
        ]}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.circularContent}>
          <Text
            style={[
              styles.circularTitle,
              isDarkMode && styles.circularTitleDark,
              isLoading && styles.circularTitleLoading
            ]}
            numberOfLines={1}
          >
            {item.displayName || 'Unnamed Document'}
          </Text>
          <Text
            style={[
              styles.circularDate,
              isDarkMode && styles.circularDateDark,
              isLoading && styles.circularDateLoading
            ]}
          >
            {item.date || 'Unknown Date'}
          </Text>
        </View>
        <View style={styles.tagContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#19C6C1" />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={isDarkMode ? '#4A4A4A' : '#DEDEDE'}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [isDarkMode, navigation]);

  const scrollToSection = useCallback((sectionTitle) => {
    console.log(`Attempting to scroll to section: ${sectionTitle}`);

    // Find the section index
    const sectionIndex = circulars.findIndex(section => section.title === sectionTitle);

    if (sectionIndex !== -1) {
      console.log(`Found section at index: ${sectionIndex}`);

      // Ensure the SectionList is ready
      setTimeout(() => {
        if (sectionListRef.current) {
          try {
            sectionListRef.current.scrollToLocation({
              sectionIndex,
              itemIndex: 0,
              viewOffset: 0,
              animated: true
            });
            console.log(`Scrolled to section ${sectionTitle} at index ${sectionIndex}`);
          } catch (error) {
            console.error('Error scrolling to section:', error);

            // Fallback approach - try again with a delay
            setTimeout(() => {
              try {
                sectionListRef.current?.scrollToLocation({
                  sectionIndex,
                  itemIndex: 0,
                  viewOffset: 0,
                  animated: false
                });
                console.log('Used fallback scroll method');
              } catch (e) {
                console.error('Fallback scroll also failed:', e);
              }
            }, 300);
          }
        }
      }, 50);
    } else {
      console.warn(`Section not found: ${sectionTitle}`);
    }
  }, [circulars]);

  // Reference for section layout cache
  const sectionLayoutCache = useRef({});

  // Add onScrollToIndexFailed handler with improved error handling
  const handleScrollToIndexFailed = useCallback((info) => {
    console.warn('Scroll to index failed:', info);

    // Clear the section layout cache to force recalculation
    sectionLayoutCache.current = {};

    // Try a different approach with a delay
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      if (sectionListRef.current) {
        try {
          // First try with animation off
          sectionListRef.current.scrollToLocation({
            sectionIndex: info.index,
            itemIndex: 0,
            viewOffset: 0,
            animated: false
          });

          // Then try a more gradual approach if needed
          setTimeout(() => {
            if (sectionListRef.current) {
              try {
                sectionListRef.current.scrollToLocation({
                  sectionIndex: info.index,
                  itemIndex: 0,
                  viewOffset: 0,
                  animated: true
                });
              } catch (e) {
                console.error('Second scroll attempt failed:', e);
              }
            }
          }, 300);
        } catch (error) {
          console.error('First scroll attempt failed:', error);
        }
      }
    });
  }, []);

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color="#64748B" />
      <Text style={styles.emptyText}>
        {searchQuery ? "No matching circulars" : "No circulars available"}
      </Text>
    </View>
  );

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

      <View style={{ flex: 1 }}>
        <SectionList
          ref={sectionListRef}
          sections={circulars}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id || `circular-${item.filename}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!loading ? renderEmptyList : null}
          stickySectionHeadersEnabled={false}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          initialNumToRender={100}
          maxToRenderPerBatch={50}
          windowSize={21}
          removeClippedSubviews={false}
          updateCellsBatchingPeriod={30}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
          disableVirtualization={false}
          legacyImplementation={false}
          extraData={loadingItemsRef.current}
        />
        {circulars.length > 0 && (
          <IndexedScrollBar
            sections={circulars}
            onIndexPress={scrollToSection}
            sortType={sortType}
            isDarkMode={isDarkMode}
            sectionListRef={sectionListRef}
          />
        )}
      </View>

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
          </View>
        </Animated.View>
      )}

      {showSideLoading && (
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
          onPress={startBackgroundLoading}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
};

const SortButton = ({ label, active, onPress, style, isDarkMode }) => (
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
  indexedScrollBar: {
    position: 'absolute',
    right: 8,
    top: '40%',
    transform: [{ translateY: -100 }],
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 2,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  indexedScrollBarDark: {
    backgroundColor: '#1E293B',
  },
  indexList: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 0,
  },
  indexItem: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  indexItemActive: {
    transform: [{ scale: 1.3 }],
    shadowColor: '#19C6C1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  indexItemDark: {
    backgroundColor: '#2D3748',
  },
  indexText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  indexTextDark: {
    color: '#E2E8F0',
  },
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
    left: 24, // Moved to left side to avoid overlap with scroll bar
    backgroundColor: '#19C6C1',
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
    zIndex: 10, // Lower than scroll bar to avoid overlap
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
  circularItemLoading: {
    opacity: 0.7,
  },
  circularTitleLoading: {
    opacity: 0.7,
  },
  circularDateLoading: {
    opacity: 0.7,
  },
});

// Add debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default CircularsScreen;