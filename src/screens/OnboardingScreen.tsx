import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'trophy',
    title: 'Welcome to MotoSense',
    description: 'Test your racing knowledge and compete with friends by predicting race results',
    color: '#00d9ff',
  },
  {
    id: '2',
    icon: 'podium',
    title: 'Make Predictions',
    description: 'Pick your top 5 finishers for every race and earn points based on accuracy',
    color: '#4caf50',
  },
  {
    id: '3',
    icon: 'people',
    title: 'Join Groups',
    description: 'Create or join groups to compete with friends and climb the leaderboards',
    color: '#9c27b0',
  },
  {
    id: '4',
    icon: 'medal',
    title: 'Unlock Achievements',
    description: 'Earn 35+ achievements across 6 categories and level up your Racing IQ',
    color: '#ffd93d',
  },
  {
    id: '5',
    icon: 'flash',
    title: 'Daily Challenges',
    description: 'Complete daily and weekly challenges for bonus points and rewards',
    color: '#ff6b6b',
  },
  {
    id: '6',
    icon: 'notifications',
    title: 'Stay Updated',
    description: 'Get notified about race reminders, results, and achievement unlocks',
    color: '#ff9800',
  },
];

export default function OnboardingScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    if (isCompleting) return; // Prevent double-tap

    try {
      setIsCompleting(true);
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      // AppNavigator is watching this value and will automatically navigate to auth
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setIsCompleting(false);
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={80} color={item.color} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex && styles.activeDot,
            { backgroundColor: index === currentIndex ? slides[currentIndex].color : '#8892b0' },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Pagination dots */}
      {renderPagination()}

      {/* Next/Get Started button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: slides[currentIndex].color }, isCompleting && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={isCompleting}
      >
        <Text style={styles.buttonText}>
          {isCompleting ? 'Loading...' : currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
        </Text>
        {!isCompleting && (
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
            size={24}
            color="#fff"
            style={styles.buttonIcon}
          />
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#8892b0',
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#8892b0',
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    opacity: 0.3,
  },
  activeDot: {
    width: 30,
    opacity: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 40,
    marginBottom: 40,
    padding: 18,
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
});
