import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

interface DataDisclaimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DataDisclaimerModal({ visible, onClose }: DataDisclaimerModalProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView style={styles.content}>
            <Text style={styles.title}>Data & Information</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Sources</Text>
              <Text style={styles.text}>
                MotoSense aggregates racing information from multiple publicly available sources on the internet.
                We continuously monitor and validate data to provide you with the most accurate information possible.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accuracy Notice</Text>
              <Text style={styles.text}>
                While we make every effort to ensure data accuracy, the information presented in this app is
                dependent on the accuracy of publicly available sources. Race schedules, results, and other
                information are subject to change without notice.
              </Text>
              <Text style={styles.text}>
                MotoSense is not affiliated with, endorsed by, or officially connected to any racing series,
                sanctioning body, or event organizer. All trademarks and racing-related content remain the
                property of their respective owners.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Responsibility</Text>
              <Text style={styles.text}>
                For official and legally binding information, including event dates, times, venues, and results,
                please refer to official sources and event organizers. This app is intended for informational
                and entertainment purposes only.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Updates</Text>
              <Text style={styles.text}>
                Information is automatically updated on a regular basis. However, there may be delays between
                when changes occur and when they appear in the app. Pull down to refresh for the latest data.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reporting Issues</Text>
              <Text style={styles.text}>
                If you notice incorrect information, please contact us through the Profile tab. We appreciate
                user feedback and work to correct inaccuracies promptly.
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By using this app, you acknowledge and accept these terms.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#8892b0',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  footerText: {
    fontSize: 13,
    color: '#8892b0',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#00d9ff',
    paddingVertical: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
});
