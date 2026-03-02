import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { 
  Layout, 
  Text, 
  Input, 
  Icon, 
  Button, 
  Spinner, 
  Modal, 
  Card,
  Divider,
  TopNavigation,
  TopNavigationAction
} from '@ui-kitten/components';
import { showSuccessMessage, showErrorMessage } from '../main/showAlerts';
import { supabase } from '../../constants/supabase';

// Available roles in the system
const AVAILABLE_ROLES = [
  { 
    key: 'admin', 
    label: 'Admin', 
    color: '#FF3D71',
    icon: 'shield-outline'
  },
  { 
    key: 'designer', 
    label: 'Designer', 
    color: '#00B383',
    icon: 'briefcase-outline'
  },
  { 
    key: 'production', 
    label: 'Production', 
    color: '#0095FF',
    icon: 'person-outline'
  }
];

const RoleConfigScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [rolePasswords, setRolePasswords] = useState({});
  const [editingRole, setEditingRole] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchRolePasswords();
  }, []);

  const fetchRolePasswords = async () => {
    try {
      setLoading(true);
      
      // Fetch all role passwords from database
      const { data, error } = await supabase
        .from('role_passwords_config')
        .select('role, password');

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Convert array to object for easier access
      const passwordMap = {};
      if (data) {
        data.forEach(item => {
          passwordMap[item.role] = item.password;
        });
      }

      setRolePasswords(passwordMap);
    } catch (error) {
      console.error('Error fetching role passwords:', error);
      showErrorMessage('Failed to load role passwords');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPassword = (role) => {
    setEditingRole(role);
    setNewPassword('');
    setConfirmPassword('');
    setShowEditModal(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim()) {
      showErrorMessage('Please enter a password');
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showErrorMessage('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      // Upsert password for the role
      const { error } = await supabase
        .from('role_passwords_config')
        .upsert({
          role: editingRole.key,
          password: newPassword,
          updated_at: new Date().toISOString()
        }, { onConflict: 'role' });

      if (error) throw error;

      // Update local state
      setRolePasswords(prev => ({
        ...prev,
        [editingRole.key]: newPassword
      }));

      showSuccessMessage(`Password for ${editingRole.label} updated successfully`);
      setShowEditModal(false);
      setEditingRole(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      showErrorMessage('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePassword = (role) => {
    Alert.alert(
      'Delete Password',
      `Are you sure you want to delete the password for ${role.label}? Users won't be able to login with this role.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePassword(role)
        }
      ]
    );
  };

  const deletePassword = async (role) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('role_passwords_config')
        .delete()
        .eq('role', role.key);

      if (error) throw error;

      // Update local state
      setRolePasswords(prev => {
        const newState = { ...prev };
        delete newState[role.key];
        return newState;
      });

      showSuccessMessage(`Password for ${role.label} deleted successfully`);
    } catch (error) {
      console.error('Error deleting password:', error);
      showErrorMessage('Failed to delete password');
    } finally {
      setLoading(false);
    }
  };

  const BackIcon = (props) => <Icon {...props} name="arrow-back" />;

  const renderBackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={() => navigation.goBack()} />
  );

  const maskPassword = (password) => {
    if (!password) return 'Not set';
    return '•'.repeat(Math.min(password.length, 12));
  };

  const renderRoleCard = (role) => {
    const hasPassword = rolePasswords[role.key];
    
    return (
      <Card key={role.key} style={styles.roleCard}>
        <View style={styles.cardHeader}>
          <View style={styles.roleIconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: role.color + '20' }]}>
              <Icon
                name={role.icon}
                fill={role.color}
                style={styles.roleIcon}
              />
            </View>
          </View>
          <View style={styles.roleInfo}>
            <Text category="h6" style={styles.roleName}>
              {role.label}
            </Text>
            <Text category="c1" appearance="hint" style={styles.roleDescription}>
              {role.description}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.passwordSection}>
          <View style={styles.passwordInfo}>
            <Text category="s2" appearance="hint">
              Password
            </Text>
            <View style={styles.passwordDisplay}>
              <Icon
                name="lock-outline"
                fill="#8F9BB3"
                style={styles.lockIcon}
              />
              <Text category="s1" style={styles.passwordText}>
                {maskPassword(rolePasswords[role.key])}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditPassword(role)}
            >
              <Icon
                name="edit-2-outline"
                fill="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>
                {hasPassword ? 'Edit' : 'Set'}
              </Text>
            </TouchableOpacity>

            {hasPassword && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeletePassword(role)}
              >
                <Icon
                  name="trash-2-outline"
                  fill="#FFFFFF"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Layout style={styles.container}>
      <TopNavigation
        title="Role Password Configuration"
        alignment="center"
        accessoryLeft={renderBackAction}
      />
      <Divider />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <Icon
            name="shield-outline"
            fill="#0095FF"
            style={styles.headerIcon}
          />
          <Text category="h6" style={styles.headerTitle}>
            Manage Role Passwords
          </Text>
          <Text category="c1" appearance="hint" style={styles.headerSubtitle}>
            Set unique passwords for each role. Users will need to enter the correct password to access their assigned role.
          </Text>
        </View>

        {loading && !showEditModal ? (
          <View style={styles.loadingContainer}>
            <Spinner size="large" />
          </View>
        ) : (
          <View style={styles.rolesContainer}>
            {AVAILABLE_ROLES.map(role => renderRoleCard(role))}
          </View>
        )}
      </ScrollView>

      {/* Edit Password Modal */}
      <Modal
        visible={showEditModal}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => {
          setShowEditModal(false);
          setEditingRole(null);
          setNewPassword('');
          setConfirmPassword('');
        }}
      >
        <Card disabled={true} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconCircle, { backgroundColor: editingRole?.color + '20' }]}>
              <Icon
                name={editingRole?.icon || 'shield-outline'}
                fill={editingRole?.color || '#0095FF'}
                style={styles.modalIcon}
              />
            </View>
            <Text category="h6" style={styles.modalTitle}>
              Set Password for {editingRole?.label}
            </Text>
            <Text category="c1" appearance="hint" style={styles.modalSubtitle}>
              {editingRole?.description}
            </Text>
          </View>

          <Input
            style={styles.passwordInput}
            label="New Password"
            placeholder="Enter password (min. 6 characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            accessoryRight={(props) => (
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Icon {...props} name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} />
              </TouchableOpacity>
            )}
          />

          <Input
            style={styles.passwordInput}
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            accessoryRight={(props) => (
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon {...props} name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} />
              </TouchableOpacity>
            )}
          />

          <View style={styles.modalButtons}>
            <Button
              style={styles.modalButton}
              appearance="outline"
              onPress={() => {
                setShowEditModal(false);
                setEditingRole(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              style={styles.modalButton}
              onPress={handleSavePassword}
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'Saving...' : 'Save Password'}
            </Button>
          </View>
        </Card>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
  },
  headerTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  rolesContainer: {
    gap: 16,
  },
  roleCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleIconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIcon: {
    width: 28,
    height: 28,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    marginBottom: 4,
  },
  roleDescription: {
    lineHeight: 18,
  },
  divider: {
    marginVertical: 12,
  },
  passwordSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordInfo: {
    flex: 1,
  },
  passwordDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  lockIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  passwordText: {
    fontSize: 16,
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#0095FF',
  },
  deleteButton: {
    backgroundColor: '#FF3D71',
    paddingHorizontal: 12,
  },
  buttonIcon: {
    width: 18,
    height: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 32,
    height: 32,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    textAlign: 'center',
  },
  passwordInput: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});

export default RoleConfigScreen;