import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type TutorialStep =
  | 'welcome'
  | 'find_race'
  | 'make_prediction'
  | 'select_riders'
  | 'save_prediction'
  | 'view_results'
  | 'complete';

interface TutorialOverlayProps {
  currentStep: TutorialStep;
  onNextStep: () => void;
  onSkipTutorial: () => void;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const TUTORIAL_STORAGE_KEY = '@tutorial_completed';

export const useTutorial = () => {
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');

  useEffect(() => {
    const checkTutorial = async () => {
      try {
        const value = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        setTutorialCompleted(value === 'true');
        if (value !== 'true') {
          setCurrentStep('welcome');
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
        setTutorialCompleted(false);
      }
    };
    checkTutorial();
  }, []);

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      setTutorialCompleted(true);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  const skipTutorial = async () => {
    await completeTutorial();
  };

  const nextStep = () => {
    const steps: TutorialStep[] = [
      'welcome',
      'find_race',
      'make_prediction',
      'select_riders',
      'save_prediction',
      'view_results',
      'complete',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      completeTutorial();
    }
  };

  return {
    tutorialCompleted,
    currentStep,
    nextStep,
    skipTutorial,
    completeTutorial,
  };
};

const getTutorialContent = (step: TutorialStep) => {
  switch (step) {
    case 'welcome':
      return {
        title: "Let's Make Your First Prediction!",
        description: "We'll guide you through predicting race results step by step. Ready to test your racing knowledge?",
        icon: 'flag' as const,
        color: '#00d9ff',
      };
    case 'find_race':
      return {
        title: 'Find an Upcoming Race',
        description: 'Scroll through the list below to find a race you want to predict. Each race shows the track, date, and series.',
        icon: 'search' as const,
        color: '#4caf50',
      };
    case 'make_prediction':
      return {
        title: 'Tap "Make Prediction"',
        description: 'Click the prediction button on any upcoming race card to start making your picks.',
        icon: 'create' as const,
        color: '#9c27b0',
      };
    case 'select_riders':
      return {
        title: 'Pick Your Top 5',
        description: 'Select 5 riders in the order you think they\'ll finish. Position 1 is your winner!',
        icon: 'podium' as const,
        color: '#ffd93d',
      };
    case 'save_prediction':
      return {
        title: 'Save Your Prediction',
        description: 'Once you\'ve selected all 5 positions, tap Save to lock in your prediction before the race starts!',
        icon: 'checkmark-circle' as const,
        color: '#ff6b6b',
      };
    case 'view_results':
      return {
        title: 'Check Results After Race',
        description: 'After the race, view the Results tab to see how you scored. You earn points based on accuracy!',
        icon: 'trophy' as const,
        color: '#ff9800',
      };
    default:
      return {
        title: '',
        description: '',
        icon: 'checkmark' as const,
        color: '#00d9ff',
      };
  }
};

export default function TutorialOverlay({
  currentStep,
  onNextStep,
  onSkipTutorial,
  highlightArea,
}: TutorialOverlayProps) {
  if (currentStep === 'complete') {
    return null;
  }

  const content = getTutorialContent(currentStep);
  const stepNumber = ['welcome', 'find_race', 'make_prediction', 'select_riders', 'save_prediction', 'view_results'].indexOf(currentStep) + 1;
  const totalSteps = 6;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Semi-transparent background */}
        <View style={styles.backdrop} />

        {/* Highlight area (if provided) */}
        {highlightArea && (
          <View
            style={[
              styles.highlightArea,
              {
                top: highlightArea.y,
                left: highlightArea.x,
                width: highlightArea.width,
                height: highlightArea.height,
              },
            ]}
          />
        )}

        {/* Tutorial card */}
        <View style={styles.tutorialCard}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: content.color + '20' }]}>
            <Ionicons name={content.icon} size={60} color={content.color} />
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Step {stepNumber} of {totalSteps}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(stepNumber / totalSteps) * 100}%`,
                    backgroundColor: content.color,
                  },
                ]}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{content.description}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkipTutorial}
            >
              <Text style={styles.skipText}>Skip Tutorial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: content.color }]}
              onPress={onNextStep}
            >
              <Text style={styles.nextText}>
                {stepNumber === totalSteps ? 'Got It!' : 'Next'}
              </Text>
              <Ionicons
                name={stepNumber === totalSteps ? 'checkmark' : 'arrow-forward'}
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 39, 0.95)',
  },
  highlightArea: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#00d9ff',
    backgroundColor: 'transparent',
  },
  tutorialCard: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 12,
    color: '#8892b0',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#2a2f4a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#8892b0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8892b0',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8892b0',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
});
