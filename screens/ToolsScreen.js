import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Platform, 
  StatusBar, 
  Animated
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_SPACING = 16;
const CARD_WIDTH = (width - (CARD_SPACING * 3)) / 2;

const tools = [
  {
    id: 1,
    title: 'Faculty Finder',
    icon: 'school',
    screen: 'FacultyAvailabilityScreen',
    color: '#00B894',
    darkColor: '#004D40'
  },
  {
    id: 2,
    title: 'Circulars',
    icon: 'document-text',
    screen: 'CircularsScreen',
    color: '#4834D4',
    darkColor: '#1A237E'
  },
  {
    id: 3,
    title: 'Forms',
    icon: 'document',
    screen: 'FormsScreen',
    color: '#9B59B6',
    darkColor: '#4A148C'
  },
  {
    id: 4,
    title: 'Certificates',
    icon: 'ribbon',
    screen: 'CertificatesScreen',
    color: '#27AE60',
    darkColor: '#1B5E20'
  },
  {
    id: 5,
    title: 'Ask KARE',
    icon: 'chatbubbles',
    screen: 'ChatBotScreen',
    color: '#E84393',
    darkColor: '#880E4F'
  },
  {
    id: 6,
    title: 'CGPA',
    icon: 'calculator',
    screen: 'CGPAScreen',
    color: '#F39C12',
    darkColor: '#E65100'
  }
];

const ToolCard = ({ item, onPress, index, isDarkMode }) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 12,
          stiffness: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? item.darkColor : item.color,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={item.icon} 
          size={28} 
          color="#fff"
          style={styles.icon}
        />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ToolsScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Toolbox</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Campus tools & resources
        </Text>
      </View>

      <View style={styles.gridContainer}>
        {tools.map((tool, index) => (
          <ToolCard
            key={tool.id}
            item={tool}
            index={index}
            isDarkMode={isDarkMode}
            onPress={() => navigation.navigate(tool.screen)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight - 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: CARD_SPACING,
    gap: CARD_SPACING,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    aspectRatio: 1.3,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ToolsScreen;