import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Layout, Text, Button, Icon, Card } from '@ui-kitten/components';
import { LinearGradient } from 'expo-linear-gradient';

const LockIcon = (props) => (
  <Icon {...props} name='lock-outline' />
);

const CloseIcon = (props) => (
  <Icon {...props} name='close-outline' />
);

export default function PremiumOverlay({ onUpgrade }) {
  return (
    <View style={styles.container}>
      {/* This represents your app content that would be visible but dimmed */}
      <View style={styles.appContentMock}>
        <View style={styles.mockRect1} />
        <View style={styles.mockRowContainer}>
          <View style={styles.mockRect2} />
          <View style={styles.mockRect3} />
        </View>
        <View style={styles.mockRect4} />
      </View>
      
      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
        {/* Premium Feature Card */}
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <LockIcon fill="#4158D0" width={24} height={24} />
            </View>
            
            <View style={styles.textContainer}>
              <Text category='h6' style={styles.title}>Premium Feature</Text>
              <Text category='p2' appearance='hint' style={styles.premiumText}>Subscribe to unlock all premium features</Text>
            </View>
            
            <Button
              style={styles.upgradeButton}
              onPress={onUpgrade}
            >
              Subscribe Now
            </Button>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  appContentMock: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f6f8',
  },
  mockRect1: {
    height: 100,
    backgroundColor: '#e4e6e9',
    borderRadius: 8,
    marginTop: 60,
  },
  mockRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  mockRect2: {
    height: 180,
    width: '48%',
    backgroundColor: '#e4e6e9',
    borderRadius: 8,
  },
  mockRect3: {
    height: 180,
    width: '48%',
    backgroundColor: '#e4e6e9',
    borderRadius: 8,
  },
  mockRect4: {
    height: 100,
    backgroundColor: '#e4e6e9',
    borderRadius: 8,
    marginTop: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    padding: 0,
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  upgradeButton: {
    width: '90%',
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 0,
    overflow: 'hidden',
  },
  premiumText: {textAlign: 'center'}
});