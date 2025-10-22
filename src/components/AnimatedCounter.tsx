import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, TextStyle } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  style?: TextStyle;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedCounter({
  value,
  style,
  duration = 1000,
  delay = 0,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Reset animation
    animatedValue.setValue(0);
    setDisplayValue(0);

    // Update text as animation progresses
    const listener = animatedValue.addListener(({ value: animValue }) => {
      setDisplayValue(Math.floor(animValue));
    });

    // Animate to target value with delay
    const timer = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: value,
        duration: duration,
        useNativeDriver: false,
      }).start();
    }, delay);

    return () => {
      clearTimeout(timer);
      animatedValue.removeListener(listener);
    };
  }, [value, duration, delay]);

  return (
    <Text style={style}>
      {prefix}{displayValue}{suffix}
    </Text>
  );
}
