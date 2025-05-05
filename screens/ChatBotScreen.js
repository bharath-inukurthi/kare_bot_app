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
  Animated
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

const ChatBotScreen = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const { isDarkMode, theme } = useTheme();

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
        <TouchableOpacity style={styles.headerIcon} onPress={() => {/* show history */}}>
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
});

export default ChatBotScreen; 