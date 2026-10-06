import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type MediaKind = 'video' | 'image' | 'audio' | 'voice';

export type StudioClip = {
  id: string;
  name: string;
  uri: string;
  kind: MediaKind;
  durationSeconds: number;
  trimStart: number;
  trimEnd: number;
};

export type StudioCaption = {
  id: string;
  text: string;
  styleId: number;
  x: number;
  y: number;
  start: number;
  end: number;
};

export type StudioProject = {
  id: string;
  name: string;
  updatedAt: number;
  clips: StudioClip[];
  captions: StudioCaption[];
  audioFilter: number;
  equalizer: number[];
};

type StudioContextValue = {
  projects: StudioProject[];
  activeProjectId: string | null;
  activeProject: StudioProject | null;
  hydrated: boolean;
  createProject: () => string;
  openProject: (id: string) => void;
  renameProject: (name: string) => void;
  addMedia: (clips: Omit<StudioClip, 'id' | 'trimStart' | 'trimEnd'>[]) => void;
  updateClip: (id: string, patch: Partial<StudioClip>) => void;
  removeClip: (id: string) => void;
  addCaption: (caption: Omit<StudioCaption, 'id'>) => void;
  updateCaption: (id: string, patch: Partial<StudioCaption>) => void;
  removeCaption: (id: string) => void;
  setAudioFilter: (index: number) => void;
  setEqualizerBand: (index: number, value: number) => void;
  deleteProject: (id: string) => void;
};

const STORAGE_KEY = 'clipforge.projects.v1';
const StudioContext = createContext<StudioContextValue | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function updateById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!mounted || !saved) return;
        const data = JSON.parse(saved) as { projects?: StudioProject[]; activeProjectId?: string | null };
        setProjects(Array.isArray(data.projects) ? data.projects.map((project) => ({
          ...project,
          audioFilter: project.audioFilter ?? 0,
          equalizer: Array.isArray(project.equalizer) && project.equalizer.length === 10
            ? project.equalizer
            : Array(10).fill(0),
        })) : []);
        setActiveProjectId(data.activeProjectId ?? null);
      })
      .catch(() => {
        if (mounted) setProjects([]);
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, activeProjectId })).catch(() => {});
  }, [projects, activeProjectId, hydrated]);

  const updateProject = useCallback((id: string, transform: (project: StudioProject) => StudioProject) => {
    setProjects((current) =>
      current.map((project) => (project.id === id ? { ...transform(project), updatedAt: Date.now() } : project)),
    );
  }, []);

  const createProject = useCallback(() => {
    const id = newId();
    const project: StudioProject = {
      id,
      name: 'Untitled edit',
      updatedAt: Date.now(),
      clips: [],
      captions: [],
      audioFilter: 0,
      equalizer: Array(10).fill(0),
    };
    setProjects((current) => [project, ...current]);
    setActiveProjectId(id);
    return id;
  }, []);

  const openProject = useCallback((id: string) => setActiveProjectId(id), []);
  const renameProject = useCallback((name: string) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({ ...project, name }));
  }, [activeProjectId, updateProject]);

  const addMedia = useCallback((incoming: Omit<StudioClip, 'id' | 'trimStart' | 'trimEnd'>[]) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({
      ...project,
      clips: [
        ...project.clips,
        ...incoming.map((clip) => ({
          ...clip,
          id: newId(),
          trimStart: 0,
          trimEnd: Math.max(1, clip.durationSeconds),
        })),
      ],
    }));
  }, [activeProjectId, updateProject]);

  const updateClip = useCallback((id: string, patch: Partial<StudioClip>) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({ ...project, clips: updateById(project.clips, id, patch) }));
  }, [activeProjectId, updateProject]);

  const removeClip = useCallback((id: string) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({
      ...project,
      clips: project.clips.filter((clip) => clip.id !== id),
    }));
  }, [activeProjectId, updateProject]);

  const addCaption = useCallback((caption: Omit<StudioCaption, 'id'>) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({
      ...project,
      captions: [...project.captions, { ...caption, id: newId() }],
    }));
  }, [activeProjectId, updateProject]);

  const updateCaption = useCallback((id: string, patch: Partial<StudioCaption>) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({
      ...project,
      captions: updateById(project.captions, id, patch),
    }));
  }, [activeProjectId, updateProject]);

  const removeCaption = useCallback((id: string) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({
      ...project,
      captions: project.captions.filter((caption) => caption.id !== id),
    }));
  }, [activeProjectId, updateProject]);

  const setAudioFilter = useCallback((index: number) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({ ...project, audioFilter: index }));
  }, [activeProjectId, updateProject]);

  const setEqualizerBand = useCallback((index: number, value: number) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, (project) => ({
      ...project,
      equalizer: project.equalizer.map((band, bandIndex) => (bandIndex === index ? Math.max(-6, Math.min(6, value)) : band)),
    }));
  }, [activeProjectId, updateProject]);

  const deleteProject = useCallback((id: string) => {
    setProjects((current) => current.filter((project) => project.id !== id));
    setActiveProjectId((current) => (current === id ? null : current));
  }, []);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const value = useMemo(
    () => ({
      projects,
      activeProjectId,
      activeProject,
      hydrated,
      createProject,
      openProject,
      renameProject,
      addMedia,
      updateClip,
      removeClip,
      addCaption,
      updateCaption,
      removeCaption,
      setAudioFilter,
      setEqualizerBand,
      deleteProject,
    }),
    [
      projects,
      activeProjectId,
      activeProject,
      hydrated,
      createProject,
      openProject,
      renameProject,
      addMedia,
      updateClip,
      removeClip,
      addCaption,
      updateCaption,
      removeCaption,
      setAudioFilter,
      setEqualizerBand,
      deleteProject,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio must be used inside StudioProvider');
  return value;
}
