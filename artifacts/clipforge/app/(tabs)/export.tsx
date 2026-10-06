import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { ClipForgeShell } from '@/components/ClipForgeShell';
import { useColors } from '@/hooks/useColors';
import { useStudio } from '@/state/StudioContext';

export default function ExportScreen() {
  const colors = useColors();
  const { activeProject } = useStudio();
  const latestVoice = [...(activeProject?.clips ?? [])].reverse().find((clip) => clip.kind === 'voice');

  const shareAudio = async () => {
    if (!latestVoice) {
      Alert.alert('No generated MP3 yet', 'Create an MP3 in Voice Studio to share an audio file.');
      return;
    }
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Android sharing is not available on this device.');
      await Sharing.shareAsync(latestVoice.uri, { mimeType: 'audio/mpeg', dialogTitle: 'Share generated MP3' });
    } catch (error) {
      Alert.alert('Could not share MP3', error instanceof Error ? error.message : 'Try again from an Android device.');
    }
  };

  const explainVideo = () => {
    Alert.alert(
      'MP4 rendering is not included yet',
      'This build saves your clip and trim settings locally, but it does not combine or render edited video, audio, and captions into a finished movie. The source files stay unchanged.',
    );
  };

  return (
    <ClipForgeShell title="Export" subtitle={activeProject?.name ?? 'Create or open a project to export.'} route="export">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}><Feather name="film" size={19} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{activeProject?.name ?? 'No active edit'}</Text>
            <Text style={[styles.summaryMeta, { color: colors.mutedForeground }]}>
              {activeProject?.clips.length ?? 0} media items · {activeProject?.captions.length ?? 0} captions
            </Text>
          </View>
          <View style={[styles.localPill, { backgroundColor: colors.accent }]}><Text style={[styles.localPillText, { color: colors.primary }]}>LOCAL</Text></View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available now</Text>
        <Pressable onPress={shareAudio} style={[styles.formatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.formatIcon, { backgroundColor: colors.secondary }]}><Feather name="music" size={16} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.formatTitle, { color: colors.foreground }]}>Share generated MP3</Text>
            <Text style={[styles.formatHint, { color: colors.mutedForeground }]}>{latestVoice ? `Latest voiceover · ${latestVoice.name}` : 'Generate a voiceover first in Voice Studio'}</Text>
          </View>
          <Feather name="arrow-up-right" size={15} color={colors.primary} />
        </Pressable>
        <Text style={[styles.smallNote, { color: colors.mutedForeground }]}>
          Shares the generated MP3 file. Timeline trims and audio filters are not applied to it yet.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 5 }]}>Video export</Text>
        <View style={[styles.blockedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.blockedHeading}>
            <View style={[styles.formatIcon, { backgroundColor: colors.secondary }]}><Feather name="video" size={16} color={colors.mutedForeground} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.formatTitle, { color: colors.foreground }]}>MP4 / MOV / WebM</Text><Text style={[styles.formatHint, { color: colors.mutedForeground }]}>Rendered video not available in this build</Text></View>
            <View style={[styles.soonPill, { backgroundColor: colors.secondary }]}><Text style={[styles.soonText, { color: colors.mutedForeground }]}>NOT READY</Text></View>
          </View>
          <Text style={[styles.blockedText, { color: colors.mutedForeground }]}>
            Trim values, tracks and captions are saved on this device, but this version has no media-rendering engine to bake those edits into a final movie. It will not export an unedited source as if it were edited.
          </Text>
          <Pressable onPress={explainVideo} style={[styles.detailButton, { borderColor: colors.border }]}>
            <Feather name="info" size={13} color={colors.primary} /><Text style={[styles.detailButtonText, { color: colors.foreground }]}>Why can’t I render here?</Text>
          </Pressable>
        </View>

        <View style={[styles.qualityCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Feather name="settings" size={15} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.qualityTitle, { color: colors.foreground }]}>Planned render settings</Text>
            <Text style={[styles.qualityText, { color: colors.mutedForeground }]}>1080p · 30 fps · H.264 MP4 · original aspect ratio · separate audio-only output</Text>
          </View>
        </View>

        <View style={[styles.disclaimer, { borderColor: colors.border }]}>
          <Feather name="shield" size={14} color={colors.primary} />
          <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
            A share sheet, upload to TikTok, and posting to other apps require their own platform integrations and user permission. HuggingVoice does not store your social passwords or tokens.
          </Text>
        </View>
        <Text style={[styles.freeNote, { color: colors.mutedForeground }]}>HuggingVoice is intended to be free. Ads at app open and export, with a two-ad session cap, still need an ad provider account and SDK setup.</Text>
      </ScrollView>
    </ClipForgeShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28, gap: 11 },
  summary: { minHeight: 69, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  summaryIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 11, fontWeight: '700' },
  summaryMeta: { fontSize: 9, marginTop: 4 },
  localPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  localPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  formatCard: { minHeight: 66, borderWidth: 1, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  formatIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  formatTitle: { fontSize: 10, fontWeight: '700' },
  formatHint: { fontSize: 8, lineHeight: 12, marginTop: 4 },
  smallNote: { fontSize: 8, lineHeight: 12, paddingHorizontal: 4 },
  blockedCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  blockedHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  soonPill: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7 },
  soonText: { fontSize: 7, fontWeight: '800' },
  blockedText: { fontSize: 9, lineHeight: 15 },
  detailButton: { minHeight: 34, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9 },
  detailButtonText: { fontSize: 9, fontWeight: '600' },
  qualityCard: { borderRadius: 14, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  qualityTitle: { fontSize: 10, fontWeight: '700' },
  qualityText: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  disclaimer: { borderWidth: 1, borderRadius: 13, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 9, lineHeight: 14 },
  freeNote: { fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: 6 },
});
