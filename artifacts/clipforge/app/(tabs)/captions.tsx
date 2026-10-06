import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ClipForgeShell } from '@/components/ClipForgeShell';
import { useStudio } from '@/state/StudioContext';

const BASE_STYLES = [
  { name: 'Bold', weight: '900', treatment: 'solid' },
  { name: 'Cinema', weight: '700', treatment: 'outline' },
  { name: 'Karaoke', weight: '900', treatment: 'highlight' },
  { name: 'Minimal', weight: '500', treatment: 'clean' },
  { name: 'Pop', weight: '900', treatment: 'pill' },
  { name: 'Retro', weight: '800', treatment: 'shadow' },
  { name: 'Serif', weight: '700', treatment: 'clean' },
  { name: 'Neon', weight: '900', treatment: 'glow' },
  { name: 'News', weight: '800', treatment: 'banner' },
  { name: 'Creator', weight: '900', treatment: 'pill' },
  { name: 'Elegant', weight: '600', treatment: 'outline' },
] as const;
const ACCENTS = [
  { name: 'Lime', color: '#D7FF65' },
  { name: 'Snow', color: '#FFFFFF' },
  { name: 'Coral', color: '#FF8176' },
  { name: 'Sky', color: '#73D5FF' },
  { name: 'Violet', color: '#C5A1FF' },
  { name: 'Gold', color: '#FFC960' },
  { name: 'Mint', color: '#74F0C1' },
  { name: 'Rose', color: '#FFB2D0' },
  { name: 'Amber', color: '#FFA873' },
  { name: 'Ice', color: '#BBD2FF' },
] as const;
export const CAPTION_PRESETS = BASE_STYLES.flatMap((base, baseIndex) =>
  ACCENTS.map((accent, accentIndex) => ({
    id: baseIndex * ACCENTS.length + accentIndex,
    name: `${base.name} · ${accent.name}`,
    color: accent.color,
    treatment: base.treatment,
    weight: base.weight,
  })),
);

function CaptionCard({ id, name, color, treatment, weight, selected, onPress }: {
  id: number;
  name: string;
  color: string;
  treatment: string;
  weight: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.presetCard,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.accent : colors.card },
      ]}
      testID={`caption-preset-${id}`}
    >
      <View style={[styles.sampleBox, { backgroundColor: treatment === 'banner' || treatment === 'pill' ? '#22262A' : colors.secondary }]}>
        <Text
          numberOfLines={1}
          style={[
            styles.sampleText,
            { color, fontWeight: weight as '500' | '600' | '700' | '800' | '900' },
            treatment === 'outline' ? { textShadowColor: colors.background, textShadowRadius: 1 } : null,
          ]}
        >
          Your story
        </Text>
        {treatment === 'highlight' ? <View style={[styles.highlight, { backgroundColor: color }]} /> : null}
      </View>
      <Text numberOfLines={1} style={[styles.presetName, { color: colors.foreground }]}>{name}</Text>
      <Text style={[styles.presetNumber, { color: colors.mutedForeground }]}>{String(id + 1).padStart(3, '0')}</Text>
    </Pressable>
  );
}

export default function CaptionsScreen() {
  const colors = useColors();
  const { activeProject, addCaption, updateCaption } = useStudio();
  const project = activeProject;
  const activeCaption = project?.captions[0] ?? null;
  const selectedPresetId = activeCaption?.styleId ?? 0;
  const selectedStyle = useMemo(() => CAPTION_PRESETS[selectedPresetId] ?? CAPTION_PRESETS[0], [selectedPresetId]);

  const saveCaption = (text: string) => {
    if (!project) return;
    if (activeCaption) updateCaption(activeCaption.id, { text });
    else if (text.trim()) addCaption({ text, styleId: selectedPresetId, x: 50, y: 80, start: 0, end: 4 });
  };
  const selectStyle = (styleId: number) => {
    if (activeCaption) updateCaption(activeCaption.id, { styleId });
    else if (project) addCaption({ text: 'Your story, in style.', styleId, x: 50, y: 80, start: 0, end: 4 });
  };
  const move = (key: 'x' | 'y', amount: number) => {
    if (!activeCaption) return;
    updateCaption(activeCaption.id, { [key]: Math.max(0, Math.min(100, activeCaption[key] + amount)) });
  };

  return (
    <ClipForgeShell title="Captions" subtitle="110 ready-to-use subtitle looks." route="captions">
      {!project ? (
        <View style={styles.emptyWrap}>
          <Feather name="type" size={24} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Open a project first</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Create a project and subtitle text will be saved to its caption track.</Text>
        </View>
      ) : (
        <View style={styles.page}>
          <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.previewFrame, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.previewCaption, { color: selectedStyle.color, fontWeight: selectedStyle.weight as '500' | '600' | '700' | '800' | '900' }]}>
                {activeCaption?.text || 'Your subtitle preview'}
              </Text>
            </View>
            <View style={styles.previewFooter}>
              <View><Text style={[styles.previewTitle, { color: colors.foreground }]}>Caption position</Text><Text style={[styles.previewHint, { color: colors.mutedForeground }]}>Fine-tune your subtitle placement</Text></View>
              <View style={styles.positionPad}>
                <Pressable onPress={() => move('y', -2)} style={[styles.arrow, { backgroundColor: colors.secondary }]} accessibilityLabel="Move caption up"><Feather name="arrow-up" size={13} color={colors.foreground} /></Pressable>
                <View style={styles.horizontalArrows}>
                  <Pressable onPress={() => move('x', -2)} style={[styles.arrow, { backgroundColor: colors.secondary }]} accessibilityLabel="Move caption left"><Feather name="arrow-left" size={13} color={colors.foreground} /></Pressable>
                  <Pressable onPress={() => move('x', 2)} style={[styles.arrow, { backgroundColor: colors.secondary }]} accessibilityLabel="Move caption right"><Feather name="arrow-right" size={13} color={colors.foreground} /></Pressable>
                </View>
                <Pressable onPress={() => move('y', 2)} style={[styles.arrow, { backgroundColor: colors.secondary }]} accessibilityLabel="Move caption down"><Feather name="arrow-down" size={13} color={colors.foreground} /></Pressable>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Caption text</Text>
          <TextInput
            value={activeCaption?.text ?? ''}
            onChangeText={saveCaption}
            placeholder="Write a subtitle or add it from Voice Studio"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.captionInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            testID="caption-text-input"
          />
          {activeCaption ? (
            <Pressable onPress={() => updateCaption(activeCaption.id, { start: Math.max(0, activeCaption.start - 1), end: activeCaption.end + 1 })} style={[styles.timingButton, { borderColor: colors.border }]}>
              <Feather name="clock" size={14} color={colors.primary} />
              <Text style={[styles.timingText, { color: colors.foreground }]}>Caption timing: {Math.floor(activeCaption.start)}s–{Math.floor(activeCaption.end)}s</Text>
              <Text style={[styles.timingHint, { color: colors.mutedForeground }]}>Extend 1s</Text>
            </Pressable>
          ) : null}

          <View style={styles.presetHeading}>
            <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Style library</Text><Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Choose one of 110 presets</Text></View>
            <View style={[styles.presetCount, { backgroundColor: colors.accent }]}><Text style={[styles.presetCountText, { color: colors.primary }]}>110</Text></View>
          </View>
          <FlatList
            data={CAPTION_PRESETS}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.presetRow}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <CaptionCard {...item} selected={item.id === selectedPresetId} onPress={() => selectStyle(item.id)} />
            )}
            scrollEnabled
            testID="caption-style-library"
          />
        </View>
      )}
    </ClipForgeShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16 },
  preview: { borderWidth: 1, borderRadius: 19, padding: 12, marginBottom: 15 },
  previewFrame: { minHeight: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  previewCaption: { fontSize: 19, textAlign: 'center', paddingHorizontal: 18, textShadowColor: '#000000', textShadowRadius: 5 },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  previewTitle: { fontSize: 11, fontWeight: '700' },
  previewHint: { fontSize: 9, marginTop: 3 },
  positionPad: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  horizontalArrows: { gap: 4 },
  arrow: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  captionInput: { minHeight: 57, maxHeight: 105, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 8, fontSize: 13, textAlignVertical: 'top' },
  timingButton: { minHeight: 38, borderWidth: 1, borderRadius: 12, marginTop: 8, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  timingText: { fontSize: 10, fontWeight: '600', flex: 1 },
  timingHint: { fontSize: 9 },
  presetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  sectionHint: { fontSize: 10, marginTop: 3 },
  presetCount: { width: 36, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  presetCountText: { fontSize: 11, fontWeight: '800' },
  grid: { paddingTop: 10, paddingBottom: 25, gap: 8 },
  presetRow: { gap: 8 },
  presetCard: { flex: 1, minHeight: 67, borderRadius: 12, borderWidth: 1, padding: 6 },
  sampleBox: { height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sampleText: { fontSize: 12, textShadowColor: '#000000', textShadowRadius: 2 },
  highlight: { position: 'absolute', bottom: 3, height: 2, width: 43, borderRadius: 2 },
  presetName: { fontSize: 9, fontWeight: '700', marginTop: 4 },
  presetNumber: { position: 'absolute', top: 6, right: 8, fontSize: 7 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 25 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { textAlign: 'center', fontSize: 12, lineHeight: 18, maxWidth: 270 },
});
