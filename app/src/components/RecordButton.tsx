import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, RecordButton as RBSize, Typography } from '../theme';

interface Props {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} disabled={disabled}>
        <Animated.View
          style={[
            styles.button,
            isRecording && styles.recording,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      </Pressable>
      <Text style={styles.label}>{isRecording ? 'Stop' : 'Record'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: RBSize.size,
    height: RBSize.size,
    borderRadius: RBSize.borderRadius,
    backgroundColor: Colors.recordIdle,
  },
  recording: {
    backgroundColor: Colors.recordActive,
  },
  label: {
    ...Typography.caption,
    marginTop: 8,
    color: Colors.textSecondary,
  },
});
