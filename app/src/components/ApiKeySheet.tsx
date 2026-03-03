import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing } from '../theme';

interface Props {
  apiKey: string;
  sheetRef: React.RefObject<BottomSheet | null>;
}

export function ApiKeySheet({ apiKey, sheetRef }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['50%'], []);

  const copyToClipboard = useCallback(
    async (text: string, label: string) => {
      await Clipboard.setStringAsync(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    },
    []
  );

  const curlCommand = `curl -H "Authorization: Bearer ${apiKey}" http://localhost:8000/v1/transcripts`;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.header}>Your API Key</Text>

        <Pressable
          onPress={() => copyToClipboard(apiKey, 'key')}
          style={styles.keyBox}
        >
          <Text style={styles.keyText} numberOfLines={1}>
            {apiKey}
          </Text>
          <Text style={styles.copyHint}>
            {copied === 'key' ? 'Copied!' : 'Tap to copy'}
          </Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.label}>Endpoint</Text>
          <Text style={styles.code}>GET /v1/transcripts</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Authorization</Text>
          <Text style={styles.code}>Bearer {'<your-key>'}</Text>
        </View>

        <Pressable
          onPress={() => copyToClipboard(curlCommand, 'curl')}
          style={styles.curlButton}
        >
          <Text style={styles.curlButtonText}>
            {copied === 'curl' ? 'Copied!' : 'Copy cURL'}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.card,
  },
  handle: {
    backgroundColor: Colors.textSecondary,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  keyBox: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  keyText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.text,
    marginBottom: 4,
  },
  copyHint: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  code: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.text,
  },
  curlButton: {
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  curlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
