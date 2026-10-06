import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type RouteName = 'home' | 'editor' | 'captions' | 'audio' | 'voice' | 'settings' | 'export';
const destinations: { title: string; subtitle: string; icon: keyof typeof Feather.glyphMap; route: RouteName }[] = [
  { title: 'My projects', subtitle: 'Your edits, saved on this phone', icon: 'layers', route: 'home' },
  { title: 'Editor', subtitle: 'Media tracks and trimming', icon: 'film', route: 'editor' },
  { title: 'Captions', subtitle: 'Subtitle styles and placement', icon: 'type', route: 'captions' },
  { title: 'Audio effects', subtitle: 'Filter presets and equalizer', icon: 'sliders', route: 'audio' },
  { title: 'Voice studio', subtitle: 'Drafts and text to speech', icon: 'mic', route: 'voice' },
  { title: 'Settings & privacy', subtitle: 'Keys, permissions and policies', icon: 'shield', route: 'settings' },
  { title: 'Export', subtitle: 'Review output options', icon: 'share-2', route: 'export' },
];

export function ClipForgeShell({
  title,
  subtitle,
  route,
  children,
}: {
  title: string;
  subtitle?: string;
  route: RouteName;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 34 : 0;

  const navigate = (destination: RouteName) => {
    setMenuOpen(false);
    const paths: Record<RouteName, string> = {
      home: '/(tabs)',
      editor: '/(tabs)/editor',
      captions: '/(tabs)/captions',
      audio: '/(tabs)/audio',
      voice: '/(tabs)/voice',
      settings: '/(tabs)/settings',
      export: '/(tabs)/export',
    };
    router.push(paths[destination] as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'web' ? 67 : 4 }]}>
          <Pressable
            accessibilityLabel="Open navigation"
            onPress={() => setMenuOpen(true)}
            style={[styles.menuButton, { backgroundColor: colors.card }]}
            testID="open-navigation"
          >
            <Feather name="menu" size={21} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.brand, { color: colors.primary }]}>HUGGINGVOICE</Text>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
          </View>
          <Pressable
            accessibilityLabel="Open export"
            onPress={() => navigate('export')}
            style={[styles.exportIcon, { borderColor: colors.border }]}
          >
            <Feather name="upload" size={17} color={colors.primary} />
          </Pressable>
        </View>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
        <View style={{ height: webBottom }} />
      </SafeAreaView>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modal}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={[styles.drawer, { backgroundColor: colors.card, borderColor: colors.border, paddingTop: Math.max(insets.top, webTop) + 8 }]}>
            <View style={styles.drawerTop}>
              <View>
                <Text style={[styles.brand, { color: colors.primary }]}>HUGGINGVOICE</Text>
                <Text style={[styles.drawerHeading, { color: colors.foreground }]}>Your creative studio</Text>
              </View>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={12} accessibilityLabel="Close navigation">
                <Feather name="x" size={21} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.drawerLinks}>
              {destinations.map((item) => (
                <Pressable
                  key={item.route}
                  onPress={() => navigate(item.route)}
                  style={[
                    styles.drawerLink,
                    { backgroundColor: item.route === route ? colors.accent : 'transparent' },
                  ]}
                  testID={`navigate-${item.route}`}
                >
                  <Feather name={item.icon} size={18} color={item.route === route ? colors.primary : colors.mutedForeground} />
                  <View style={styles.drawerLinkCopy}>
                    <Text style={[styles.drawerLinkTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.drawerLinkSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </ScrollView>
            <View style={[styles.localBadge, { borderColor: colors.border }]}>
              <Feather name="smartphone" size={15} color={colors.primary} />
              <Text style={[styles.localBadgeText, { color: colors.mutedForeground }]}>Projects stay on this device</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  brand: { fontSize: 9, fontWeight: '800', letterSpacing: 2.1 },
  headerTitle: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  exportIcon: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { paddingHorizontal: 20, paddingTop: 12, fontSize: 12 },
  body: { flex: 1 },
  modal: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.58)' },
  drawer: { width: 310, maxWidth: '84%', flex: 1, borderRightWidth: 1, paddingHorizontal: 18, paddingBottom: 20 },
  drawerTop: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  drawerHeading: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  drawerLinks: { gap: 5, paddingBottom: 16 },
  drawerLink: { minHeight: 66, paddingHorizontal: 11, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  drawerLinkCopy: { flex: 1 },
  drawerLinkTitle: { fontSize: 14, fontWeight: '600' },
  drawerLinkSub: { fontSize: 10, marginTop: 3 },
  localBadge: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, paddingTop: 14 },
  localBadgeText: { fontSize: 11 },
});
