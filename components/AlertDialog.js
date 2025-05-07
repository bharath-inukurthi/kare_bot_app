import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Portal, Button } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

/**
 * A reusable alert dialog component using React Native Paper
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the dialog is visible
 * @param {Function} props.onDismiss - Function to call when dialog is dismissed
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.cancelText - Text for the cancel button (optional, defaults to "Cancel")
 * @param {string} props.confirmText - Text for the confirm button (optional, defaults to "OK")
 * @param {Function} props.onCancel - Function to call when cancel button is pressed (optional)
 * @param {Function} props.onConfirm - Function to call when confirm button is pressed
 * @param {string} props.confirmColor - Color for the confirm button (optional, defaults to "#19C6C1")
 * @param {boolean} props.destructive - Whether the confirm action is destructive (optional, defaults to false)
 */
const AlertDialog = ({
  visible,
  onDismiss,
  title,
  message,
  cancelText = "Cancel",
  confirmText = "OK",
  onCancel,
  onConfirm,
  confirmColor = "#19C6C1",
  destructive = false
}) => {
  const { isDarkMode, theme } = useTheme();
  
  // Handle cancel button press
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onDismiss();
  };
  
  return (
    <Portal>
      <Modal
        visible={visible}
        transparent={true}
        onRequestClose={onDismiss}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[
            styles.modalContent,
            { 
              backgroundColor: isDarkMode ? theme?.surface || '#1e293b' : '#fff',
              borderColor: isDarkMode ? theme?.border || '#334155' : '#E2E8F0'
            }
          ]}>
            <Text style={[
              styles.modalTitle,
              { color: isDarkMode ? theme?.text || '#fff' : '#0F172A' }
            ]}>
              {title}
            </Text>
            <Text style={[
              styles.modalMessage,
              { color: isDarkMode ? theme?.textSecondary || '#94a3b8' : '#64748B' }
            ]}>
              {message}
            </Text>
            <View style={styles.modalButtons}>
              {cancelText && (
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  style={[styles.modalButton, { borderColor: confirmColor }]}
                  labelStyle={{ color: confirmColor }}
                >
                  {cancelText}
                </Button>
              )}
              <Button
                mode="contained"
                onPress={onConfirm}
                style={[
                  styles.modalButton, 
                  { backgroundColor: destructive ? '#EF4444' : confirmColor }
                ]}
              >
                {confirmText}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
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
});

export default AlertDialog;
