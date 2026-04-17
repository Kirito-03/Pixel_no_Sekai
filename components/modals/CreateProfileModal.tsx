import React, { useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CreateProfileModalProps {
  visible: boolean;
  creating: boolean;
  newProfileName: string;
  selectedImageUri: string | null;
  onClose: () => void;
  onConfirm: () => void;
  setNewProfileName: (name: string) => void;
  handleSelectImage: () => void;
  handleWebFileSelect: (event: any) => void;
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  visible,
  creating,
  newProfileName,
  selectedImageUri,
  onClose,
  onConfirm,
  setNewProfileName,
  handleSelectImage,
  handleWebFileSelect,
}) => {
  const fileInputRef = useRef<any>(null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Crear perfil</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Nombre del perfil"
            placeholderTextColor="#666"
            value={newProfileName}
            onChangeText={setNewProfileName}
            maxLength={20}
          />
          <TouchableOpacity
            style={styles.imagePickerContainer}
            onPress={() => {
                if (Platform.OS === 'web' && fileInputRef.current) {
                    fileInputRef.current.click();
                } else {
                    handleSelectImage();
                }
            }}
            disabled={creating}
          >
            {selectedImageUri ? (
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="camera" size={40} color="#666" />
                <Text style={styles.imagePickerText}>Toca para seleccionar imagen</Text>
              </View>
            )}
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleWebFileSelect}
            />
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, creating && styles.buttonDisabled]}
              disabled={creating}
              onPress={onConfirm}
            >
              <Text style={styles.createButtonText}>{creating ? 'Creando...' : 'Crear'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1f1f1f',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
    },
    nameInput: {
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 6,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    imagePickerContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 6,
        marginBottom: 20,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 6,
    },
    imagePickerPlaceholder: {
        alignItems: 'center',
    },
    imagePickerText: {
        color: '#aaa',
        marginTop: 8,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    cancelButton: {
        padding: 10,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    createButton: {
        backgroundColor: '#e50914',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
