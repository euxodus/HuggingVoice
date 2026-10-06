import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClipForgeShell } from '@/components/ClipForgeShell';
import { useColors } from '@/hooks/useColors';
import { useStudio } from '@/state/StudioContext';

const KEY_FIELDS = [
  { key: 'clipforge.api.openai', label: 'OpenAI key', hint: 'Used for ChatGPT drafts and OpenAI speech.', placeholder: 'Paste key on this device', secret: true },
  { key: 'clipforge.api.anthropic', label: 'Anthropic key', hint: 'Used for Claude script generation.', placeholder: 'Paste key on this device', secret: true },
  { key: 'clipforge.api.elevenlabs', label: 'ElevenLabs key', hint: 'Used for ElevenLabs text to speech.', placeholder: 'Paste key on this device', secret: true },
  { key: 'clipforge.api.azure', label: 'Microsoft Speech key', hint: 'Azure Speech subscription key.', placeholder: 'Paste key on this device', secret: true },
  { key: 'clipforge.api.azure-region', label: 'Microsoft Speech region', hint: 'Example: eastus. This is not a secret.', placeholder: 'Azure resource region', secret: false },
] as const;

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { projects, deleteProject } = useStudio();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [consent, setConsent] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all(KEY_FIELDS.map(async (field) => [field.key, (await SecureStore.getItemAsync(field.key)) ?? ''] as const))
      .then((entries) => { if (mounted) setValues(Object.fromEntries(entries)); })
      .catch(() => {});
    AsyncStorage.multiGet(['clipforge.voice-consent.v1', 'clipforge.analytics-optin.v1'])
      .then((pairs) => {
        if (!mounted) return;
        setConsent(pairs[0]?.[1] === 'yes');
        setAnalytics(pairs[1]?.[1] === 'yes');
      }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const saveKeys = async () => {
    try {
      await Promise.all(KEY_FIELDS.map((field) => {
        const value = (values[field.key] ?? '').trim();
        return value ? SecureStore.setItemAsync(field.key, value) : SecureStore.deleteItemAsync(field.key);
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      Alert.alert('Could not save settings', 'Secure storage is unavailable. Your keys were not saved.');
    }
  };

  const toggleConsent = async (next: boolean) => {
    setConsent(next);
    if (next) await AsyncStorage.setItem('clipforge.voice-consent.v1', 'yes').catch(() => {});
    else await AsyncStorage.removeItem('clipforge.voice-consent.v1').catch(() => {});
  };
  const toggleAnalytics = async (next: boolean) => {
    setAnalytics(next);
    if (next) await AsyncStorage.setItem('clipforge.analytics-optin.v1', 'yes').catch(() => {});
    else await AsyncStorage.removeItem('clipforge.analytics-optin.v1').catch(() => {});
  };
  const clearProjects = () => {
    Alert.alert('Clear all local edits?', 'This deletes HuggingVoice project and caption data on this device. It does not delete source media from your gallery or your API keys.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear projects', style: 'destructive', onPress: () => projects.forEach((project) => deleteProject(project.id)) },
    ]);
  };

  return (
    <ClipForgeShell title="Settings & privacy" subtitle="Local-first by design. Review before connecting services." route="settings">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.accent }]}>
          <Feather name="lock" size={17} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.noticeTitle, { color: colors.foreground }]}>Your keys stay on your phone</Text>
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              HuggingVoice has no account or proxy server. Keys are kept in Android secure storage and sent directly to a provider only when you use that provider.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Provider keys</Text><Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Optional · stored in device secure storage</Text></View>
          <Pressable onPress={() => setShowKeys((value) => !value)} hitSlop={8}>
            <Feather name={showKeys ? 'eye-off' : 'eye'} size={17} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {KEY_FIELDS.map((field) => (
          <View key={field.key} style={styles.keyField}>
            <Text style={[styles.label, { color: colors.foreground }]}>{field.label}</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{field.hint}</Text>
            <TextInput
              value={values[field.key] ?? ''}
              onChangeText={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
              placeholder={field.placeholder}
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={field.secret && !showKeys}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
              testID={`key-${field.key}`}
            />
          </View>
        ))}
        <Pressable onPress={saveKeys} style={[styles.primaryButton, { backgroundColor: colors.primary }]} testID="save-provider-keys">
          <Feather name={saved ? 'check' : 'save'} size={15} color={colors.primaryForeground} />
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{saved ? 'Saved securely' : 'Save keys on this device'}</Text>
        </Pressable>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Privacy controls</Text>
        <View style={[styles.settingRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Voice permission confirmation</Text><Text style={[styles.settingHint, { color: colors.mutedForeground }]}>Require consent before making generated voices.</Text></View>
          <Switch value={consent} onValueChange={toggleConsent} trackColor={{ false: colors.secondary, true: colors.primary }} />
        </View>
        <View style={[styles.settingRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Optional usage analytics</Text><Text style={[styles.settingHint, { color: colors.mutedForeground }]}>Off by default. No analytics service is connected in this build.</Text></View>
          <Switch value={analytics} onValueChange={toggleAnalytics} trackColor={{ false: colors.secondary, true: colors.primary }} />
        </View>
        <View style={[styles.policyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.policyTitleRow}><Feather name="shield" size={15} color={colors.primary} /><Text style={[styles.policyTitle, { color: colors.foreground }]}>Voice, copyright & consent</Text></View>
          <Text style={[styles.policyText, { color: colors.mutedForeground }]}>
            Use only voices and scripts you own or have permission to use. Do not impersonate another person or mislead an audience. HuggingVoice does not include voice cloning. Each provider may receive the text, model choice, and account key needed to fulfill a request; that provider’s own terms and privacy policy apply.
          </Text>
        </View>
        <View style={[styles.policyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.policyTitleRow}><Feather name="cloud-off" size={15} color={colors.primary} /><Text style={[styles.policyTitle, { color: colors.foreground }]}>Data handling</Text></View>
          <Text style={[styles.policyText, { color: colors.mutedForeground }]}>
            Projects and edit metadata are saved locally. HuggingVoice does not upload your local media to its own server. AI text and voice generation sends the specific prompt or script directly to the chosen provider. Android ad networks may receive device and ad measurement data if ads are enabled in a later build.
          </Text>
        </View>

        <View style={[styles.settingRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Free to use</Text><Text style={[styles.settingHint, { color: colors.mutedForeground }]}>The intended model is free access supported by ads.</Text></View>
          <Feather name="check-circle" size={17} color={colors.primary} />
        </View>
        <View style={[styles.adCard, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
          <Feather name="info" size={15} color={colors.primary} />
          <Text style={[styles.adText, { color: colors.mutedForeground }]}>
            Planned ad limit: two placements per session, at app open and export only. An ad provider and publisher account are not connected in this build, so no ads are shown yet.
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(tabs)/export' as never)} style={[styles.linkButton, { borderColor: colors.border }]}>
          <Feather name="share-2" size={15} color={colors.primary} /><Text style={[styles.linkText, { color: colors.foreground }]}>Export options</Text><Feather name="chevron-right" size={15} color={colors.mutedForeground} />
        </Pressable>
        <Pressable onPress={clearProjects} style={[styles.clearButton, { borderColor: colors.destructive }]}>
          <Feather name="trash-2" size={14} color={colors.destructive} /><Text style={[styles.clearText, { color: colors.destructive }]}>Clear all local projects</Text>
        </Pressable>
        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>HuggingVoice is not affiliated with CapCut, TikTok, OpenAI, Anthropic, Microsoft or ElevenLabs. Play Store policies and review outcomes depend on the final app build and listing.</Text>
      </ScrollView>
    </ClipForgeShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  notice: { padding: 12, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeTitle: { fontSize: 11, fontWeight: '700' },
  noticeText: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionHint: { fontSize: 9, marginTop: 3 },
  keyField: { gap: 4 },
  label: { fontSize: 10, fontWeight: '700' },
  hint: { fontSize: 8, lineHeight: 12 },
  input: { minHeight: 41, borderRadius: 11, borderWidth: 1, paddingHorizontal: 11, fontSize: 11 },
  primaryButton: { minHeight: 45, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  primaryButtonText: { fontSize: 11, fontWeight: '800' },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  settingRow: { minHeight: 61, borderRadius: 14, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 9 },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 10, fontWeight: '700' },
  settingHint: { fontSize: 8, lineHeight: 12, marginTop: 3 },
  policyCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 7 },
  policyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  policyTitle: { fontSize: 10, fontWeight: '700' },
  policyText: { fontSize: 9, lineHeight: 14 },
  adCard: { borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  adText: { flex: 1, fontSize: 9, lineHeight: 14 },
  linkButton: { minHeight: 43, paddingHorizontal: 11, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { flex: 1, fontSize: 10, fontWeight: '700' },
  clearButton: { minHeight: 42, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  clearText: { fontSize: 10, fontWeight: '700' },
  footerNote: { fontSize: 8, lineHeight: 13, textAlign: 'center', paddingHorizontal: 8 },
});
