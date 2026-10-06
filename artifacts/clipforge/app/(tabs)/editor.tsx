import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { ClipForgeShell } from '@/components/ClipForgeShell';
import { useColors } from '@/hooks/useColors';
import { StudioClip, useStudio } from '@/state/StudioContext';

function time(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}

export default function EditorScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeProject, activeProjectId, createProject, addMedia, removeClip, updateClip } = useStudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const project = activeProject;
  const selectedClip = project?.clips.find((clip) => clip.id === selectedId) ?? project?.clips[0] ?? null;
  const videoClip = selectedClip?.kind === 'video' ? selectedClip : null;
  const videoPlayer = useVideoPlayer(videoClip?.uri ?? null, (player) => {
    player.loop = true;
    player.muted = true;
  });
  const audioClip = selectedClip && (selectedClip.kind === 'audio' || selectedClip.kind === 'voice') ? selectedClip : null;
  const audioPlayer = useAudioPlayer(audioClip?.uri ?? null);
  const trackGroups = useMemo(
    () => [
      { kind: 'video', label: 'VIDEO', icon: 'film' as const, clips: project?.clips.filter((clip) => clip.kind === 'video' || clip.kind === 'image') ?? [] },
      { kind: 'audio', label: 'AUDIO', icon: 'music' as const, clips: project?.clips.filter((clip) => clip.kind === 'audio') ?? [] },
      { kind: 'voice', label: 'VOICE', icon: 'mic' as const, clips: project?.clips.filter((clip) => clip.kind === 'voice') ?? [] },
      { kind: 'captions', label: 'CAPTIONS', icon: 'type' as const, clips: [] as StudioClip[] },
    ],
    [project?.clips],
  );

  const ensureProject = () => {
    if (project) return true;
    createProject();
    return false;
  };

  const addVideoOrImage = async () => {
    if (!ensureProject()) {
      Alert.alert('Project created', 'Your edit is ready. Tap Add media again to choose files.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos', 'images'],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 1,
      });
      if (result.canceled) return;
      const items = result.assets.map((asset) => ({
        name: asset.fileName ?? (asset.type === 'video' ? 'Video clip' : 'Image'),
        uri: asset.uri,
        kind: asset.type === 'video' ? 'video' as const : 'image' as const,
        durationSeconds: asset.type === 'video' ? Math.max(1, Math.round((asset.duration ?? 5000) / 1000)) : 5,
      }));
      addMedia(items);
      setSelectedId(null);
    } catch {
      Alert.alert('Could not open your gallery', 'Check the media permission in Android settings and try again.');
    }
  };

  const addAudio = async () => {
    if (!ensureProject()) {
      Alert.alert('Project created', 'Your edit is ready. Tap Add audio again to choose a file.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      addMedia(result.assets.map((asset) => ({
        name: asset.name,
        uri: asset.uri,
        kind: 'audio' as const,
        durationSeconds: 60,
      })));
    } catch {
      Alert.alert('Could not open audio files', 'Choose an audio file from your Android file picker and try again.');
    }
  };

  const adjustTrim = (clip: StudioClip, edge: 'start' | 'end', amount: number) => {
    const length = Math.max(1, clip.durationSeconds);
    if (edge === 'start') {
      updateClip(clip.id, { trimStart: Math.max(0, Math.min(clip.trimStart + amount, clip.trimEnd - 1)) });
    } else {
      updateClip(clip.id, { trimEnd: Math.max(clip.trimStart + 1, Math.min(clip.trimEnd + amount, length)) });
    }
  };

  return (
    <ClipForgeShell title="Editor" subtitle={project?.name ?? 'Create a project to start editing.'} route="editor">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!project ? (
          <View style={[styles.noProject, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="film" size={24} color={colors.primary} />
            <Text style={[styles.noProjectTitle, { color: colors.foreground }]}>Start with a project</Text>
            <Text style={[styles.noProjectText, { color: colors.mutedForeground }]}>Create a local edit, then add videos, photos or sound from your phone.</Text>
            <Pressable onPress={createProject} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Create project</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {videoClip ? (
                <VideoView player={videoPlayer} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
              ) : selectedClip?.kind === 'image' ? (
                <Image source={{ uri: selectedClip.uri }} resizeMode="contain" style={styles.previewImage} />
              ) : (
                <View style={styles.previewEmpty}>
                  <View style={[styles.previewGlyph, { backgroundColor: colors.accent }]}>
                    <Feather name="film" size={25} color={colors.primary} />
                  </View>
                  <Text style={[styles.previewHint, { color: colors.mutedForeground }]}>
                    {project.clips.length ? 'Select a video or photo for preview' : 'Your preview will appear here'}
                  </Text>
                  <Text style={[styles.previewAspect, { color: colors.mutedForeground }]}>9:16 · Vertical</Text>
                </View>
              )}
              {project.captions[0] ? (
                <View pointerEvents="none" style={[styles.captionOverlay, { bottom: `${100 - project.captions[0].y}%`, left: `${project.captions[0].x}%` }]}>
                  <Text style={[styles.captionOverlayText, { color: colors.foreground }]}>{project.captions[0].text}</Text>
                </View>
              ) : null}
              {selectedClip ? (
                <Pressable
                  onPress={() => (audioClip ? audioPlayer.play() : videoClip ? videoPlayer.play() : undefined)}
                  style={[styles.playBadge, { backgroundColor: colors.primary }]}
                  accessibilityLabel="Play selected media"
                >
                  <Feather name="play" size={14} color={colors.primaryForeground} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.transport}>
              <Text style={[styles.timecode, { color: colors.foreground }]}>{time(selectedClip?.trimStart ?? 0)}</Text>
              <View style={[styles.transportLine, { backgroundColor: colors.border }]}><View style={[styles.transportProgress, { backgroundColor: colors.primary }]} /></View>
              <Text style={[styles.timecode, { color: colors.mutedForeground }]}>{time(selectedClip?.trimEnd ?? 0)}</Text>
              <Pressable onPress={() => router.push('/(tabs)/export' as never)} style={[styles.exportButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.exportText, { color: colors.primaryForeground }]}>Export</Text>
                <Feather name="arrow-up-right" size={13} color={colors.primaryForeground} />
              </Pressable>
            </View>

            <View style={styles.toolRow}>
              <Pressable onPress={addVideoOrImage} style={[styles.toolButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="image" size={15} color={colors.primary} /><Text style={[styles.toolLabel, { color: colors.foreground }]}>Add media</Text>
              </Pressable>
              <Pressable onPress={addAudio} style={[styles.toolButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="music" size={15} color={colors.primary} /><Text style={[styles.toolLabel, { color: colors.foreground }]}>Add audio</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/captions' as never)} style={[styles.toolButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="type" size={15} color={colors.primary} /><Text style={[styles.toolLabel, { color: colors.foreground }]}>Captions</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/audio' as never)} style={[styles.audioToolsLink, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="sliders" size={15} color={colors.primary} />
              <Text style={[styles.audioToolsText, { color: colors.foreground }]}>Audio filters & equalizer</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </Pressable>

            <View style={styles.trackHeading}>
              <View>
                <Text style={[styles.trackTitle, { color: colors.foreground }]}>Timeline</Text>
                <Text style={[styles.trackHint, { color: colors.mutedForeground }]}>Tap a clip to select · adjust trim below</Text>
              </View>
              <Text style={[styles.trackDuration, { color: colors.mutedForeground }]}>{project.clips.length} clips</Text>
            </View>
            <View style={[styles.timeline, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {trackGroups.map((group) => (
                <View key={group.kind} style={[styles.trackRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.trackLabel}>
                    <Feather name={group.icon} size={12} color={colors.mutedForeground} />
                    <Text style={[styles.trackLabelText, { color: colors.mutedForeground }]}>{group.label}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clipsRow}>
                    {group.clips.map((clip) => (
                      <Pressable
                        key={clip.id}
                        onPress={() => setSelectedId(clip.id)}
                        style={[
                          styles.clip,
                          { backgroundColor: clip.id === selectedClip?.id ? colors.accent : colors.secondary, borderColor: clip.id === selectedClip?.id ? colors.primary : colors.border },
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.clipName, { color: colors.foreground }]}>{clip.name}</Text>
                        <Text style={[styles.clipMeta, { color: colors.mutedForeground }]}>{time(Math.max(1, clip.trimEnd - clip.trimStart))}</Text>
                      </Pressable>
                    ))}
                    {group.kind === 'captions' && project.captions.map((caption) => (
                      <Pressable key={caption.id} onPress={() => router.push('/(tabs)/captions' as never)} style={[styles.captionClip, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
                        <Feather name="type" size={11} color={colors.primary} />
                        <Text numberOfLines={1} style={[styles.captionClipText, { color: colors.foreground }]}>{caption.text}</Text>
                      </Pressable>
                    ))}
                    {group.clips.length === 0 && (group.kind !== 'captions' || project.captions.length === 0) ? (
                      <Text style={[styles.emptyTrack, { color: colors.mutedForeground }]}>Add a clip</Text>
                    ) : null}
                  </ScrollView>
                </View>
              ))}
            </View>

            {selectedClip ? (
              <View style={[styles.trimCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.trimHeading}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trimTitle, { color: colors.foreground }]} numberOfLines={1}>{selectedClip.name}</Text>
                    <Text style={[styles.trimSubtitle, { color: colors.mutedForeground }]}>Clip trim · source {time(selectedClip.durationSeconds)}</Text>
                  </View>
                  <Pressable onPress={() => Alert.alert('Remove this clip?', 'This removes it from this project only.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { removeClip(selectedClip.id); setSelectedId(null); } }])} hitSlop={8}>
                    <Feather name="trash-2" size={17} color={colors.destructive} />
                  </Pressable>
                </View>
                <View style={styles.trimControls}>
                  {(['start', 'end'] as const).map((edge) => (
                    <View key={edge} style={styles.trimControl}>
                      <Text style={[styles.trimLabel, { color: colors.mutedForeground }]}>{edge === 'start' ? 'IN' : 'OUT'}</Text>
                      <Pressable onPress={() => adjustTrim(selectedClip, edge, -1)} style={[styles.stepButton, { backgroundColor: colors.secondary }]}><Feather name="minus" size={15} color={colors.foreground} /></Pressable>
                      <Text style={[styles.trimValue, { color: colors.foreground }]}>{time(edge === 'start' ? selectedClip.trimStart : selectedClip.trimEnd)}</Text>
                      <Pressable onPress={() => adjustTrim(selectedClip, edge, 1)} style={[styles.stepButton, { backgroundColor: colors.secondary }]}><Feather name="plus" size={15} color={colors.foreground} /></Pressable>
                    </View>
                  ))}
                </View>
                {selectedClip.kind === 'audio' || selectedClip.kind === 'voice' ? (
                  <Pressable onPress={() => audioPlayer.play()} style={[styles.playAudio, { borderColor: colors.border }]}>
                    <Feather name="play" size={14} color={colors.primary} /><Text style={[styles.playAudioText, { color: colors.primary }]}>Preview original audio</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Pressable onPress={addVideoOrImage} style={[styles.addFirst, { borderColor: colors.border }]}>
                <Feather name="plus-circle" size={18} color={colors.primary} />
                <Text style={[styles.addFirstText, { color: colors.foreground }]}>Add your first video or photo</Text>
              </Pressable>
            )}

            <Text style={[styles.localNote, { color: colors.mutedForeground }]}>
              Media permissions are requested only when you choose files. Original camera-roll items are not deleted.
            </Text>
          </>
        )}
      </ScrollView>
    </ClipForgeShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28, gap: 13 },
  noProject: { marginTop: 25, borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center', gap: 10 },
  noProjectTitle: { fontSize: 18, fontWeight: '700' },
  noProjectText: { textAlign: 'center', fontSize: 12, lineHeight: 18, maxWidth: 270 },
  primaryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryButtonText: { fontSize: 13, fontWeight: '800' },
  preview: { width: '100%', aspectRatio: 0.82, maxHeight: 320, borderRadius: 21, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewEmpty: { alignItems: 'center', gap: 7 },
  previewGlyph: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  previewHint: { fontSize: 11 },
  previewAspect: { fontSize: 9 },
  previewImage: { width: '100%', height: '100%' },
  captionOverlay: { position: 'absolute', transform: [{ translateX: -70 }, { translateY: 22 }], maxWidth: 145, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  captionOverlayText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  playBadge: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  transport: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timecode: { fontSize: 9, fontVariant: ['tabular-nums'] },
  transportLine: { height: 3, flex: 1, borderRadius: 3 },
  transportProgress: { width: '36%', height: 3, borderRadius: 3 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, minHeight: 30, borderRadius: 10 },
  exportText: { fontSize: 10, fontWeight: '800' },
  toolRow: { flexDirection: 'row', gap: 7 },
  toolButton: { minHeight: 39, flex: 1, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toolLabel: { fontSize: 10, fontWeight: '700' },
  audioToolsLink: { minHeight: 39, borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioToolsText: { flex: 1, fontSize: 10, fontWeight: '700' },
  trackHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  trackTitle: { fontSize: 15, fontWeight: '700' },
  trackHint: { fontSize: 9, marginTop: 3 },
  trackDuration: { fontSize: 10 },
  timeline: { borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  trackRow: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  trackLabel: { width: 75, paddingLeft: 10, gap: 5, flexDirection: 'row', alignItems: 'center' },
  trackLabelText: { fontSize: 8, letterSpacing: 0.5, fontWeight: '800' },
  clipsRow: { gap: 6, paddingHorizontal: 7, alignItems: 'center', minHeight: 44 },
  clip: { width: 94, minHeight: 34, borderRadius: 9, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4, justifyContent: 'center' },
  clipName: { fontSize: 9, fontWeight: '700' },
  clipMeta: { fontSize: 8, marginTop: 2 },
  captionClip: { maxWidth: 120, minHeight: 29, borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  captionClipText: { fontSize: 8, maxWidth: 90 },
  emptyTrack: { fontSize: 9 },
  trimCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 11 },
  trimHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trimTitle: { fontSize: 11, fontWeight: '700' },
  trimSubtitle: { fontSize: 9, marginTop: 3 },
  trimControls: { flexDirection: 'row', gap: 12 },
  trimControl: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  trimLabel: { fontSize: 8, fontWeight: '800' },
  stepButton: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  trimValue: { fontSize: 10, fontVariant: ['tabular-nums'], fontWeight: '700' },
  playAudio: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  playAudioText: { fontSize: 10, fontWeight: '700' },
  addFirst: { minHeight: 51, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  addFirstText: { fontSize: 11, fontWeight: '600' },
  localNote: { fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: 15 },
});
