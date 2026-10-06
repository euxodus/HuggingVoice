import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ClipForgeShell } from '@/components/ClipForgeShell';
import { useStudio } from '@/state/StudioContext';

const FILTERS = [
  { name: 'Clean', detail: 'Natural voice' },
  { name: 'Podcast', detail: 'Voice-forward' },
  { name: 'Broadcast Mic', detail: 'Radio presence' },
  { name: 'Bass Mic', detail: 'Low-end warmth' },
  { name: 'Studio', detail: 'Balanced room' },
  { name: 'Warm Tape', detail: 'Soft saturation' },
  { name: 'Airy', detail: 'Bright top end' },
  { name: 'Telephone', detail: 'Narrow band' },
  { name: 'Vintage Radio', detail: 'Lo-fi broadcast' },
  { name: 'Cinematic', detail: 'Wide and full' },
  { name: 'Deep Voice', detail: 'Low-frequency boost' },
  { name: 'Bright Voice', detail: 'Clear consonants' },
  { name: 'De-ess', detail: 'Softer sibilance' },
  { name: 'Room Tone', detail: 'Gentle ambience' },
  { name: 'Small Room', detail: 'Tight space' },
  { name: 'Large Hall', detail: 'Longer reverb' },
  { name: 'Whisper', detail: 'Soft close-up' },
  { name: 'Megaphone', detail: 'Forward edge' },
  { name: 'Underwater', detail: 'Muffled tone' },
  { name: 'Lo-fi', detail: 'Filtered texture' },
  { name: 'Acoustic', detail: 'Warm strings' },
  { name: 'Club Bass', detail: 'Punchy lows' },
  { name: 'Dance', detail: 'Bass and sparkle' },
  { name: 'Orchestra', detail: 'Wide dynamic' },
  { name: 'Podcast Duo', detail: 'Speech clarity' },
  { name: 'ASMR', detail: 'Close detail' },
  { name: 'Car Stereo', detail: 'Compact playback' },
  { name: 'Night Mode', detail: 'Controlled peaks' },
  { name: 'Noise Cut', detail: 'Reduced rumble' },
  { name: 'Custom EQ', detail: 'Your band mix' },
] as const;
const BANDS = ['60', '120', '250', '500', '1k', '2k', '4k', '8k', '12k', '16k'];

export default function AudioScreen() {
  const colors = useColors();
  const { activeProject, setAudioFilter, setEqualizerBand } = useStudio();
  const currentFilter = activeProject?.audioFilter ?? 0;
  const equalizer = activeProject?.equalizer ?? Array(10).fill(0);

  const updateBand = (index: number, step: number) => {
    if (!activeProject) return;
    setEqualizerBand(index, equalizer[index] + step);
  };

  return (
    <ClipForgeShell title="Audio effects" subtitle="30 filter profiles and a 10-band equalizer." route="audio">
      {!activeProject ? (
        <View style={styles.empty}>
          <Feather name="sliders" size={24} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Open an edit first</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Audio settings are stored with each local project.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.engineNote, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Feather name="info" size={15} color={colors.primary} />
            <Text style={[styles.engineNoteText, { color: colors.foreground }]}>
              These filter and EQ choices are saved with the edit. This build does not apply DSP or render them into an audio file yet.
            </Text>
          </View>

          <View style={styles.heading}>
            <View><Text style={[styles.title, { color: colors.foreground }]}>Filter profiles</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Select a starting point for your mix</Text></View>
            <View style={[styles.totalBadge, { backgroundColor: colors.accent }]}><Text style={[styles.totalText, { color: colors.primary }]}>30</Text></View>
          </View>
          <View style={styles.filterGrid}>
            {FILTERS.map((filter, index) => (
              <Pressable
                key={filter.name}
                onPress={() => setAudioFilter(index)}
                style={[styles.filterCard, { backgroundColor: currentFilter === index ? colors.accent : colors.card, borderColor: currentFilter === index ? colors.primary : colors.border }]}
                testID={`audio-filter-${index}`}
              >
                <View style={[styles.filterIcon, { backgroundColor: currentFilter === index ? colors.primary : colors.secondary }]}>
                  <Feather name={index === 0 ? 'volume-2' : index < 5 ? 'mic' : 'sliders'} size={13} color={currentFilter === index ? colors.primaryForeground : colors.mutedForeground} />
                </View>
                <Text numberOfLines={1} style={[styles.filterName, { color: colors.foreground }]}>{filter.name}</Text>
                <Text numberOfLines={1} style={[styles.filterDetail, { color: colors.mutedForeground }]}>{filter.detail}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.equalizerHeading}>
            <View><Text style={[styles.title, { color: colors.foreground }]}>10-band equalizer</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Adjust each band in 1 dB steps</Text></View>
            <Pressable onPress={() => BANDS.forEach((_, index) => setEqualizerBand(index, 0))}>
              <Text style={[styles.reset, { color: colors.primary }]}>Reset</Text>
            </Pressable>
          </View>
          <View style={[styles.eqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.eqScale}><Text style={[styles.scaleText, { color: colors.mutedForeground }]}>+6 dB</Text><Text style={[styles.scaleText, { color: colors.mutedForeground }]}>0</Text><Text style={[styles.scaleText, { color: colors.mutedForeground }]}>−6 dB</Text></View>
            <View style={styles.eqBands}>
              {BANDS.map((band, index) => (
                <View key={band} style={styles.eqBand}>
                  <Text style={[styles.eqValue, { color: equalizer[index] === 0 ? colors.mutedForeground : colors.primary }]}>{equalizer[index] > 0 ? '+' : ''}{equalizer[index]}</Text>
                  <View style={[styles.eqRail, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.eqCenterLine, { backgroundColor: colors.border }]} />
                    <View style={[styles.eqDot, { backgroundColor: colors.primary, top: `${50 - (equalizer[index] / 12) * 100}%` }]} />
                  </View>
                  <View style={styles.eqButtons}>
                    <Pressable onPress={() => updateBand(index, 1)} style={[styles.eqButton, { backgroundColor: colors.secondary }]} accessibilityLabel={`Increase ${band} hertz`}><Feather name="plus" size={10} color={colors.foreground} /></Pressable>
                    <Pressable onPress={() => updateBand(index, -1)} style={[styles.eqButton, { backgroundColor: colors.secondary }]} accessibilityLabel={`Decrease ${band} hertz`}><Feather name="minus" size={10} color={colors.foreground} /></Pressable>
                  </View>
                  <Text style={[styles.bandLabel, { color: colors.mutedForeground }]}>{band}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.eqFootnote, { color: colors.mutedForeground }]}>Values are stored as project mix settings. No source audio is modified.</Text>
          </View>

          <Pressable
            onPress={() => Alert.alert('Audio settings saved', `${FILTERS[currentFilter].name} and your equalizer values are saved in this project. They will not change audio until an audio-processing renderer is added.`)}
            style={[styles.savedButton, { backgroundColor: colors.primary }]}
          >
            <Feather name="check" size={15} color={colors.primaryForeground} /><Text style={[styles.savedButtonText, { color: colors.primaryForeground }]}>Mix settings saved locally</Text>
          </Pressable>
        </ScrollView>
      )}
    </ClipForgeShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28, gap: 13 },
  engineNote: { borderWidth: 1, borderRadius: 14, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  engineNoteText: { flex: 1, fontSize: 9, lineHeight: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 9, marginTop: 3 },
  totalBadge: { width: 33, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  totalText: { fontSize: 10, fontWeight: '800' },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterCard: { width: '31.5%', minHeight: 76, borderRadius: 12, borderWidth: 1, padding: 7, justifyContent: 'center' },
  filterIcon: { width: 23, height: 23, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  filterName: { fontSize: 8, fontWeight: '700' },
  filterDetail: { fontSize: 7, marginTop: 3 },
  equalizerHeading: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reset: { fontSize: 10, fontWeight: '700' },
  eqCard: { borderWidth: 1, borderRadius: 15, padding: 10 },
  eqScale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { fontSize: 7 },
  eqBands: { flexDirection: 'row', justifyContent: 'space-between', gap: 3, marginTop: 6 },
  eqBand: { alignItems: 'center', flex: 1 },
  eqValue: { fontSize: 8, fontWeight: '700', height: 13 },
  eqRail: { width: 5, height: 87, borderRadius: 4, position: 'relative', marginVertical: 6 },
  eqCenterLine: { position: 'absolute', height: 1, top: '50%', left: -2, right: -2 },
  eqDot: { position: 'absolute', width: 12, height: 12, left: -3.5, borderRadius: 6 },
  eqButtons: { gap: 4 },
  eqButton: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  bandLabel: { fontSize: 7, marginTop: 5 },
  eqFootnote: { fontSize: 8, lineHeight: 12, marginTop: 8, textAlign: 'center' },
  savedButton: { minHeight: 43, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  savedButtonText: { fontSize: 10, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25, gap: 9 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
