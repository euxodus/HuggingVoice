import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClipForgeShell } from '@/components/ClipForgeShell';
import { useColors } from '@/hooks/useColors';
import { StudioProject, useStudio } from '@/state/StudioContext';

function ProjectCard({ project, onOpen, onDelete }: { project: StudioProject; onOpen: () => void; onDelete: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onOpen} style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.projectThumb, { backgroundColor: colors.accent }]}>
        <Feather name={project.clips.some((clip) => clip.kind === 'video') ? 'film' : 'layers'} size={20} color={colors.primary} />
      </View>
      <View style={styles.projectCopy}>
        <Text numberOfLines={1} style={[styles.projectTitle, { color: colors.foreground }]}>{project.name}</Text>
        <Text style={[styles.projectMeta, { color: colors.mutedForeground }]}>
          {project.clips.length} {project.clips.length === 1 ? 'track item' : 'track items'} · {project.captions.length} captions
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`Delete ${project.name}`}
        onPress={(event) => {
          event.stopPropagation();
          Alert.alert('Delete this edit?', 'This removes the project data saved by HuggingVoice. Your original media files are not deleted.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]);
        }}
        hitSlop={10}
        style={styles.projectMore}
      >
        <Feather name="more-horizontal" size={19} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

export default function ProjectsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { projects, createProject, openProject, deleteProject } = useStudio();

  const startEditing = (projectId?: string) => {
    if (projectId) openProject(projectId);
    else createProject();
    router.push('/(tabs)/editor' as never);
  };

  return (
    <ClipForgeShell title="My projects" subtitle="Your edits stay on this phone." route="home">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>CREATE ON YOUR TERMS</Text>
            <Text style={[styles.heading, { color: colors.foreground }]}>Make your next cut.</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              Shape video, sound and subtitles in one local-first studio.
            </Text>
          </View>
          <View style={[styles.heroMark, { backgroundColor: colors.accent }]}>
            <Feather name="scissors" size={26} color={colors.primary} />
          </View>
        </View>

        <Pressable onPress={() => startEditing()} style={[styles.createButton, { backgroundColor: colors.primary }]} testID="new-project">
          <Feather name="plus" size={19} color={colors.primaryForeground} />
          <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>Start a new edit</Text>
          <Feather name="arrow-up-right" size={17} color={colors.primaryForeground} />
        </Pressable>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent edits</Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Saved locally on this device</Text>
          </View>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>{projects.length.toString().padStart(2, '0')}</Text>
        </View>

        {projects.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="film" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your timeline starts here</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create an edit, add media from your phone, then build the story one track at a time.
            </Text>
            <Pressable onPress={() => startEditing()} style={[styles.textButton, { borderColor: colors.border }]}>
              <Text style={[styles.textButtonText, { color: colors.primary }]}>Open the editor</Text>
              <Feather name="arrow-right" size={15} color={colors.primary} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.projectList}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={() => startEditing(project.id)} onDelete={() => deleteProject(project.id)} />
            ))}
          </View>
        )}

        <View style={[styles.privacyStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="lock" size={15} color={colors.primary} />
          <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
            No HuggingVoice account. No project upload. API keys are held in device secure storage.
          </Text>
        </View>
      </ScrollView>
    </ClipForgeShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, gap: 19 },
  hero: { minHeight: 122, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroCopy: { flex: 1 },
  kicker: { fontSize: 9, letterSpacing: 1.7, fontWeight: '800' },
  heading: { fontSize: 27, fontWeight: '700', letterSpacing: -0.7, marginTop: 7 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 270 },
  heroMark: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] },
  createButton: { minHeight: 54, borderRadius: 17, paddingHorizontal: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
  createButtonText: { fontSize: 14, fontWeight: '800', flex: 1 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionHint: { fontSize: 11, marginTop: 3 },
  count: { fontSize: 12, fontVariant: ['tabular-nums'] },
  emptyState: { alignItems: 'center', borderRadius: 22, borderWidth: 1, padding: 24 },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 13 },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 260, marginTop: 6 },
  textButton: { minHeight: 40, paddingHorizontal: 13, marginTop: 16, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  textButtonText: { fontSize: 12, fontWeight: '700' },
  projectList: { gap: 9 },
  projectCard: { minHeight: 72, borderRadius: 17, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  projectThumb: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  projectCopy: { flex: 1 },
  projectTitle: { fontSize: 13, fontWeight: '700' },
  projectMeta: { fontSize: 10, marginTop: 5 },
  projectMore: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  privacyStrip: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 12 },
  privacyText: { flex: 1, fontSize: 10, lineHeight: 15 },
});
