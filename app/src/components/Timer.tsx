import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '../theme';

interface Props {
  formattedTime: string;
}

export function Timer({ formattedTime }: Props) {
  return <Text style={styles.text}>{formattedTime}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 48,
    fontWeight: '300',
    color: Colors.text,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
