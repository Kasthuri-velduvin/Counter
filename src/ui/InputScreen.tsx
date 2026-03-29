/**
 * InputScreen — Task 12
 * Text input (≤2000 chars) + voice input with recording indicator.
 * Wires to NLPEngine.extract → GraphEngine.buildFromNLP on submit.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { NLPEngine } from '../nlp/nlpEngine';
import { GraphEngine } from '../graph/graphEngine';
import { NLPExtractionError, NLPTimeoutError, InsufficientGraphError } from '../types/errors';
import type { Graph } from '../types';

const MAX_CHARS = 2000;

const COLORS = {
  bg: '#0a0a0a',
  active: '#00ff88',
  traversed: '#ff6b35',
  inactive: '#ffffff',
  error: '#ff4444',
  surface: '#1a1a1a',
  border: '#333333',
};

interface InputScreenProps {
  onGraphReady: (graph: Graph) => void;
}

export function InputScreen({ onGraphReady }: InputScreenProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice recording ref — uses expo-av Audio
  const recordingRef = useRef<import('expo-av').Audio.Recording | null>(null);

  const handleTextChange = useCallback((value: string) => {
    // Enforce 2000-character limit (req 1.1)
    if (value.length > MAX_CHARS) {
      setText(value.slice(0, MAX_CHARS));
    } else {
      setText(value);
    }
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter a description of your problem.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nlpResult = await NLPEngine.extract(text);
      const graph = GraphEngine.buildFromNLP(nlpResult);
      onGraphReady(graph);
    } catch (err) {
      if (err instanceof NLPExtractionError) {
        setError(err.message);
      } else if (err instanceof NLPTimeoutError) {
        setError(err.message);
      } else if (err instanceof InsufficientGraphError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [text, onGraphReady]);

  const handleVoiceToggle = useCallback(async () => {
    if (recording) {
      // Stop recording and transcribe (req 1.2, 1.5)
      try {
        const { Audio } = await import('expo-av');
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          recordingRef.current = null;
          setRecording(false);
          // expo-speech does not do STT; use expo-av URI for transcription placeholder
          // In a real app, send `uri` to a speech-to-text service
          if (uri) {
            setError('Voice transcription requires a speech-to-text service. Please type your input.');
          }
        }
      } catch {
        setRecording(false);
        setError('Voice recording failed. Please type your input.');
      }
    } else {
      // Start recording
      try {
        const { Audio } = await import('expo-av');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Microphone permission is required for voice input.');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );
        recordingRef.current = rec;
        setRecording(true);
        setError(null);
      } catch {
        setError('Could not start voice recording. Please type your input.');
      }
    }
  }, [recording]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Algorithm Visual Soul</Text>
      <Text style={styles.subtitle}>Describe your problem or workflow</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={handleTextChange}
          placeholder="e.g. Task A depends on Task B with priority 3..."
          placeholderTextColor="#555"
          multiline
          maxLength={MAX_CHARS}
          textAlignVertical="top"
          accessibilityLabel="Problem description input"
        />
        <Text style={styles.charCount}>
          {text.length}/{MAX_CHARS}
        </Text>
      </View>

      {/* Voice input button with recording indicator (req 1.2, 1.5) */}
      <TouchableOpacity
        style={[styles.voiceButton, recording && styles.voiceButtonActive]}
        onPress={handleVoiceToggle}
        accessibilityLabel={recording ? 'Stop recording' : 'Start voice input'}
        accessibilityRole="button"
      >
        {recording ? (
          <View style={styles.recordingRow}>
            <ActivityIndicator color={COLORS.active} size="small" />
            <Text style={[styles.voiceButtonText, { color: COLORS.active }]}>  Recording…</Text>
          </View>
        ) : (
          <Text style={styles.voiceButtonText}>🎤  Voice Input</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        accessibilityLabel="Visualize graph"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color={COLORS.bg} />
        ) : (
          <Text style={styles.submitButtonText}>Visualize →</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.active, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.inactive, marginBottom: 32, opacity: 0.7 },
  inputWrapper: { marginBottom: 16 },
  textInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    color: COLORS.inactive,
    fontSize: 15,
    padding: 16,
    minHeight: 160,
  },
  charCount: { color: '#555', fontSize: 12, textAlign: 'right', marginTop: 4 },
  voiceButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
  },
  voiceButtonActive: { borderColor: COLORS.active },
  recordingRow: { flexDirection: 'row', alignItems: 'center' },
  voiceButtonText: { color: COLORS.inactive, fontSize: 15 },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#1a0000',
    padding: 12,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: COLORS.active,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    minHeight: 56,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: COLORS.bg, fontSize: 16, fontWeight: '700' },
});
