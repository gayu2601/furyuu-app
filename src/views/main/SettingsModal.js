import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { TopNavigationAction } from '@ui-kitten/components';

// Settings Modal Component
const SettingsModal = ({ visible, onClose, onSave, initialRegularSlots, initialExpressSlots }) => {
  const [regularSlots, setRegularSlots] = useState(initialRegularSlots.toString());
  const [expressSlots, setExpressSlots] = useState(initialExpressSlots.toString());

  useEffect(() => {
    setRegularSlots(initialRegularSlots.toString());
    setExpressSlots(initialExpressSlots.toString());
  }, [initialRegularSlots, initialExpressSlots]);

  const handleSave = () => {
    const regular = parseInt(regularSlots) || 0;
    const express = parseInt(expressSlots) || 0;
    onSave(regular, express);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Slot Settings</Text>
          <Text style={styles.modalSubtitle}>Set maximum available slots per day</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Regular Slots</Text>
            <TextInput
              style={styles.input}
              value={regularSlots}
              onChangeText={setRegularSlots}
              keyboardType="numeric"
              placeholder="Enter max regular slots"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Express Slots</Text>
            <TextInput
              style={styles.input}
              value={expressSlots}
              onChangeText={setExpressSlots}
              keyboardType="numeric"
              placeholder="Enter max express slots"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
export default SettingsModal;