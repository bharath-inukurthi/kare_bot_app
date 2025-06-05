import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  SafeAreaView,
  TextInput,
  Vibration,
  Appearance,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Snackbar, Portal, Button } from 'react-native-paper';

const CGPAScreen = ({ navigation }) => {
  const { isDarkMode, theme } = useTheme();
  const colorScheme = Appearance.getColorScheme();
  const isSystemDark = colorScheme === 'dark';
  const scrollViewRef = useRef(null);
  const [currentCGPA, setCurrentCGPA] = useState('');
  const [subjects, setSubjects] = useState([
    { id: 1, code: '', name: '', credits: 3, grade: '' },
    { id: 2, code: '', name: '', credits: 3, grade: '' },
    { id: 3, code: '', name: '', credits: 3, grade: '' },
  ]);
  const [showResults, setShowResults] = useState(false);
  const [semesterGPA, setSemesterGPA] = useState(0);
  const [cumulativeGPA, setCumulativeGPA] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);

  // Add states for Snackbar and Modal
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  const addSubject = () => {
    const newId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
    setSubjects([...subjects, { id: newId, code: '', name: '', credits: 3, grade: '' }]);
  };

  const updateSubject = (id, field, value) => {
    setSubjects(subjects.map(subject => 
      subject.id === id ? { ...subject, [field]: value } : subject
    ));
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const deleteSubject = (id) => {
    if (subjects.length <= 1) {
      showSnackbar('You must have at least one subject');
      return;
    }
    
    setSubjectToDelete(id);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = () => {
    if (subjectToDelete) {
      Vibration.vibrate(50);
      setSubjects(subjects.filter(subject => subject.id !== subjectToDelete));
      setDeleteModalVisible(false);
      setSubjectToDelete(null);
      showSnackbar('Subject deleted successfully');
    }
  };

  const validateGrade = (grade) => {
    const validGrades = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
    return validGrades.includes(grade.toUpperCase());
  };

  const calculateGPA = () => {
    // Validate current CGPA if provided
    if (currentCGPA && (isNaN(currentCGPA) || parseFloat(currentCGPA) < 0 || parseFloat(currentCGPA) > 10.0)) {
      showSnackbar('Please enter a valid CGPA between 0.0 and 10.0');
      return;
    }

    // Check if all fields are filled and grades are valid
    const incomplete = subjects.some(subject => {
      if (!subject.code || !subject.credits || !subject.grade) return true;
      if (!validateGrade(subject.grade)) return true;
      return false;
    });

    if (incomplete) {
      showSnackbar('Please ensure all subjects have a code, credits, and valid grade (S, A, B, C, D, E, F)');
      return;
    }

    // Calculate GPA
    let totalPoints = 0;
    let credits = 0;

    subjects.forEach(subject => {
      const gradePoints = getGradePoints(subject.grade.toUpperCase());
      totalPoints += gradePoints * subject.credits;
      credits += parseFloat(subject.credits);
    });

    const semGPA = totalPoints / credits;
    setSemesterGPA(semGPA.toFixed(2));
    setTotalCredits(credits);

    // Calculate cumulative GPA if current CGPA is provided
    if (currentCGPA) {
      const prevCGPA = parseFloat(currentCGPA);
      const prevCredits = 20; // Assuming 20 credits per semester, adjust as needed
      const newCumulativeGPA = ((prevCGPA * prevCredits) + (semGPA * credits)) / (prevCredits + credits);
      setCumulativeGPA(newCumulativeGPA.toFixed(2));
    } else {
      setCumulativeGPA(semGPA.toFixed(2));
    }

    setShowResults(true);
    
    // Scroll to bottom after a short delay to ensure results are rendered
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getGradePoints = (grade) => {
    const gradePoints = {
      'S': 10.0,
      'A': 9.0,
      'B': 8.0,
      'C': 7.0,
      'D': 6.0,
      'E': 5.0,
      'F': 0.0
    };
    return gradePoints[grade] || 0;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
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
            GPA Calculator
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <Text style={{
          color: isDarkMode ? '#fff' : '#64748B',
          fontSize: 15,
          marginTop: 6,
          marginBottom: 4,
          textAlign: 'center',
          opacity: 0.8
        }}>
          Calculate your grade point average
        </Text>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
      >
        {/* Current CGPA Input */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? theme.surface : '#fff', marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#0F172A' }]}>Current CGPA (Optional)</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: isDarkMode ? theme.background : '#F1F5F9',
              color: isDarkMode ? theme.text : '#0F172A',
              borderColor: isDarkMode ? theme.border : '#E2E8F0'
            }]}
            placeholder="Enter your current CGPA"
            placeholderTextColor={isDarkMode ? theme.textSecondary : '#64748B'}
            value={currentCGPA}
            onChangeText={setCurrentCGPA}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Subjects List */}
        {subjects.map((subject, index) => (
          <TouchableOpacity
            key={subject.id}
            onLongPress={() => deleteSubject(subject.id)}
            delayLongPress={500}
            style={[styles.subjectCard, { 
              backgroundColor: isDarkMode ? theme.surface : '#fff',
              borderColor: isDarkMode ? theme.border : '#E2E8F0'
            }]}
          >
            <View style={styles.subjectHeader}>
              <Text style={[styles.subjectCode, { color: isDarkMode ? theme.text : '#0F172A' }]}>
                {subject.code || `Subject ${index + 1}`}
              </Text>
              <Text style={{ color: isDarkMode ? theme.textSecondary : '#64748B' }}>
                {subject.credits} Credits
              </Text>
            </View>
            
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDarkMode ? theme.background : '#F1F5F9',
                  color: isDarkMode ? theme.text : '#0F172A',
                  borderColor: isDarkMode ? theme.border : '#E2E8F0'
                }]}
                placeholder="Subject Code"
                placeholderTextColor={isDarkMode ? theme.textSecondary : '#64748B'}
                value={subject.code}
                onChangeText={(text) => updateSubject(subject.id, 'code', text)}
              />
              <TextInput
                style={[styles.gradeInput, { 
                  backgroundColor: isDarkMode ? theme.background : '#F1F5F9',
                  color: isDarkMode ? theme.text : '#0F172A',
                  borderColor: isDarkMode ? theme.border : '#E2E8F0'
                }]}
                placeholder="Grade"
                placeholderTextColor={isDarkMode ? theme.textSecondary : '#64748B'}
                value={subject.grade}
                onChangeText={(text) => updateSubject(subject.id, 'grade', text.toUpperCase())}
              />
            </View>
          </TouchableOpacity>
        ))}

        {/* Add Subject Button */}
        <TouchableOpacity 
          style={[styles.addButton, { 
            backgroundColor: isDarkMode ? theme.surface : '#fff',
            borderColor: isDarkMode ? theme.border : '#E2E8F0'
          }]}
          onPress={addSubject}
        >
          <Ionicons name="add-circle-outline" size={24} color="#19C6C1" />
          <Text style={{ color: '#19C6C1', marginLeft: 8, fontWeight: '600' }}>Add Subject</Text>
        </TouchableOpacity>

        {/* Results Section - Moved above Calculate Button */}
        {showResults && (
          <View style={[styles.resultsCard, { 
            backgroundColor: isDarkMode ? theme.surface : '#fff',
            borderColor: isDarkMode ? theme.border : '#E2E8F0',
            marginBottom: 16
          }]}>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDarkMode ? theme.textSecondary : '#64748B' }]}>
                Total Credits
              </Text>
              <Text style={[styles.resultValue, { color: isDarkMode ? theme.text : '#0F172A' }]}>
                {totalCredits}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDarkMode ? theme.textSecondary : '#64748B' }]}>
                Semester GPA
              </Text>
              <Text style={[styles.resultValue, { color: isDarkMode ? theme.text : '#0F172A' }]}>
                {semesterGPA}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDarkMode ? theme.textSecondary : '#64748B' }]}>
                Cumulative GPA
              </Text>
              <Text style={[styles.resultValue, { color: isDarkMode ? theme.text : '#0F172A' }]}>
                {cumulativeGPA}
              </Text>
            </View>
          </View>
        )}

        {/* Calculate Button */}
        <TouchableOpacity 
          style={[styles.calculateButton, { backgroundColor: '#19C6C1' }]}
          onPress={calculateGPA}
        >
          <Text style={styles.calculateButtonText}>Calculate GPA</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Portal>
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
                Delete Subject
              </Text>
              <Text style={[
                styles.modalMessage,
                { color: isDarkMode ? theme.textSecondary : '#64748B' }
              ]}>
                Are you sure you want to delete this subject?
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setDeleteModalVisible(false)}
                  style={[styles.modalButton, { borderColor: '#19C6C1' }]}
                  labelStyle={{ color: '#19C6C1' }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleDeleteConfirm}
                  style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                >
                  Delete
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[
          styles.snackbar,
          { backgroundColor: isDarkMode ?  '#EF4444' : '#FEE2E2',"text":isDarkMode ?  '#FEE2E2' : '#EF4444'}
        ]}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  subjectCard: {
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  gradeInput: {
    width: 80,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  calculateButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsCard: {
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 15,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
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
  snackbar: {
    margin: 16,
    borderRadius: 8,
  },
});

export default CGPAScreen; 