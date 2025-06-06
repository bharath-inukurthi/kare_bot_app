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
  Dimensions,
  Linking,
  Image,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-native-markdown-display';
import supabase from '../lib/supabase';

// API Configuration
const API_BASE_URL = 'https://kare-chat-bot.onrender.com';

// API Functions
const createSession = async (userUuid, firstQuestion) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${userUuid}/session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ first_question: firstQuestion }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      console.log('Non-JSON response:', text);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

const getSessions = async (userUuid) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/user/${userUuid}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      console.log('Non-JSON response:', text);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

const addMessage = async (sessionId, role, content) => {
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/message/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, role }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      console.log('Non-JSON response:', text);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

const getMessages = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/messages`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      console.log('Non-JSON response:', text);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Add new API functions for metadata
const updateSessionMetadata = async (sessionId, metadata) => {
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/metadata/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meta_data: metadata }),
    });
    console.log(JSON.stringify({ meta_data: metadata }));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating session metadata:', error);
    throw error;
  }
};

const getSessionMetadata = async (sessionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/metadata`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching session metadata:', error);
    throw error;
  }
};

// WebSocket connection for real-time chat
const connectWebSocket = (onMessage) => {
  const ws = new WebSocket('wss://kare-chat-bot.onrender.com/ws/chat');
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      onMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = (event) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
  };
  
  return ws;
};

// Move color constants outside
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

// Move HISTORY_COLORS outside
const HISTORY_COLORS = {
  light: {
    primary: TEAL,
    secondary: '#60A5FA',
    accent: '#F59E0B',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: TEXT_DARK,
    textSecondary: '#64748B',
    iconBg: '#E5FAF6',
    searchBg: '#F1F5F9',
    closeButtonBg: '#F1F5F9',
    cardBg: WHITE,
    cardBorder: '#E2E8F0',
    cardHover: '#F8FAFC',
    messageBg: '#F8FAFC',
    userMessageBg: TEAL,
    botMessageBg: '#FFFFFF',
    inputBg: '#F1F5F9',
    headerBg: '#FFFFFF',
    headerBorder: '#E2E8F0',
    sourcesBg: '#F8FAFC',
    sourcesBorder: '#E2E8F0',
    sourcesHeaderBg: '#F1F5F9',
    sourcesText: '#0F172A',
    sourcesIconBg: '#E5FAF6',
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
    messageBg: '#1A2536',
    userMessageBg: TEAL,
    botMessageBg: '#2D3748',
    inputBg: '#1A2536',
    headerBg: '#1A2536',
    headerBorder: '#2D3748',
    sourcesBg: '#1A2536',
    sourcesBorder: '#2D3748',
    sourcesHeaderBg: '#2D3748',
    sourcesText: '#E2E8F0',
    sourcesIconBg: '#1E3A8A',
  }
};

// Remove initial messages
const INITIAL_MESSAGES = [];

// Mock responses for the chatbot - in a real app, this would be replaced with actual AI
const BOT_RESPONSES = {
  'class timings': 'Here are your class timings for today:\n\n• 9:00 AM - Mathematics\n• 11:00 AM - Physics\n• 2:00 PM - Computer Science',
  'library hours': 'The library is open today from 8:00 AM to 10:00 PM. Would you like to know about other campus facilities?',
  'hello': 'Hi there! How can I assist you with KARE University today?',
  'hi': 'Hello! What can I help you with?',
  'help': 'I can help you with information about courses, faculty, campus facilities, schedules, and more. Just ask!',
  'default': 'I\'m not sure about that. Could you please rephrase or ask something else about KARE University?'
};

// Mock history data - replace with actual data in production
const MOCK_HISTORY = [
  { id: '1', name: 'Class Schedule Discussion', date: '2024-03-20', messages: 12 },
  { id: '2', name: 'Library Hours Query', date: '2024-03-19', messages: 8 },
  { id: '3', name: 'Exam Schedule Help', date: '2024-03-18', messages: 15 },
  { id: '4', name: 'Campus Facilities Info', date: '2024-03-17', messages: 10 },
];

// Add these new functions after the existing API functions
const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.readonly',
      },
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

const searchGmailMessages = async (searchQuery) => {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.provider_token;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Parse the search query if it's a JSON string
    let searchParams;
    try {
      searchParams = typeof searchQuery === 'string' ? JSON.parse(searchQuery) : searchQuery;
    } catch (e) {
      // If not JSON, use the original search query
      searchParams = { answer: { subject: searchQuery } };
    }

    // Extract search parameters from the bot response
    const { answer } = searchParams;
    if (!answer) {
      throw new Error('Invalid search parameters');
    }

    // Construct Gmail search query
    const queryParts = [];
    
    if (answer.after_date) {
      const afterDate = answer.after_date.replace(/-/g, '/');
      queryParts.push(`after:${afterDate}`);
    }
    
    if (answer.before_date) {
      const beforeDate = answer.before_date.replace(/-/g, '/');
      queryParts.push(`before:${beforeDate}`);
    }
    
    if (answer.received_by) {
      queryParts.push(`from:${answer.received_by}`);
    }
    
    if (answer.subject) {
      queryParts.push(`subject:"${answer.subject}"`);
    }

    const finalQuery = queryParts.join(' ');
    console.log('Constructed Gmail search query:', finalQuery);

    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(finalQuery)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch Gmail messages');
    }

    const messages = await res.json();
    return messages?.messages || [];
  } catch (error) {
    console.error('Error searching Gmail messages:', error);
    throw error;
  }
};

const buildGmailLink = (messageId) => {
  return `https://mail.google.com/mail/u/0/#all/${messageId}`;
};

// Add this new function after the existing API functions
const fetchGmailMessage = async (accessToken, messageId) => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Gmail message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Gmail message:', error);
    throw error;
  }
};

const ChatBotScreen = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [userUuid, setUserUuid] = useState(null);
  const wsRef = useRef(null);
  const flatListRef = useRef(null);
  const sessionIdRef = useRef(null);
  const navigation = useNavigation();
  const { isDarkMode, theme } = useTheme();
  const themeColors = isDarkMode ? HISTORY_COLORS.dark : HISTORY_COLORS.light;

  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Add new state for citations
  const [citations, setCitations] = useState([]);

  // Add new state for session sources
  const [sessionSources, setSessionSources] = useState([]);

  // Add new state for sources expansion
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  // Add new state for streaming text
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingTimeout = useRef(null);

  // Add new state for new conversation
  const [isNewConversation, setIsNewConversation] = useState(false);

  // Add this new state variable
  const [isGmailAuthenticated, setIsGmailAuthenticated] = useState(false);
  const [gmailMessages, setGmailMessages] = useState([]);

  // Initialize user UUID and load last session
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUuid = await AsyncStorage.getItem('currentUserUuid');
        if (!storedUuid) {
          console.error('No user UUID found');
          return;
        }
        setUserUuid(storedUuid);

        // Load last session ID
        const lastSessionId = await AsyncStorage.getItem('lastSessionId');
        if (lastSessionId) {
          setCurrentSessionId(lastSessionId);
          sessionIdRef.current = lastSessionId;
          // Load messages for the last session
          const sessionMessages = await getMessages(lastSessionId);
          const formattedMessages = sessionMessages.map(msg => ({
            text: msg.content,
            sender: msg.role === 'user' ? 'user' : 'ai',
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };
    initializeUser();
  }, []);

  // Save session ID when it changes
  useEffect(() => {
    if (currentSessionId) {
      AsyncStorage.setItem('lastSessionId', currentSessionId);
    }
  }, [currentSessionId]);

  // Load sessions when history panel is opened
  const loadSessions = async () => {
    if (!userUuid) return;
    
    try {
      const userSessions = await getSessions(userUuid);
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Toggle history panel
  const toggleHistory = async () => {
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

    if (!showHistory) {
      // Load sessions when opening history panel
      await loadSessions();
    }

    setShowHistory(!showHistory);
  };

  // Load messages for a session
  const loadSessionMessages = async (sessionId) => {
    try {
      const sessionMessages = await getMessages(sessionId);
      
      const formattedMessages = sessionMessages.map(msg => ({
        text: msg.content,
        sender: msg.role === 'user' ? 'user' : 'ai',
      }));
      
      setMessages(formattedMessages);
      setCurrentSessionId(sessionId);
      toggleHistory();
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  };

  // Update the WebSocket connection and message handling
  useEffect(() => {
    if (userUuid) {
      console.log('Initializing WebSocket connection...');
      wsRef.current = connectWebSocket((data) => {
        if (data.status === 'routing') {
          setCurrentTool(data.current_tool);
          setIsTyping(true);
        } else if (data.status === 'streaming') {
          setIsStreaming(true);
          setStreamingText(prev => prev + data.chunk);
          // Scroll to bottom when streaming
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        } else if (data.status === 'done' && data.answer) {
          setCurrentTool(null);
          setIsStreaming(false);
          
          // Extract citation data from bot response
          const citationData = {
            source: data.answer.source,
            subject: data.answer.subject,
            received_on: data.answer.received_on,
            received_by: data.answer.received_by,
            after_date: data.answer.after_date,
            before_date: data.answer.before_date,
            has_attachment: data.answer.has_attachment,
            attachments: data.answer.has_attachment === 1 ? data.answer.attachments : []
          };

          // Add to session sources if it's a new source
          if (citationData.source) {
            setSessionSources(prevSources => {
              const sourceExists = prevSources.some(
                source => source.subject === citationData.subject && 
                         source.received_on === citationData.received_on
              );
              if (!sourceExists) {
                const newSources = [...prevSources, citationData];
                
                // Update metadata with new sources
                if (sessionIdRef.current) {
                  updateSessionMetadata(sessionIdRef.current, citationData)
                    .catch(error => console.error('Error updating session metadata:', error));
                }
                
                return newSources;
              }
              return prevSources;
            });

            // If the source is Mail, construct and execute Gmail search
            if (citationData.source === 'Mail' && citationData.subject) {
              const searchQuery = {
                answer: {
                  after_date: citationData.after_date,
                  before_date: citationData.before_date,
                  received_by: citationData.received_by,
                  subject: citationData.subject
                }
              };
              handleGmailSearch(searchQuery);
            }
          }
          
          const finalText = streamingText || data.answer.answer;
          const botMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: finalText,
            sender: 'ai',
            citation: citationData
          };
          
          setMessages(prevMessages => [...prevMessages, botMessage]);
          setStreamingText('');
          setIsTyping(false);

          // Add AI message to the session using the ref
          if (sessionIdRef.current) {
            console.log('Adding AI message to session:', sessionIdRef.current);
            addMessage(sessionIdRef.current, 'ai', finalText)
              .then(response => {
                console.log('Successfully added AI message to session:', response);
              })
              .catch(error => {
                console.error('Error adding AI message to session:', error);
              });
          } else {
            console.error('No session ID available for AI message');
          }
        }
      });

      // Cleanup function
      return () => {
        if (wsRef.current) {
          console.log('Closing WebSocket connection...');
          wsRef.current.close();
        }
        if (streamingTimeout.current) {
          clearTimeout(streamingTimeout.current);
        }
      };
    }
  }, [userUuid]); // Only depend on userUuid for connection

  // Update session ID effect to also update the ref
  useEffect(() => {
    if (currentSessionId) {
      sessionIdRef.current = currentSessionId;
      console.log('Session ID updated:', currentSessionId);
    }
  }, [currentSessionId]);

  // Start shimmer animation
  useEffect(() => {
    if (currentTool) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [currentTool]);

  // Add this new useEffect for Gmail authentication
  useEffect(() => {
    const checkGmailAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsGmailAuthenticated(!!data.session?.provider_token);
      } catch (error) {
        console.error('Error checking Gmail auth:', error);
        setIsGmailAuthenticated(false);
      }
    };

    checkGmailAuth();
  }, []);

  // Add this new function to handle Gmail authentication
  const handleGmailAuth = async () => {
    try {
      await signInWithGoogle();
      setIsGmailAuthenticated(true);
      showSnackbar('Successfully connected to Gmail', 'success');
    } catch (error) {
      console.error('Error authenticating with Gmail:', error);
      showSnackbar('Failed to connect to Gmail', 'error');
    }
  };

  // Add this new function to handle Gmail message search
  const handleGmailSearch = async (query) => {
    try {
      const messages = await searchGmailMessages(query);
      setGmailMessages(messages);
      
      if (messages.length > 0) {
        const gmailLink = buildGmailLink(messages[0].id);
        Linking.openURL(gmailLink);
      } else {
        showSnackbar('No matching messages found', 'error');
      }
    } catch (error) {
      console.error('Error searching Gmail:', error);
      showSnackbar('Failed to search Gmail messages', 'error');
    }
  };

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !userUuid) return;

    try {
      // Check if the message is a Gmail search request
      if (inputText.toLowerCase().includes('search gmail') || inputText.toLowerCase().includes('find email')) {
        if (!isGmailAuthenticated) {
          await handleGmailAuth();
        }
        await handleGmailSearch(inputText);
      }

      let sessionId = currentSessionId;
      
      // Create new session if this is the first message or if we're starting a new conversation
      if (!sessionId || isNewConversation) {
        console.log('Creating new session for message:', inputText.trim());
        const sessionData = await createSession(userUuid, inputText.trim());
        if (!sessionData || !sessionData.session_id) {
          throw new Error('Invalid session data received');
        }
        sessionId = sessionData.session_id;
        setCurrentSessionId(sessionId);
        sessionIdRef.current = sessionId;
        setIsNewConversation(false); // Reset the new conversation flag
        console.log('New session created with ID:', sessionId);
      } else {
        // Add user message to the existing session
        await addMessage(sessionId, 'user', inputText.trim());
        console.log('User message added to session:', sessionId);
      }

      // Add user message to UI
      const userMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: inputText.trim(),
        sender: 'user',
      };

      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInputText('');
      setIsTyping(true);

      // Send message through WebSocket with session ID
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('Sending message through WebSocket:', inputText.trim());
        wsRef.current.send(JSON.stringify({
          question: inputText.trim(),
          session_id: sessionId
        }));
      } else {
        console.error('WebSocket is not connected');
        // Add error message
        const errorMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: 'Sorry, there was an error processing your message. Please try again.',
          sender: 'ai',
        };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setIsTyping(false);
      showSnackbar('Failed to process message', 'error');
    }
  };

  // Filter history based on search
  const filteredHistory = sessions.filter(item => 
    item.session_title.toLowerCase().includes(historySearch.toLowerCase())
  );

  // Render history item with enhanced colors
  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.historyItem,
        { 
          backgroundColor: themeColors.cardBg,
          borderColor: themeColors.cardBorder,
          borderLeftWidth: item.session_id === currentSessionId ? 6 : 1,
          borderLeftColor: item.session_id === currentSessionId ? themeColors.primary : themeColors.cardBorder,
          paddingLeft: item.session_id === currentSessionId ? 16 : 12,
        }
      ]}
      onPress={() => loadSessionMessages(item.session_id)}
    >
      {item.session_id === currentSessionId && (
        <View style={[
          styles.currentSessionIndicator,
          { backgroundColor: themeColors.primary }
        ]} />
      )}
      <View style={styles.historyItemContent}>
        <Text style={[
          styles.historyItemName,
          { 
            color: themeColors.text,
            fontWeight: item.session_id === currentSessionId ? '700' : '500',
            fontSize: item.session_id === currentSessionId ? 16 : 15,
          }
        ]}>
          {item.session_title}
        </Text>
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

  // Add this function near the top of the component
  const handleLinkPress = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Error opening URL:', err));
    }
  };

  // Update the renderMessage function to fix syntax and styling
  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageRow,
        isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
      ]}>
        <View style={[
          isUser ? styles.userBubble : styles.messageBubble,
          isUser
            ? { 
                backgroundColor: themeColors.userMessageBg,
                maxWidth: '70%'
              }
            : { 
                backgroundColor: themeColors.botMessageBg, 
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 20,
                maxWidth: '100%',
                paddingHorizontal: 8,
                paddingVertical: 8,
                elevation: 0
              }
        ]}>
          {!isUser ? (
            <View style={styles.markdownContainer}>
              <Markdown
                style={{
                  body: { 
                    color: themeColors.text,
                    fontSize: 16,
                    lineHeight: 22,
                    textAlign: 'left'
                  },
                  code_inline: { 
                    backgroundColor: themeColors.searchBg,
                    padding: 4,
                    borderRadius: 4,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
                  },
                  code_block: {
                    backgroundColor: themeColors.searchBg,
                    padding: 8,
                    borderRadius: 4,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
                  },
                  paragraph: {
                    marginVertical: 4
                  },
                  link: {
                    color: themeColors.primary,
                    textDecorationLine: 'underline'
                  },
                  table: {
                    borderWidth: 1,
                    borderColor: themeColors.border
                  },
                  tr: {
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.border
                  },
                  th: {
                    padding: 8,
                    borderRightWidth: 1,
                    borderRightColor: themeColors.border
                  },
                  td: {
                    padding: 8,
                    borderRightWidth: 1,
                    borderRightColor: themeColors.border
                  }
                }}
                onLinkPress={handleLinkPress}
              >
                {item.text}
              </Markdown>
            </View>
          ) : (
            <Text 
              style={[
                styles.messageText,
                { color: WHITE }
              ]}
              selectable={true}
            >
              {item.text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Update the renderTypingIndicator to ensure text selection works
  const renderTypingIndicator = () => {
    if (!isTyping && !isStreaming) return null;

    return (
      <View style={[styles.messageRow, { justifyContent: 'flex-start' }]}> 
        <View style={[
          styles.messageBubble, 
          { 
            backgroundColor: themeColors.cardBg, 
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 20,
            maxWidth: '100%',
            paddingHorizontal: 8,
            paddingVertical: 8
          }
        ]}> 
          {currentTool ? (
            <View style={styles.toolLoadingContainer}>
              <Animated.View
                style={[
                  styles.shimmerContainer,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ]}
              >
                <Text 
                  style={[
                    styles.toolLoadingText,
                    { 
                      color: themeColors.text,
                      userSelect: 'text',
                      selectable: true
                    }
                  ]}
                  selectable={true}
                  textSelectable={true}
                >
                  Using {currentTool.replace(/_/g, ' ')}...
                </Text>
              </Animated.View>
            </View>
          ) : isStreaming ? (
            <View style={styles.markdownContainer}>
              <Markdown
                style={{
                  body: { 
                    color: themeColors.text,
                    fontSize: 16,
                    lineHeight: 22,
                    textAlign: 'left'
                  },
                  code_inline: { 
                    backgroundColor: themeColors.searchBg,
                    padding: 4,
                    borderRadius: 4,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
                  },
                  code_block: {
                    backgroundColor: themeColors.searchBg,
                    padding: 8,
                    borderRadius: 4,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
                  },
                  paragraph: {
                    marginVertical: 4
                  },
                  link: {
                    color: themeColors.primary,
                    textDecorationLine: 'underline'
                  },
                  table: {
                    borderWidth: 1,
                    borderColor: themeColors.border
                  },
                  tr: {
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.border
                  },
                  th: {
                    padding: 8,
                    borderRightWidth: 1,
                    borderRightColor: themeColors.border
                  },
                  td: {
                    padding: 8,
                    borderRightWidth: 1,
                    borderRightColor: themeColors.border
                  }
                }}
                onLinkPress={handleLinkPress}
              >
                {streamingText}
              </Markdown>
            </View>
          ) : (
            <View style={styles.typingDotsContainer}>
              <View style={[styles.typingDot, { backgroundColor: themeColors.primary }]} />
              <View style={[styles.typingDot, { backgroundColor: themeColors.primary, opacity: 0.7 }]} />
              <View style={[styles.typingDot, { backgroundColor: themeColors.primary, opacity: 0.4 }]} />
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleSuggestionPress = (suggestion) => {
    setInputText(suggestion);
  };

  // Height of the bottom bar (suggestions + input bar)
  const BOTTOM_BAR_HEIGHT = 110;

  // Update the handleSourceClick function
  const handleSourceClick = async (citation) => {
    if (citation.source === 'Mail') {
      try {
        // Get the current session
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.provider_token;

        if (!accessToken) {
          console.error('No access token available');
          return;
        }

        // Construct Gmail search query
        const queryParts = [];
        
        if (citation.after_date) {
          const afterDate = citation.after_date.replace(/-/g, '/');
          queryParts.push(`after:${afterDate}`);
        }
        
        if (citation.before_date) {
          const beforeDate = citation.before_date.replace(/-/g, '/');
          queryParts.push(`before:${beforeDate}`);
        }
        
        if (citation.received_by) {
          queryParts.push(`from:${citation.received_by}`);
        }
        
        if (citation.subject) {
          queryParts.push(`subject:"${citation.subject}"`);
        }

        const finalQuery = queryParts.join(' ');
        console.log('Constructed Gmail search query:', finalQuery);

        // Search for messages
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(finalQuery)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to search Gmail messages');
        }

        const searchResult = await response.json();
        const messages = searchResult.messages || [];

        if (messages.length > 0) {
          // Get the first matching message
          const message = await fetchGmailMessage(accessToken, messages[0].id);
          
          // Construct Gmail URL with message ID
          const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${message.id}`;
          console.log('Opening Gmail URL:', gmailUrl);
          
          // Open the Gmail message in the default browser
          await Linking.openURL(gmailUrl);
        } else {
          console.log('No matching messages found');
          // Show a message to the user that no matching emails were found
          Alert.alert(
            'No Messages Found',
            'No matching emails were found in your Gmail account.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error handling Gmail source click:', error);
        Alert.alert(
          'Error',
          'Failed to open the email. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Update renderSessionSources function to include attachments
  const renderSessionSources = () => {
    if (sessionSources.length === 0) return null;

    return (
      <View style={[
        styles.sessionSourcesContainer,
        { 
          backgroundColor: themeColors.sourcesBg,
          borderColor: themeColors.sourcesBorder,
        }
      ]}>
        <TouchableOpacity 
          style={[
            styles.sessionSourcesHeader,
            { backgroundColor: themeColors.sourcesHeaderBg }
          ]}
          onPress={() => setIsSourcesExpanded(!isSourcesExpanded)}
        >
          <View style={styles.sessionSourcesTitleContainer}>
            <View style={[
              styles.historyItemIconContainer,
              { backgroundColor: themeColors.sourcesIconBg }
            ]}>
              <Icon name="info" size={20} color={themeColors.primary} />
            </View>
            <Text style={[
              styles.sessionSourcesTitle,
              { color: themeColors.text }
            ]}>
              Sources
            </Text>
          </View>
          <Icon 
            name={isSourcesExpanded ? "expand-less" : "expand-more"} 
            size={24} 
            color={themeColors.textSecondary} 
          />
        </TouchableOpacity>
        
        {isSourcesExpanded && (
          <View style={styles.sourcesList}>
            {sessionSources.map((source, index) => (
              <View key={`source-${source.source}-${index}-${Math.random().toString(36).substr(2, 9)}`}>
                <TouchableOpacity
                  style={[
                    styles.sourceItem,
                    { 
                      backgroundColor: themeColors.cardBg,
                      borderColor: themeColors.sourcesBorder,
                    }
                  ]}
                  onPress={() => {
                    handleSourceClick(source);
                  }}
                >
                  <View style={styles.sourceHeader}>
                    <Icon name="mail-outline" size={18} color={themeColors.primary} />
                    <Text style={[styles.sourceType, { color: themeColors.textSecondary }]}>
                      {source.source}
                    </Text>
                  </View>
                  <Text style={[styles.sourceSubject, { color: themeColors.text }]}>
                    {source.subject}
                  </Text>
                  <Text style={[styles.sourceDate, { color: themeColors.textSecondary }]}>
                    Received: {source.received_on}
                  </Text>
                </TouchableOpacity>
                
                {source.has_attachment === 1 && source.attachments && (
                  <View style={styles.sourceAttachmentsContainer}>
                    <Text style={[styles.attachmentsTitle, { color: themeColors.textSecondary }]}>
                      Attachments:
                    </Text>
                    {source.attachments.map((attachment, index) => (
                      <TouchableOpacity
                        key={`attachment-${attachment.file_name}-${index}-${Math.random().toString(36).substr(2, 9)}`}
                        style={[
                          styles.attachmentItem,
                          { backgroundColor: themeColors.sourcesHeaderBg }
                        ]}
                        onPress={() => handleLinkPress(attachment.link)}
                      >
                        <Icon name="attachment" size={16} color={themeColors.primary} />
                        <Text style={[styles.attachmentText, { color: themeColors.primary }]}>
                          {attachment.file_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Add function to start new conversation
  const startNewConversation = async () => {
    try {
      // Clear the last session ID
      await AsyncStorage.removeItem('lastSessionId');
      setMessages([]);
      setCurrentSessionId(null);
      sessionIdRef.current = null;
      setSessionSources([]);
      setIsNewConversation(true);
      toggleHistory();
    } catch (error) {
      console.error('Error starting new conversation:', error);
    }
  };

  // Add this useEffect after the existing useEffects
  useEffect(() => {
    const loadSessionMetadata = async () => {
      if (currentSessionId) {
        try {
          const metadata = await getSessionMetadata(currentSessionId);
          if (metadata && metadata.meta_data) {
            setSessionSources([metadata.meta_data]);
          } else {
            setSessionSources([]);
          }
        } catch (error) {
          console.error('Error loading session metadata:', error);
          setSessionSources([]);
        }
      }
    };

    loadSessionMetadata();
  }, [currentSessionId]); // This will run whenever currentSessionId changes

  // Move styles inside component
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 16,
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      elevation: 2,
      zIndex: 10,
    },
    headerIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
    },
    headerSubtitle: {
      fontSize: 14,
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
      marginVertical: 4, // Reduced vertical margin
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 8, // Reduced horizontal padding
    },
    messageBubble: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 8,
      marginBottom: 2,
      elevation: 0, // Remove shadow for bot messages
    },
    userBubble: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 2,
      elevation: 1, // Keep shadow for user messages
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      userSelect: 'text',
      selectable: true,
      textSelectable: true
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
    },
    inputBarCard: {
      borderRadius: 24,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    inputBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    inputBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
      marginRight: 48,
    },
    input: {
      flex: 1,
      fontSize: 16,
      minHeight: 24,
      maxHeight: 100,
      paddingVertical: 0,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -32,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
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
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
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
      flex: 1,
    },
    historyTitleIcon: {
      marginRight: 12,
    },
    historyTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginLeft: 12,
    },
    closeButton: {
      padding: 10,
      borderRadius: 20,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      marginLeft: 12,
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
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      elevation: 1,
    },
    historyItemContent: {
      flex: 1,
      marginRight: 8,
    },
    historyItemName: {
      fontSize: 15,
      fontWeight: '500',
      flex: 1,
    },
    currentSessionIndicator: {
      width: 6,
      height: '150%',
      position: 'absolute',
      left: 0,
      top: 0,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    emptyHistoryContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyHistoryText: {
      fontSize: 16,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: 12,
    },
    emptyHistorySubText: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      opacity: 0.7,
    },
    citationContainer: {
      marginTop: 8,
      padding: 12,
      borderRadius: 12,
    },
    citationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    citationText: {
      fontSize: 13,
      marginLeft: 6,
    },
    citationDetail: {
      fontSize: 13,
      marginLeft: 22,
      marginTop: 2,
    },
    sessionSourcesContainer: {
      marginTop: 8,
      padding: 8,
      marginHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    sessionSourcesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 4,
    },
    sessionSourcesTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sessionSourcesTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    sourcesList: {
      marginTop: 4,
    },
    sourceItem: {
      marginBottom: 8,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    sourceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    sourceType: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 6,
    },
    sourceSubject: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
    },
    sourceDate: {
      fontSize: 12,
      marginTop: 2,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    botLogoContainer: {
      alignItems: 'center',
      marginBottom: 48,
    },
    botLogoCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    botLogo: {
      width: '100%',
      height: '100%',
      borderRadius: 48,
    },
    botName: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    botTagline: {
      fontSize: 18,
      textAlign: 'center',
    },
    inputContainer: {
      width: '100%',
      paddingHorizontal: 16,
    },
    toolLoadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minWidth: 200,
    },
    toolLoadingText: {
      fontSize: 14,
      marginRight: 8,
    },
    shimmerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minWidth: 200,
    },
    gmailLink: {
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
      backgroundColor: themeColors.searchBg,
    },
    gmailLinkText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    attachmentsContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
    },
    attachmentsTitle: {
      fontSize: 13,
      marginBottom: 4,
    },
    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginTop: 4,
    },
    attachmentText: {
      fontSize: 13,
      marginLeft: 8,
    },
    sourceAttachmentsContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
      marginLeft: 16,
    },
    markdownContainer: {
      userSelect: 'text',
      selectable: true,
      textSelectable: true
    },
  });

  // Add EmptyHistory component
  const EmptyHistory = () => (
    <View style={styles.emptyHistoryContainer}>
      <Icon name="history" size={48} color={themeColors.textSecondary} />
      <Text style={[styles.emptyHistoryText, { color: themeColors.text }]}>
        No Chat History
      </Text>
      <Text style={[styles.emptyHistorySubText, { color: themeColors.textSecondary }]}>
        Your chat history will appear here
      </Text>
    </View>
  );

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
            <TouchableOpacity 
              onPress={toggleHistory}
              style={styles.headerIcon}
            >
              <Icon name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[
              styles.historyTitle,
              { color: themeColors.text }
            ]}>
              Chat History
            </Text>
          </View>
          <TouchableOpacity 
            onPress={startNewConversation}
            style={[
              styles.closeButton,
              { backgroundColor: themeColors.closeButtonBg }
            ]}
          >
            <Icon name="add" size={24} color={themeColors.text} />
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
          keyExtractor={item => `session-${item.session_id}-${Math.random().toString(36).substr(2, 9)}`}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyHistory}
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

      {/* Sources Section */}
      {sessionSources.length > 0 && renderSessionSources()}

      {messages.length === 0 ? (
        // Initial empty state
        <View style={styles.emptyStateContainer}>
          <View style={styles.botLogoContainer}>
            <View style={[styles.botLogoCircle, { backgroundColor: 'transparent' }]}>
              <Image 
                source={require('../assets/favicon.png')}
                style={styles.botLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.botName, { color: themeColors.text }]}>
              KARE Bot
            </Text>
            <Text style={[styles.botTagline, { color: themeColors.textSecondary }]}>
              Your AI Campus Assistant
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <View style={[
              styles.inputBarCard,
              { backgroundColor: themeColors.cardBg }
            ]}>
              <View style={styles.inputBarWrapper}>
                <View style={[
                  styles.inputBar,
                  { backgroundColor: themeColors.searchBg }
                ]}>
                  <TextInput
                    style={[
                      styles.input,
                      { color: themeColors.text }
                    ]}
                    placeholder="Ask me anything about KARE..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    inputText.trim() === '' && styles.sendButtonDisabled,
                    { backgroundColor: themeColors.primary }
                  ]}
                  onPress={handleSendMessage}
                  disabled={inputText.trim() === ''}
                >
                  <Icon name="send" size={26} color={WHITE} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ) : (
        // Chat messages view
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
            keyExtractor={item => `msg-${item.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
            contentContainerStyle={[styles.messagesList, { paddingBottom: BOTTOM_BAR_HEIGHT }]}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderTypingIndicator}
            onLayout={() => flatListRef.current?.scrollToEnd({animated: true})}
            ListFooterComponentStyle={{paddingBottom: 16}}
            keyboardShouldPersistTaps="handled"
          />
        </KeyboardAvoidingView>
      )}

      {/* Bottom fixed suggestion chips and input bar */}
      {messages.length > 0 && (
        <View style={styles.bottomBarWrapper}>
          {/* Input Bar */}
          <View style={[
            styles.inputBarCard,
            { backgroundColor: themeColors.cardBg }
          ]}>
            <View style={styles.inputBarWrapper}>
              <View style={[
                styles.inputBar,
                { backgroundColor: themeColors.searchBg }
              ]}>
                <TextInput
                  style={[
                    styles.input,
                    { color: themeColors.text }
                  ]}
                  placeholder="Ask a question..."
                  placeholderTextColor={themeColors.textSecondary}
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
                  { backgroundColor: themeColors.primary }
                ]}
                onPress={handleSendMessage}
                disabled={inputText.trim() === ''}
              >
                <Icon name="send" size={26} color={WHITE} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ChatBotScreen; 