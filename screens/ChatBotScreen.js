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
  SafeAreaView
} from 'react-native';

// Define the color scheme consistent with the app
const COLORS = {
  primary: '#0052cc', // Main blue
  secondary: '#ffffff', // White
  accent: '#4c9aff', // Light blue
  text: '#172b4d', // Dark blue-gray for text
  background: '#f4f5f7', // Light gray background
  error: '#ff5630', // Red for errors
  userBubble: '#0052cc', // User message bubble color
  botBubble: '#E4E7ED', // Bot message bubble color
};

// Initial messages to show in the chat
const INITIAL_MESSAGES = [
  {
    id: '1',
    text: 'Hello! I am KARE Bot. How can I help you today?',
    sender: 'bot',
    timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  },
];

// Mock responses for the chatbot - in a real app, this would be replaced with actual AI
const BOT_RESPONSES = {
  'hello': 'Hi there! How can I assist you with KARE University today?',
  'hi': 'Hello! What can I help you with?',
  'help': 'I can help you with information about courses, faculty, campus facilities, schedules, and more. Just ask!',
  'faculty': 'You can check faculty availability in the Faculty tab. Is there a specific faculty member you\'re looking for?',
  'course': 'KARE University offers various courses across Computer Science, Electronics, Mathematics, Physics, Chemistry, and Engineering departments. Which department are you interested in?',
  'admission': 'For admission inquiries, please provide your specific question or visit our website at klu.ac.in/admissions',
  'schedule': 'Class schedules are available on the university portal. You can log in with your student credentials to view your personalized schedule.',
  'exam': 'Examination schedules are typically posted 2 weeks before the exam period. You can check the academic calendar on the university portal.',
  'location': 'Kalasalingam University is located in Krishnankoil, Tamil Nadu, India.',
  'contact': 'You can contact the university at +91-XX-XXXXXXXX or email at info@klu.ac.in',
  'default': 'I\'m not sure about that. Could you please rephrase or ask something else about KARE University?'
};

const ChatBotScreen = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

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
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
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
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
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
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.botMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.botMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timestampText,
            isUser ? styles.userTimestampText : styles.botTimestampText
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
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>KARE Bot is typing</Text>
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.typingIndicator} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KARE Bot</Text>
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
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderTypingIndicator}
          onLayout={() => flatListRef.current?.scrollToEnd({animated: true})}
          ListFooterComponentStyle={{paddingBottom: 16}}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onFocus={() => flatListRef.current?.scrollToEnd({animated: true})}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() === '' && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={inputText.trim() === ''}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  keyboardAvoidView: {
    flex: 1,
    position: 'relative',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  messageContainer: {
    marginVertical: 5,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: COLORS.botBubble,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: COLORS.secondary,
  },
  botMessageText: {
    color: COLORS.text,
  },
  timestampText: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestampText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  botTimestampText: {
    color: 'rgba(23, 43, 77, 0.5)',
    textAlign: 'right',
  },
  typingContainer: {
    marginVertical: 5,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  typingBubble: {
    backgroundColor: COLORS.botBubble,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
    marginRight: 5,
  },
  typingIndicator: {
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: COLORS.secondary,
    zIndex: 999,
    elevation: 8,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 50,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.accent,
    opacity: 0.5,
  },
  sendButtonText: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
});

export default ChatBotScreen; 