import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

// Color constants
const TEAL = '#4CDBC4';
const LIGHT_TEAL = '#E5FAF6';
const RED = '#F56565';
const GREEN = '#22C55E';
const WHITE = '#fff';
const CARD_BG_LIGHT = '#fff';
const CARD_BG_DARK = '#1A2536';
const BG_LIGHT = '#F8FAFC';
const BG_DARK = '#101828';
const TEXT_DARK = '#0F172A';
const TEXT_LIGHT = '#fff';
const TEXT_SECONDARY = '#64748B';

// Add new color constants
const HISTORY_COLORS = {
  light: {
    primary: TEAL,
    secondary: '#60A5FA', // Blue
    accent: '#F59E0B', // Amber
    surface: '#F8FAFC',
    border: '#E2E8F0',
    text: TEXT_DARK,
    textSecondary: TEXT_SECONDARY,
    iconBg: '#E5FAF6',
    searchBg: '#F1F5F9',
    closeButtonBg: '#F1F5F9',
    cardBg: WHITE,
    cardBorder: '#E2E8F0',
    cardHover: '#F8FAFC',
  },
  dark: {
    primary: TEAL,
    secondary: '#60A5FA',
    accent: '#F59E0B',
    surface: '#1A2536',
    border: '#2D3748',
    text: TEXT_LIGHT,
    textSecondary: '#94A3B8',
    iconBg: '#1E3A8A',
    searchBg: '#1A2536',
    closeButtonBg: '#2D3748',
    cardBg: '#1A2536',
    cardBorder: '#2D3748',
    cardHover: '#2D3748',
  }
};

// Initial messages to show in the chat
const INITIAL_MESSAGES = [
  {
    id: '1',
    text: 'Hi! I\'m KARE Bot. How can I help you today?',
    sender: 'bot',
    timestamp: '9:00 AM',
  },
];

// Mock responses for the chatbot - in a real app, this would be replaced with actual AI
const BOT_RESPONSES = {
  'class timings': 'Here are your class timings for today:\n\n• 9:00 AM - Mathematics\n• 11:00 AM - Physics\n• 2:00 PM - Computer Science',
  'library hours': 'The library is open today from 8:00 AM to 10:00 PM. Would you like to know about other campus facilities?',
  'hello': 'Hi there! How can I assist you with KARE University today?',
  'hi': 'Hello! What can I help you with?',
  'help': 'I can help you with information about courses, faculty, campus facilities, schedules, and more. Just ask!',
  'default': 'I\'m not sure about that. Could you please rephrase or ask something else about KARE University?'
};

const SUGGESTIONS = [
  'Class timings?',
  'Exam dates?',
  'Campus map',
];

// Mock history data - replace with actual data in production
const MOCK_HISTORY = [
  { id: '1', name: 'Class Schedule Discussion', date: '2024-03-20', messages: 12 },
  { id: '2', name: 'Library Hours Query', date: '2024-03-19', messages: 8 },
  { id: '3', name: 'Exam Schedule Help', date: '2024-03-18', messages: 15 },
  { id: '4', name: 'Campus Facilities Info', date: '2024-03-17', messages: 10 },
];

const ChatBotScreen = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const { isDarkMode, theme } = useTheme();

  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Get theme colors
  const themeColors = isDarkMode ? HISTORY_COLORS.dark : HISTORY_COLORS.light;

  // Toggle history panel
  const toggleHistory = () => {
    const toValue = showHistory ? 300 : 0;
    const opacityValue = showHistory ? 0 : 0.5;

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }),
      Animated.timing(overlayOpacity, {
        toValue: opacityValue,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();

    setShowHistory(!showHistory);
  };

  // Filter history based on search
  const filteredHistory = MOCK_HISTORY.filter(item => 
    item.name.toLowerCase().includes(historySearch.toLowerCase())
  );

  // Render history item with enhanced colors
  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.historyItem,
        { 
          backgroundColor: themeColors.cardBg,
          borderColor: themeColors.cardBorder,
        }
      ]}
      onPress={() => {
        toggleHistory();
      }}
    >
      <View style={styles.historyItemContent}>
        <View style={styles.historyItemHeader}>
          <View style={[
            styles.historyItemIconContainer,
            { backgroundColor: themeColors.iconBg }
          ]}>
            <MCIcon 
              name="chat-outline" 
              size={18} 
              color={themeColors.primary} 
            />
          </View>
          <Text style={[
            styles.historyItemName,
            { color: themeColors.text }
          ]}>
            {item.name}
          </Text>
        </View>
        <View style={styles.historyItemDetails}>
          <View style={styles.historyItemMeta}>
            <Icon 
              name="access-time" 
              size={14} 
              color={themeColors.secondary} 
            />
            <Text style={[
              styles.historyItemDate,
              { color: themeColors.textSecondary }
            ]}>
              {item.date}
            </Text>
          </View>
          <View style={styles.historyItemMeta}>
            <Icon 
              name="message" 
              size={14} 
              color={themeColors.accent} 
            />
            <Text style={[
              styles.historyItemMessages,
              { color: themeColors.textSecondary }
            ]}>
              {item.messages} messages
            </Text>
          </View>
        </View>
      </View>
      <Icon 
        name="chevron-right" 
        size={20} 
        color={themeColors.textSecondary} 
      />
    </TouchableOpacity>
  );

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Function to handle sending a message
  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate bot typing and then responding
    setTimeout(() => {
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputText.trim().toLowerCase()),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);
      setIsTyping(false);
    }, 1000); // Simulate a delay for the bot response
  };

  // Function to get a response from the bot
  const getBotResponse = (input) => {
    // Check for keywords in the input
    for (const [keyword, response] of Object.entries(BOT_RESPONSES)) {
      if (input.includes(keyword)) {
        return response;
      }
    }
    return BOT_RESPONSES.default;
  };

  // Render an individual message
  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.messageRow,
        isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
      ]}>
        {!isUser && (
          <View style={[styles.botIconCircle, { backgroundColor: TEAL }]}> 
            <MCIcon name="robot-outline" size={22} color={WHITE} />
          </View>
        )}
        <View style={[
          isUser ? styles.userBubble : styles.messageBubble,
          isUser
            ? { backgroundColor: TEAL, marginLeft: 40 }
            : { 
                backgroundColor: isDarkMode ? theme.surface : LIGHT_TEAL, 
                borderBottomLeftRadius: 4, 
                marginRight: 8 
              }
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? { color: WHITE } : { color: isDarkMode ? theme.text : TEXT_DARK }
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timestampText,
            { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(23,43,77,0.5)', textAlign: 'right' }
          ]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  // Render the bot typing indicator
  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={[styles.messageRow, { justifyContent: 'flex-start' }]}> 
        <View style={[styles.botIconCircle, { backgroundColor: TEAL }]}> 
          <MCIcon name="robot-outline" size={22} color={WHITE} />
        </View>
        <View style={[
          styles.messageBubble, 
          { 
            backgroundColor: isDarkMode ? theme.surface : LIGHT_TEAL, 
            borderBottomLeftRadius: 4, 
            marginRight: 8 
          }
        ]}> 
          <View style={styles.typingDotsContainer}>
            <View style={[styles.typingDot, { backgroundColor: TEAL }]} />
            <View style={[styles.typingDot, { backgroundColor: TEAL, opacity: 0.7 }]} />
            <View style={[styles.typingDot, { backgroundColor: TEAL, opacity: 0.4 }]} />
          </View>
        </View>
      </View>
    );
  };

  const handleSuggestionPress = (suggestion) => {
    setInputText(suggestion);
  };

  // Height of the bottom bar (suggestions + input bar)
  const BOTTOM_BAR_HEIGHT = 110;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? theme.background : BG_LIGHT }]}>
      {/* History Panel with enhanced colors */}
      <Animated.View
        style={[
          styles.historyPanel,
          {
            transform: [{ translateX: slideAnim }],
            backgroundColor: themeColors.surface,
            borderLeftWidth: 1,
            borderLeftColor: themeColors.border,
          }
        ]}
      >
        <View style={[
          styles.historyHeader,
          { 
            borderBottomColor: themeColors.border,
            backgroundColor: themeColors.surface,
          }
        ]}>
          <View style={styles.historyTitleContainer}>
            <MCIcon 
              name="history" 
              size={24} 
              color={themeColors.primary} 
              style={styles.historyTitleIcon}
            />
            <Text style={[
              styles.historyTitle,
              { color: themeColors.text }
            ]}>
              Chat History
            </Text>
          </View>
          <TouchableOpacity 
            onPress={toggleHistory} 
            style={[
              styles.closeButton,
              { backgroundColor: themeColors.closeButtonBg }
            ]}
          >
            <Icon name="close" size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <View style={[
          styles.searchContainer,
          { 
            backgroundColor: themeColors.searchBg,
            borderColor: themeColors.border,
          }
        ]}>
          <Icon name="search" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: themeColors.text }
            ]}
            placeholder="Search conversations..."
            placeholderTextColor={themeColors.textSecondary}
            value={historySearch}
            onChangeText={setHistorySearch}
          />
        </View>

        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
            backgroundColor: isDarkMode ? '#000' : '#000',
          }
        ]}
        pointerEvents={showHistory ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={toggleHistory}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Header with back and history icons */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: isDarkMode ? theme.background : WHITE,
          borderBottomColor: isDarkMode ? theme.border : LIGHT_TEAL
        }
      ]}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={26} color={isDarkMode ? theme.text : TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? theme.text : TEXT_DARK }]}>Ask KARE</Text>
          <Text style={[styles.headerSubtitle, { color: isDarkMode ? theme.textSecondary : TEXT_SECONDARY }]}>
            Get quick answers about campus
          </Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={toggleHistory}>
          <Icon name="history" size={26} color={isDarkMode ? theme.text : TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={styles.keyboardAvoidView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.messagesList, { paddingBottom: BOTTOM_BAR_HEIGHT }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderTypingIndicator}
          onLayout={() => flatListRef.current?.scrollToEnd({animated: true})}
          ListFooterComponentStyle={{paddingBottom: 16}}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>

      {/* Bottom fixed suggestion chips and input bar */}
      <View style={styles.bottomBarWrapper}>
        {/* Suggestion Chips */}
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={SUGGESTIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.suggestionChip, 
                  { 
                    backgroundColor: isDarkMode ? theme.surface : WHITE,
                    borderColor: isDarkMode ? theme.border : LIGHT_TEAL
                  }
                ]}
                onPress={() => handleSuggestionPress(item)}
              >
                <Text style={[styles.suggestionChipText, { color: TEAL }]}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 10 }}
          />
        </View>
        {/* Input Bar */}
        <View style={styles.inputBarWrapper}>
          <View style={[
            styles.inputBar,
            { backgroundColor: isDarkMode ? theme.surface : '#EDF2F7' }
          ]}>
            <TextInput
              style={[
                styles.input,
                { 
                  color: isDarkMode ? theme.text : TEXT_DARK,
                  backgroundColor: 'transparent'
                }
              ]}
              placeholder="Ask a question..."
              placeholderTextColor={isDarkMode ? theme.textSecondary : TEXT_SECONDARY}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onFocus={() => flatListRef.current?.scrollToEnd({animated: true})}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() === '' && styles.sendButtonDisabled,
              { backgroundColor: TEAL }
            ]}
            onPress={handleSendMessage}
            disabled={inputText.trim() === ''}
          >
            <Icon name="send" size={26} color={WHITE} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    elevation: 0,
    zIndex: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  keyboardAvoidView: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    paddingTop:10
  },
  messageRow: {
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  botIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  userBubble: {
    maxWidth: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestampText: {
    fontSize: 10,
    marginTop: 4,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    marginTop: 2,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  bottomBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    marginBottom: 70,
    zIndex: 10,
  },
  suggestionChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginVertical: 2,
    borderWidth: 1.5,
  },
  suggestionChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 18,
    paddingTop: 8,
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  inputBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 35, // let send button overlap
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 24,
    maxHeight: 100,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -22, // overlap input bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
    opacity: 1.0,
  },
  sendButtonDisabled: {
    opacity: 1.0,
  },
  historyPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 300,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  overlayTouchable: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitleIcon: {
    marginRight: 8,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
  },
  historyList: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  historyItemContent: {
    flex: 1,
    marginRight: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  historyItemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  historyItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  historyItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyItemDate: {
    fontSize: 13,
  },
  historyItemMessages: {
    fontSize: 13,
  },
});

export default ChatBotScreen; 