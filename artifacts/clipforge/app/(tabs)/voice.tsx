import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import { File, Paths } from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClipForgeShell } from '@/components/ClipForgeShell';
import { useColors } from '@/hooks/useColors';
import { useStudio } from '@/state/StudioContext';

type ChatProvider = 'openai' | 'anthropic';
type SpeechProvider = 'elevenlabs' | 'openai' | 'azure' | 'device';

const CONSENT_KEY = 'clipforge.voice-consent.v1';
const CHAT_MODELS: Record<ChatProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4.1-mini'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-sonnet-4-20250514'],
};
const SPEECH_MODELS: Record<SpeechProvider, string[]> = {
  elevenlabs: ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5'],
  openai: ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
  azure: ['Aria · en-US', 'Jenny · en-US', 'Sonia · en-GB'],
  device: ['System voice'],
};
const VOICE_PRESETS = [
  { name: 'Rachel', id: '21m00Tcm4TlvDq8ikWAM' },
  { name: 'Domi', id: 'AZnzlk1XvdvUeBnXmlld' },
  { name: 'Antoni', id: 'ErXwobaYiN019PkySvjV' },
  { name: 'Bella', id: 'EXAVITQu4vr4xnSDxMaL' },
];

function splitSentences(text: string) {
  const sentences = text.trim().match(/[^.!?]+[.!?]?/g) ?? [];
  return sentences.map((sentence) => sentence.trim()).filter(Boolean);
}

function explainHttpFailure(provider: string, response: Response) {
  return response.text().then((body) => {
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? body;
    } catch {}
    throw new Error(`${provider} returned ${response.status}: ${message.slice(0, 220)}`);
  });
}

async function saveMp3(response: Response) {
  if (!response.ok) await explainHttpFailure('Speech provider', response);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = new File(Paths.cache, `clipforge-voice-${Date.now()}.mp3`);
  file.create({ intermediates: true, overwrite: true });
  file.write(bytes);
  return file;
}

export default function VoiceStudioScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeProject, addMedia, addCaption } = useStudio();
  const [chatProvider, setChatProvider] = useState<ChatProvider>('openai');
  const [speechProvider, setSpeechProvider] = useState<SpeechProvider>('elevenlabs');
  const [chatModel, setChatModel] = useState(CHAT_MODELS.openai[0]);
  const [speechModel, setSpeechModel] = useState(SPEECH_MODELS.elevenlabs[0]);
  const [voiceId, setVoiceId] = useState(VOICE_PRESETS[0].id);
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [latestAudioUri, setLatestAudioUri] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CONSENT_KEY).then((saved) => {
      if (mounted && saved === 'yes') setConsent(true);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const textLength = useMemo(() => text.trim().length, [text]);

  const chooseChatProvider = (next: ChatProvider) => {
    setChatProvider(next);
    setChatModel(CHAT_MODELS[next][0]);
  };
  const chooseSpeechProvider = (next: SpeechProvider) => {
    setSpeechProvider(next);
    setSpeechModel(SPEECH_MODELS[next][0]);
  };
  const acceptVoicePolicy = async () => {
    const next = !consent;
    setConsent(next);
    try {
      if (next) await AsyncStorage.setItem(CONSENT_KEY, 'yes');
      else await AsyncStorage.removeItem(CONSENT_KEY);
    } catch {}
  };

  const draftText = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setNotice('');
    try {
      const keyName = chatProvider === 'openai' ? 'clipforge.api.openai' : 'clipforge.api.anthropic';
      const key = await SecureStore.getItemAsync(keyName);
      if (!key) throw new Error(`Add your ${chatProvider === 'openai' ? 'OpenAI' : 'Anthropic'} key in Settings before generating text.`);
      let response: Response;
      let generated = '';
      if (chatProvider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: chatModel, messages: [{ role: 'user', content: prompt }], temperature: 0.7 }),
        });
        if (!response.ok) await explainHttpFailure('OpenAI', response);
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        generated = data.choices?.[0]?.message?.content ?? '';
      } else {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model: chatModel, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
        });
        if (!response.ok) await explainHttpFailure('Anthropic', response);
        const data = await response.json() as { content?: { type: string; text?: string }[] };
        generated = data.content?.find((part) => part.type === 'text')?.text ?? '';
      }
      if (!generated.trim()) throw new Error('The provider returned an empty response. Try a different prompt.');
      setText(generated.trim());
      setPromptOpen(false);
      setPrompt('');
      Keyboard.dismiss();
      setNotice('Draft added to your voice script. Review it before creating audio.');
    } catch (error) {
      Alert.alert('Text generation failed', error instanceof Error ? error.message : 'Check the provider key and network connection, then retry.');
    } finally {
      setBusy(false);
    }
  };

  const generateSpeech = async () => {
    if (!activeProject) {
      Alert.alert('Open a project first', 'Create or open an edit before adding generated audio to its voice track.');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Add your script', 'Write or generate a short script before creating audio.');
      return;
    }
    const savedConsent = await AsyncStorage.getItem(CONSENT_KEY).catch(() => null);
    if (!consent || savedConsent !== 'yes') {
      setConsent(false);
      Alert.alert('Voice permission required', 'Confirm that you have permission to use the selected voice and script before generating audio.');
      return;
    }
    if (speechProvider === 'device') {
      Speech.speak(text, { language: 'en-US', rate: 0.96 });
      setNotice('Playing the phone’s system voice. Android system speech is preview-only in this build and is not saved as an audio file.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      let response: Response;
      if (speechProvider === 'elevenlabs') {
        const key = await SecureStore.getItemAsync('clipforge.api.elevenlabs');
        if (!key) throw new Error('Add your ElevenLabs key in Settings before generating audio.');
        response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
          method: 'POST',
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text, model_id: speechModel, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
        });
      } else if (speechProvider === 'openai') {
        const key = await SecureStore.getItemAsync('clipforge.api.openai');
        if (!key) throw new Error('Add your OpenAI key in Settings before generating audio.');
        response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: speechModel, voice: 'alloy', input: text, response_format: 'mp3' }),
        });
      } else {
        const key = await SecureStore.getItemAsync('clipforge.api.azure');
        const region = await SecureStore.getItemAsync('clipforge.api.azure-region');
        if (!key || !region) throw new Error('Add your Microsoft Speech key and region in Settings first.');
        const azureVoice = speechModel.startsWith('Jenny') ? 'en-US-JennyNeural' : speechModel.startsWith('Sonia') ? 'en-GB-SoniaNeural' : 'en-US-AriaNeural';
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': key,
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'Content-Type': 'application/ssml+xml',
          },
          body: `<speak version="1.0" xml:lang="en-US"><voice name="${azureVoice}">${escaped}</voice></speak>`,
        });
      }
      const file = await saveMp3(response);
      const words = text.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(1, Math.round(words / 2.4));
      addMedia([{ name: `Voiceover · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, uri: file.uri, kind: 'voice', durationSeconds: estimatedDuration }]);
      setLatestAudioUri(file.uri);
      setNotice(`MP3 saved locally and added to the voice track (${estimatedDuration}s estimated).`);
    } catch (error) {
      Alert.alert('Audio generation failed', error instanceof Error ? error.message : 'Check the provider settings and try again.');
    } finally {
      setBusy(false);
    }
  };

  const addSubtitles = () => {
    if (!activeProject) {
      Alert.alert('Open a project first', 'Create or open an edit to add a subtitle track.');
      return;
    }
    const sentences = splitSentences(text);
    if (!sentences.length) return;
    let cursor = 0;
    sentences.forEach((sentence) => {
      const duration = Math.max(2, Math.ceil(sentence.split(/\s+/).length / 2.5));
      addCaption({ text: sentence, styleId: 0, x: 50, y: 82, start: cursor, end: cursor + duration });
      cursor += duration;
    });
    setNotice(`${sentences.length} subtitle${sentences.length === 1 ? '' : 's'} added to your caption track.`);
  };

  return (
    <ClipForgeShell title="Voice studio" subtitle="Write a script, then create a local audio track." route="voice">
      <KeyboardAvoidingView style={styles.keyboard} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.localCallout, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Feather name="smartphone" size={16} color={colors.primary} />
            <Text style={[styles.localCalloutText, { color: colors.foreground }]}>
              Your provider key stays in Android secure storage. When you generate, your text is sent directly to the provider you choose.
            </Text>
          </View>

          <View style={styles.sectionHeading}>
            <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>1. Write a script</Text><Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Type your own or ask an AI provider</Text></View>
            <Text style={[styles.counter, { color: colors.mutedForeground }]}>{textLength} chars</Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder="Your words go here. Add narration, a hook, or a voiceover…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.script, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            testID="voice-script"
          />

          <View style={styles.providerRow}>
            {(['openai', 'anthropic'] as const).map((provider) => (
              <Pressable
                key={provider}
                onPress={() => chooseChatProvider(provider)}
                style={[styles.provider, { borderColor: provider === chatProvider ? colors.primary : colors.border, backgroundColor: provider === chatProvider ? colors.accent : colors.card }]}
              >
                <Text style={[styles.providerLabel, { color: colors.foreground }]}>{provider === 'openai' ? 'ChatGPT' : 'Claude'}</Text>
                <Text style={[styles.providerDetail, { color: colors.mutedForeground }]}>{provider === 'openai' ? 'OpenAI' : 'Anthropic'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.modelRow}>
            {CHAT_MODELS[chatProvider].map((model) => (
              <Pressable key={model} onPress={() => setChatModel(model)} style={[styles.modelChip, { borderColor: model === chatModel ? colors.primary : colors.border, backgroundColor: model === chatModel ? colors.accent : colors.card }]}>
                <Text style={[styles.modelText, { color: model === chatModel ? colors.primary : colors.mutedForeground }]}>{model}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setPromptOpen(true)} style={[styles.aiButton, { backgroundColor: colors.secondary, borderColor: colors.border }]} testID="generate-script">
            <Feather name="zap" size={16} color={colors.primary} />
            <Text style={[styles.aiButtonText, { color: colors.foreground }]}>Generate from a prompt</Text>
            <Feather name="arrow-up-right" size={14} color={colors.mutedForeground} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.sectionHeading}>
            <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>2. Create the voice track</Text><Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Choose a voice provider and model</Text></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceProviders}>
            {([
              ['elevenlabs', 'ElevenLabs'],
              ['openai', 'OpenAI'],
              ['azure', 'Microsoft Azure'],
              ['device', 'On-device'],
            ] as const).map(([provider, title]) => (
              <Pressable key={provider} onPress={() => chooseSpeechProvider(provider)} style={[styles.voiceProvider, { backgroundColor: provider === speechProvider ? colors.accent : colors.card, borderColor: provider === speechProvider ? colors.primary : colors.border }]}>
                <Text style={[styles.voiceProviderText, { color: provider === speechProvider ? colors.primary : colors.foreground }]}>{title}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.modelRow}>
            {SPEECH_MODELS[speechProvider].map((model) => (
              <Pressable key={model} onPress={() => setSpeechModel(model)} style={[styles.modelChip, { borderColor: model === speechModel ? colors.primary : colors.border, backgroundColor: model === speechModel ? colors.accent : colors.card }]}>
                <Text style={[styles.modelText, { color: model === speechModel ? colors.primary : colors.mutedForeground }]}>{model}</Text>
              </Pressable>
            ))}
          </View>

          {speechProvider === 'elevenlabs' ? (
            <View style={styles.voiceChoices}>
              <Text style={[styles.voiceChoicesLabel, { color: colors.mutedForeground }]}>VOICE</Text>
              {VOICE_PRESETS.map((voice) => (
                <Pressable key={voice.id} onPress={() => setVoiceId(voice.id)} style={[styles.voiceChoice, { borderColor: voiceId === voice.id ? colors.primary : colors.border, backgroundColor: voiceId === voice.id ? colors.accent : colors.card }]}>
                  <Text style={[styles.voiceChoiceText, { color: voiceId === voice.id ? colors.primary : colors.foreground }]}>{voice.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {speechProvider === 'device' ? (
            <Pressable onPress={() => Speech.speak(text || 'Your local system voice is ready to preview.', { language: 'en-US' })} style={[styles.deviceButton, { borderColor: colors.border }]}>
              <Feather name="volume-2" size={15} color={colors.primary} />
              <Text style={[styles.deviceText, { color: colors.foreground }]}>Preview Android system voice</Text>
            </Pressable>
          ) : null}

          <View style={[styles.consentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={acceptVoicePolicy} style={styles.consentRow} testID="voice-consent">
              <View style={[styles.checkbox, { borderColor: consent ? colors.primary : colors.mutedForeground, backgroundColor: consent ? colors.primary : 'transparent' }]}>
                {consent ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
              </View>
              <Text style={[styles.consentText, { color: colors.foreground }]}>
                I own or have permission to use this voice and script. I will not impersonate anyone or create deceptive audio.
              </Text>
            </Pressable>
            <Text style={[styles.consentFootnote, { color: colors.mutedForeground }]}>
              HuggingVoice does not offer voice cloning. Follow the selected provider’s voice, copyright, and consent rules.
            </Text>
          </View>

          <Pressable
            onPress={generateSpeech}
            disabled={busy}
            style={[styles.generateButton, { backgroundColor: colors.primary, opacity: busy ? 0.55 : 1 }]}
            testID="generate-voice"
          >
            <Feather name={busy ? 'loader' : 'mic'} size={17} color={colors.primaryForeground} />
            <Text style={[styles.generateButtonText, { color: colors.primaryForeground }]}>{busy ? 'Working…' : speechProvider === 'device' ? 'Preview system voice' : 'Generate MP3 to timeline'}</Text>
            <Feather name="arrow-right" size={15} color={colors.primaryForeground} />
          </Pressable>
          {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}

          {latestAudioUri ? (
            <View style={[styles.successCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={[styles.successIcon, { backgroundColor: colors.accent }]}><Feather name="check" size={15} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.successTitle, { color: colors.foreground }]}>Voiceover is ready</Text><Text style={[styles.successSub, { color: colors.mutedForeground }]}>MP3 file saved on this device</Text></View>
              <Pressable onPress={addSubtitles} style={styles.subtitlesButton}><Feather name="type" size={13} color={colors.primary} /><Text style={[styles.subtitlesText, { color: colors.primary }]}>Subtitles</Text></Pressable>
            </View>
          ) : null}

          <Text style={[styles.providerFootnote, { color: colors.mutedForeground }]}>
            Available voices, models, language coverage, and pricing depend on your provider account. Microsoft voices require an Azure Speech resource. Android system voices are preview-only here.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={promptOpen} transparent animationType="slide" onRequestClose={() => setPromptOpen(false)}>
        <View style={styles.modalShade}>
          <KeyboardAvoidingView behavior="padding" style={[styles.promptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.promptHeader}>
              <View><Text style={[styles.promptTitle, { color: colors.foreground }]}>Write with {chatProvider === 'openai' ? 'ChatGPT' : 'Claude'}</Text><Text style={[styles.promptSub, { color: colors.mutedForeground }]}>{chatModel} · response goes into your script</Text></View>
              <Pressable onPress={() => setPromptOpen(false)} hitSlop={9}><Feather name="x" size={19} color={colors.mutedForeground} /></Pressable>
            </View>
            <TextInput value={prompt} onChangeText={setPrompt} autoFocus multiline textAlignVertical="top" placeholder="Describe the script you want…" placeholderTextColor={colors.mutedForeground} style={[styles.promptInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]} />
            <Text style={[styles.promptPrivacy, { color: colors.mutedForeground }]}>This prompt is sent directly to {chatProvider === 'openai' ? 'OpenAI' : 'Anthropic'} using your device-stored key.</Text>
            <Pressable onPress={draftText} disabled={busy || !prompt.trim()} style={[styles.generateButton, { backgroundColor: colors.primary, opacity: busy || !prompt.trim() ? 0.5 : 1 }]}>
              <Feather name="zap" size={16} color={colors.primaryForeground} /><Text style={[styles.generateButtonText, { color: colors.primaryForeground }]}>{busy ? 'Generating…' : 'Generate script'}</Text><Feather name="arrow-right" size={15} color={colors.primaryForeground} />
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ClipForgeShell>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  localCallout: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  localCalloutText: { flex: 1, fontSize: 10, lineHeight: 15 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionHint: { fontSize: 10, marginTop: 3 },
  counter: { fontSize: 9 },
  script: { minHeight: 106, maxHeight: 200, borderWidth: 1, borderRadius: 16, padding: 12, fontSize: 13, lineHeight: 19 },
  providerRow: { flexDirection: 'row', gap: 8 },
  provider: { flex: 1, borderWidth: 1, borderRadius: 13, minHeight: 49, justifyContent: 'center', paddingHorizontal: 11 },
  providerLabel: { fontSize: 11, fontWeight: '700' },
  providerDetail: { fontSize: 9, marginTop: 2 },
  modelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modelChip: { borderWidth: 1, borderRadius: 9, minHeight: 27, paddingHorizontal: 8, justifyContent: 'center' },
  modelText: { fontSize: 8, fontWeight: '600' },
  aiButton: { minHeight: 43, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiButtonText: { flex: 1, fontSize: 11, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 5 },
  voiceProviders: { gap: 7, paddingRight: 10 },
  voiceProvider: { minHeight: 36, borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, justifyContent: 'center' },
  voiceProviderText: { fontSize: 9, fontWeight: '700' },
  voiceChoices: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  voiceChoicesLabel: { fontSize: 8, fontWeight: '800', marginRight: 2 },
  voiceChoice: { minHeight: 28, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, justifyContent: 'center' },
  voiceChoiceText: { fontSize: 9, fontWeight: '600' },
  deviceButton: { minHeight: 39, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 },
  deviceText: { fontSize: 10, fontWeight: '700' },
  consentCard: { borderWidth: 1, borderRadius: 15, padding: 12, gap: 8 },
  consentRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentText: { flex: 1, fontSize: 10, lineHeight: 15 },
  consentFootnote: { fontSize: 9, lineHeight: 14, paddingLeft: 29 },
  generateButton: { minHeight: 49, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  generateButtonText: { flex: 1, fontSize: 12, fontWeight: '800' },
  notice: { fontSize: 10, lineHeight: 15 },
  successCard: { minHeight: 57, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  successIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 10, fontWeight: '700' },
  successSub: { fontSize: 8, marginTop: 3 },
  subtitlesButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subtitlesText: { fontSize: 9, fontWeight: '700' },
  providerFootnote: { fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: 8 },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)', padding: 14, paddingBottom: 20 },
  promptCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  promptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promptTitle: { fontSize: 16, fontWeight: '700' },
  promptSub: { fontSize: 9, marginTop: 4 },
  promptInput: { minHeight: 118, maxHeight: 200, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 13, textAlignVertical: 'top' },
  promptPrivacy: { fontSize: 9, lineHeight: 14 },
});
