'use client';

import { useEffect, useRef, useState } from 'react';
import type { MindMapData, MindMapNode } from '@/lib/types';
import { registerCanvasHandler, type CanvasResult } from '@/lib/canvas-bus';
import { templates as TEMPLATES } from '@/lib/templates';

export type MindMapCanvasProps = {
  mindmapId: string;
  initialData: MindMapData;
  initialTitle: string;
  readonly?: boolean;
  onTitleChange?: (title: string) => void;
  onDataChange?: (data: MindMapData) => void;
};

type Theme = 'aurora' | 'sunrise' | 'forest' | 'mono';

type InternalState = {
  nodes: Record<string, MindMapNode>;
  childIndex: Record<string, string[]>;
  rootId: string | null;
  selectedId: string | null;
  hoveredId: string | null;
  editingId: string | null;
  detailId: string | null;
  pan: { x: number; y: number };
  zoom: number;
  theme: Theme;
};

const COLOR_COUNT = 5;

function cloneData(d: MindMapData): MindMapData {
  return {
    nodes: JSON.parse(JSON.stringify(d.nodes || {})),
    childIndex: JSON.parse(JSON.stringify(d.childIndex || {})),
    rootId: d.rootId,
  };
}

function nextIdFromNodes(nodes: Record<string, MindMapNode>): number {
  let max = 0;
  for (const id of Object.keys(nodes)) {
    const m = id.match(/^n(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

export default function MindMapCanvas({
  mindmapId,
  initialData,
  initialTitle,
  readonly = false,
  onTitleChange,
  onDataChange,
}: MindMapCanvasProps) {
  // ---- refs to DOM nodes inside our root ----
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const edgesSvgRef = useRef<SVGSVGElement | null>(null);
  const edgesGRef = useRef<SVGGElement | null>(null);
  const nodesLayerRef = useRef<HTMLDivElement | null>(null);
  const zoomLabelRef = useRef<HTMLSpanElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- React state for things that drive React-rendered UI ----
  const [inDetailMode, setInDetailMode] = useState(false);
  const [infoVisible, setInfoVisible] = useState(true);

  // ---- State the imperative engine owns (kept in a ref so renders don't reset it) ----
  const stateRef = useRef<InternalState>({
    nodes: {},
    childIndex: {},
    rootId: null,
    selectedId: null,
    hoveredId: null,
    editingId: null,
    detailId: null,
    pan: { x: 0, y: 0 },
    zoom: 1,
    theme: 'aurora',
  });
  const nextIdRef = useRef<number>(1);
  const titleRef = useRef<string>(initialTitle);
  const readonlyRef = useRef<boolean>(readonly);
  const onDataChangeRef = useRef<typeof onDataChange>(onDataChange);
  const onTitleChangeRef = useRef<typeof onTitleChange>(onTitleChange);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const initialDataRef = useRef<MindMapData>(initialData);
  // Imperative re-render hook the main effect populates so other effects (e.g. title sync) can refresh.
  const renderAllRef = useRef<(() => void) | null>(null);

  // Keep latest callbacks/props readable from event handlers without re-running effect
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);
  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
  }, [onTitleChange]);
  useEffect(() => {
    readonlyRef.current = readonly;
  }, [readonly]);
  // The brain's label is the page title; sync them so changes from the editor
  // toolbar propagate to the brain-label DOM under the SVG.
  useEffect(() => {
    titleRef.current = initialTitle;
    const state = stateRef.current;
    const root = state.rootId ? state.nodes[state.rootId] : null;
    const next = initialTitle || 'My Brain';
    if (root && root.label !== next) {
      root.label = next;
      renderAllRef.current?.();
    }
  }, [initialTitle]);

  // ============================================================
  // Main effect — sets up the entire imperative engine once.
  // ============================================================
  useEffect(() => {
    cancelledRef.current = false;
    const stage = stageRef.current!;
    const world = worldRef.current!;
    const grid = gridRef.current!;
    const edgesSvg = edgesSvgRef.current!;
    const edgesG = edgesGRef.current!;
    const nodesLayer = nodesLayerRef.current!;
    const zoomLabel = zoomLabelRef.current!;
    const minimapCanvas = minimapCanvasRef.current!;
    const particlesCanvas = particlesCanvasRef.current!;
    const root = rootRef.current!;

    const state = stateRef.current;
    // Hydrate from initialData (only the persistent bits)
    const seed = cloneData(initialDataRef.current);
    state.nodes = seed.nodes || {};
    state.childIndex = seed.childIndex || {};
    state.rootId = seed.rootId ?? null;
    state.selectedId = state.rootId;
    state.hoveredId = null;
    state.editingId = null;
    state.detailId = null;
    state.pan = { x: 0, y: 0 };
    state.zoom = 1;
    nextIdRef.current = nextIdFromNodes(state.nodes);

    const newId = () => 'n' + nextIdRef.current++;
    const clamp = (v: number, a: number, b: number) =>
      Math.max(a, Math.min(b, v));

    // ---- Sound effects ----
    // Pre-baked ElevenLabs sound-generation clips: pop on node creation, stretch on drag.
    const popAudio = typeof Audio !== 'undefined' ? new Audio('/sfx/pop.mp3') : null;
    const stretchAudio = typeof Audio !== 'undefined' ? new Audio('/sfx/stretch.mp3') : null;
    const ttsAudio = typeof Audio !== 'undefined' ? new Audio() : null;
    // Static SFX files are normalized to -9 LUFS via ffmpeg loudnorm so
    // volume=1 gives a consistent perceived loudness across pop/stretch/
    // ooh/aww.
    if (popAudio) popAudio.volume = 1.0;
    if (stretchAudio) stretchAudio.volume = 1.0;
    // TTS audio comes from ElevenLabs unprocessed (no loudnorm) so it's
    // ~10dB quieter than the SFX bank. We route it through a Web Audio
    // gain node to boost past the HTMLAudioElement 1.0 ceiling.
    const TTS_GAIN = 2.8;
    type AudioCtxCtor = typeof AudioContext;
    type WebkitWindow = typeof window & { webkitAudioContext?: AudioCtxCtor };
    let ttsCtx: AudioContext | null = null;
    let ttsGainConnected = false;
    function ensureTtsBoost() {
      if (!ttsAudio || ttsGainConnected) return;
      try {
        const Ctor: AudioCtxCtor | undefined =
          typeof window !== 'undefined'
            ? window.AudioContext || (window as WebkitWindow).webkitAudioContext
            : undefined;
        if (!Ctor) return;
        ttsCtx = new Ctor();
        const source = ttsCtx.createMediaElementSource(ttsAudio);
        const gain = ttsCtx.createGain();
        gain.gain.value = TTS_GAIN;
        source.connect(gain);
        gain.connect(ttsCtx.destination);
        ttsGainConnected = true;
      } catch {
        // createMediaElementSource fails if called twice, AudioContext may
        // be unsupported. Either way, fall back to native volume = 1.
        ttsGainConnected = true;
      }
    }
    if (ttsAudio) ttsAudio.volume = 1.0;

    let muted =
      typeof window !== 'undefined' && window.localStorage?.getItem('squishy-muted') === '1';
    function setMuted(next: boolean) {
      muted = next;
      try {
        window.localStorage.setItem('squishy-muted', next ? '1' : '0');
      } catch {
        /* localStorage may be disabled */
      }
      const btn = root.querySelector('#smm-mute-btn') as HTMLButtonElement | null;
      if (btn) btn.textContent = next ? '🔇' : '🔊';
      if (next) {
        ttsAudio?.pause();
        if (ttsAudio) ttsAudio.currentTime = 0;
      }
    }

    function playSfx(kind: 'pop' | 'stretch') {
      if (muted) return;
      const a = kind === 'pop' ? popAudio : stretchAudio;
      if (!a) return;
      try {
        a.currentTime = 0;
        // Browsers reject autoplay before any user gesture; call sites are all
        // user-initiated (mousedown/mouseup/click/keydown) so this should always fire.
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* degrade silently — codec or transient browser error */
      }
    }

    // ---- Voice (ElevenLabs TTS on label commit) ----
    let ttsTimer: ReturnType<typeof setTimeout> | null = null;
    let ttsRequestSeq = 0;
    let ttsObjectUrl: string | null = null;
    // Per-mount cache: label text → object URL of synthesized audio. Saves an
    // ElevenLabs roundtrip when a node is renamed back to a value seen earlier
    // in this session. Bounded so a renaming spree can't grow it forever.
    const TTS_CACHE_LIMIT = 50;
    const ttsCache = new Map<string, string>();
    function rememberTtsBlob(text: string, blob: Blob): string {
      const url = URL.createObjectURL(blob);
      ttsCache.set(text, url);
      while (ttsCache.size > TTS_CACHE_LIMIT) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey === undefined) break;
        const oldestUrl = ttsCache.get(oldestKey);
        if (oldestUrl) URL.revokeObjectURL(oldestUrl);
        ttsCache.delete(oldestKey);
      }
      return url;
    }
    function speakLabel(text: string) {
      if (muted) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      if (ttsTimer) clearTimeout(ttsTimer);
      const debounceMs = 250;
      ttsTimer = setTimeout(async () => {
        const reqId = ++ttsRequestSeq;
        if (!ttsAudio) return;
        ensureTtsBoost();
        if (ttsCtx?.state === 'suspended') {
          try { await ttsCtx.resume(); } catch { /* ignore */ }
        }

        // Cache hit — skip the network roundtrip entirely.
        const cached = ttsCache.get(trimmed);
        if (cached) {
          ttsAudio.src = cached;
          try { await ttsAudio.play(); } catch { /* autoplay reject */ }
          return;
        }

        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed }),
          });
          // A newer commit superseded us — drop this audio.
          if (reqId !== ttsRequestSeq) return;
          if (!res.ok) return;
          const blob = await res.blob();
          if (reqId !== ttsRequestSeq) return;
          if (muted) return;
          const url = rememberTtsBlob(trimmed, blob);
          ttsObjectUrl = url;
          ttsAudio.src = url;
          try {
            await ttsAudio.play();
          } catch {
            /* autoplay rejected — first commit may need an existing user gesture */
          }
        } catch {
          /* network or auth failure — degrade silently */
        }
      }, debounceMs);
    }

    // Pre-baked ElevenLabs phrases (no auth required, no API calls per event).
    const oohAudio = typeof Audio !== 'undefined' ? new Audio('/sfx/ooooh.mp3') : null;
    const awwAudio = typeof Audio !== 'undefined' ? new Audio('/sfx/aww.mp3') : null;
    if (oohAudio) oohAudio.volume = 1.0;
    if (awwAudio) awwAudio.volume = 1.0;
    function playPhrase(kind: 'ooh' | 'aww') {
      if (muted) return;
      const a = kind === 'ooh' ? oohAudio : awwAudio;
      if (!a) return;
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* degrade silently */
      }
    }

    function pickChildColor(parent: MindMapNode | null): number {
      if (!parent || parent.colorIdx == null)
        return Math.floor(Math.random() * COLOR_COUNT);
      const offset = 1 + Math.floor(Math.random() * (COLOR_COUNT - 1));
      return (parent.colorIdx + offset) % COLOR_COUNT;
    }

    function applyNodeColor(el: HTMLElement, colorIdx: number | null | undefined) {
      if (colorIdx == null) return;
      const a = (colorIdx % COLOR_COUNT) + 1;
      const b = ((colorIdx + 2) % COLOR_COUNT) + 1;
      el.style.setProperty('--accent-c1', `var(--accent-${a})`);
      el.style.setProperty('--accent-c2', `var(--accent-${b})`);
    }

    // ---- Persistence (debounced 800ms) ----
    function scheduleSave() {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const data: MindMapData = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          childIndex: JSON.parse(JSON.stringify(state.childIndex)),
          rootId: state.rootId,
        };
        onDataChangeRef.current?.(data);
      }, 800);
    }

    // ---- Node ops ----
    function addNode(
      parentId: string | null,
      label: string,
      x: number,
      y: number,
      opts: { colorIdx?: number } = {},
    ): MindMapNode {
      const id = newId();
      const parent = parentId != null ? state.nodes[parentId] : null;
      const depth = parent ? parent.depth + 1 : 0;
      const colorIdx =
        opts.colorIdx != null
          ? opts.colorIdx
          : parent
            ? pickChildColor(parent)
            : Math.floor(Math.random() * COLOR_COUNT);
      const node: MindMapNode = {
        id,
        label,
        x,
        y,
        parentId,
        depth,
        colorIdx,
        note: '',
        createdAt: Date.now(),
      };
      state.nodes[id] = node;
      if (parentId == null) state.rootId = id;
      else (state.childIndex[parentId] = state.childIndex[parentId] || []).push(id);
      return node;
    }

    function placeChild(
      parent: MindMapNode,
      indexAmongSiblings: number,
    ): { x: number; y: number } {
      const distance = parent.depth === 0 ? 220 : 180;
      let baseAngle: number;
      let arcSpread: number;
      const total = (state.childIndex[parent.id] || []).length + 1;

      if (parent.parentId == null) {
        baseAngle = 0;
        arcSpread = Math.PI * 2;
        const angle = (indexAmongSiblings / Math.max(total, 6)) * arcSpread;
        return {
          x: parent.x + Math.cos(angle) * distance,
          y: parent.y + Math.sin(angle) * distance,
        };
      }

      const gp = state.nodes[parent.parentId];
      baseAngle = Math.atan2(parent.y - gp.y, parent.x - gp.x);
      arcSpread = Math.PI * 0.85;
      if (total <= 1) {
        return {
          x: parent.x + Math.cos(baseAngle) * distance,
          y: parent.y + Math.sin(baseAngle) * distance,
        };
      }
      const angle =
        baseAngle - arcSpread / 2 + (indexAmongSiblings / (total - 1)) * arcSpread;
      return {
        x: parent.x + Math.cos(angle) * distance,
        y: parent.y + Math.sin(angle) * distance,
      };
    }

    function addChild(parentId: string, label = 'New idea'): MindMapNode | null {
      const parent = state.nodes[parentId];
      if (!parent) return null;
      const siblings = state.childIndex[parentId] || [];
      const { x, y } = placeChild(parent, siblings.length);
      return addNode(parentId, label, x, y);
    }

    // Re-spread every child of `parentId` evenly across the parent's arc.
    // Existing placeChild uses each sibling's stale total at insertion time,
    // so children added one-by-one (via voice) end up stacked at the +arc edge.
    // Call this after batch / repeat-voice creates to redistribute.
    //
    // Each sibling is then pushed outward along its angle (in steps) until it
    // clears any other node in the map, so a new branch doesn't slam into an
    // existing distant cousin.
    const MIN_NODE_SEPARATION = 140; // px between centers
    const PUSH_STEP = 30;
    const MAX_PUSH_STEPS = 12;

    function nodeOverlaps(x: number, y: number, ignoreId: string): boolean {
      for (const id in state.nodes) {
        if (id === ignoreId) continue;
        const other = state.nodes[id];
        if (!other) continue;
        const d = Math.hypot(x - other.x, y - other.y);
        if (d < MIN_NODE_SEPARATION) return true;
      }
      return false;
    }

    function placeChildAtAngle(
      parent: MindMapNode,
      childId: string,
      angle: number,
      startDistance: number,
    ) {
      const child = state.nodes[childId];
      if (!child) return;
      let distance = startDistance;
      let x = parent.x + Math.cos(angle) * distance;
      let y = parent.y + Math.sin(angle) * distance;
      let steps = 0;
      while (nodeOverlaps(x, y, childId) && steps < MAX_PUSH_STEPS) {
        distance += PUSH_STEP;
        x = parent.x + Math.cos(angle) * distance;
        y = parent.y + Math.sin(angle) * distance;
        steps++;
      }
      child.x = x;
      child.y = y;
    }

    function layoutChildren(parentId: string) {
      const parent = state.nodes[parentId];
      if (!parent) return;
      const siblingIds = state.childIndex[parentId] || [];
      const total = siblingIds.length;
      if (total === 0) return;
      const baseDistance = parent.depth === 0 ? 220 : 180;

      if (parent.parentId == null) {
        // Root — full-circle distribution. Reserve 6 slots so a brain with
        // 1–5 children doesn't crowd onto a single hemisphere.
        const slots = Math.max(total, 6);
        for (let i = 0; i < total; i++) {
          const id = siblingIds[i];
          const angle = (i / slots) * Math.PI * 2;
          placeChildAtAngle(parent, id, angle, baseDistance);
        }
        return;
      }

      const gp = state.nodes[parent.parentId];
      if (!gp) return;
      const baseAngle = Math.atan2(parent.y - gp.y, parent.x - gp.x);
      const arcSpread = Math.PI * 0.85;

      if (total === 1) {
        placeChildAtAngle(parent, siblingIds[0], baseAngle, baseDistance);
        return;
      }

      for (let i = 0; i < total; i++) {
        const angle = baseAngle - arcSpread / 2 + (i / (total - 1)) * arcSpread;
        placeChildAtAngle(parent, siblingIds[i], angle, baseDistance);
      }
    }

    function addSibling(nodeId: string, label = 'New sibling'): MindMapNode | null {
      const n = state.nodes[nodeId];
      if (!n || n.parentId == null) return null;
      return addChild(n.parentId, label);
    }

    function removeNode(id: string) {
      if (id === state.rootId) return;
      const n = state.nodes[id];
      if (!n) return;
      const kids = (state.childIndex[id] || []).slice();
      kids.forEach(removeNode);
      const sibs = n.parentId != null ? state.childIndex[n.parentId] : null;
      if (sibs && n.parentId != null)
        state.childIndex[n.parentId] = sibs.filter((x) => x !== id);
      delete state.nodes[id];
      delete state.childIndex[id];
      if (state.selectedId === id) state.selectedId = n.parentId;
    }

    function getDescendants(id: string): string[] {
      const out: string[] = [];
      const queue = (state.childIndex[id] || []).slice();
      while (queue.length) {
        const cur = queue.shift()!;
        out.push(cur);
        const kids = state.childIndex[cur] || [];
        for (const k of kids) queue.push(k);
      }
      return out;
    }

    // ---- Subtree snapshot / restore (used for undoing deletes) ----
    type SubtreeSnapshot = {
      rootId: string;
      rootLabel: string;
      descendantCount: number;
      // Deep clone of every node in the subtree
      nodes: MindMapNode[];
      // Order of children under each parent so restore is stable
      childOrder: Record<string, string[]>;
      // Index of the deleted root within its old parent's child list (so
      // restoring keeps siblings in the same relative position)
      formerSlot: { parentId: string | null; index: number };
      // Selection at the time of deletion (undo restores it)
      formerSelected: string | null;
    };

    function deepCloneNode(n: MindMapNode): MindMapNode {
      return { ...n };
    }

    function snapshotSubtree(rootId: string): SubtreeSnapshot {
      const root = state.nodes[rootId];
      const ids = [rootId, ...getDescendants(rootId)];
      const nodes = ids.map((id) => deepCloneNode(state.nodes[id]));
      const childOrder: Record<string, string[]> = {};
      for (const id of ids) {
        childOrder[id] = (state.childIndex[id] || []).slice();
      }
      const parentId = root?.parentId ?? null;
      const siblings = parentId ? state.childIndex[parentId] || [] : [];
      const idx = siblings.indexOf(rootId);
      return {
        rootId,
        rootLabel: root?.label ?? '',
        descendantCount: ids.length - 1,
        nodes,
        childOrder,
        formerSlot: { parentId, index: idx >= 0 ? idx : siblings.length },
        formerSelected: state.selectedId,
      };
    }

    function restoreSubtree(snap: SubtreeSnapshot) {
      for (const node of snap.nodes) {
        state.nodes[node.id] = deepCloneNode(node);
      }
      for (const id in snap.childOrder) {
        state.childIndex[id] = snap.childOrder[id].slice();
      }
      const { parentId, index } = snap.formerSlot;
      if (parentId) {
        const siblings = state.childIndex[parentId] || [];
        if (!siblings.includes(snap.rootId)) {
          const insertAt = Math.min(index, siblings.length);
          siblings.splice(insertAt, 0, snap.rootId);
          state.childIndex[parentId] = siblings;
        }
      }
      if (snap.formerSelected && state.nodes[snap.formerSelected]) {
        state.selectedId = snap.formerSelected;
      }
    }

    // ---- Re-parenting (used by Squishy's move_node tool) ----
    function reparent(
      nodeId: string,
      newParentId: string,
    ): { success: true } | { success: false; error: string } {
      const node = state.nodes[nodeId];
      const newParent = state.nodes[newParentId];
      if (!node) return { success: false, error: 'Node not found' };
      if (!newParent) return { success: false, error: 'New parent not found' };
      if (nodeId === state.rootId) return { success: false, error: 'Cannot move the root brain' };
      if (nodeId === newParentId) return { success: false, error: 'Cannot parent a node to itself' };
      if (newParentId === node.parentId) return { success: false, error: 'Already there' };

      const descendants = getDescendants(nodeId);
      if (descendants.includes(newParentId)) {
        return { success: false, error: 'Cannot move a node into its own subtree' };
      }

      const oldParentId = node.parentId;
      if (oldParentId) {
        const siblings = (state.childIndex[oldParentId] || []).filter((id) => id !== nodeId);
        state.childIndex[oldParentId] = siblings;
      }
      const newSiblings = state.childIndex[newParentId] || [];
      newSiblings.push(nodeId);
      state.childIndex[newParentId] = newSiblings;
      node.parentId = newParentId;

      function recomputeDepth(id: string, depth: number) {
        const n = state.nodes[id];
        if (!n) return;
        n.depth = depth;
        const kids = state.childIndex[id] || [];
        for (const k of kids) recomputeDepth(k, depth + 1);
      }
      recomputeDepth(nodeId, newParent.depth + 1);

      // Drop the moved node next to its new parent so it has a sensible
      // starting position. The user will see it animate from old to new
      // location via the next render's transform.
      const dx = newParent.x - node.x;
      const dy = newParent.y - node.y;
      // Walk subtree and translate so relative geometry stays intact.
      const moveIds = [nodeId, ...descendants];
      const placed = placeChild(newParent, (state.childIndex[newParentId] || []).length - 1);
      const targetDx = placed.x - node.x;
      const targetDy = placed.y - node.y;
      // Use whichever shift moves it closer to the new parent — preserves
      // subtree shape even if the parent is far from the previous location.
      const useTarget = Math.hypot(targetDx, targetDy) < Math.hypot(dx, dy) * 1.6;
      const shiftX = useTarget ? targetDx : dx * 0.2;
      const shiftY = useTarget ? targetDy : dy * 0.2;
      for (const id of moveIds) {
        const n = state.nodes[id];
        if (!n) continue;
        n.x += shiftX;
        n.y += shiftY;
      }

      return { success: true };
    }

    // ---- Undo stack ----
    type HistoryEntry = { description: string; undo: () => void };
    const HISTORY_MAX = 50;
    const history: HistoryEntry[] = [];

    function pushHistory(entry: HistoryEntry) {
      history.push(entry);
      while (history.length > HISTORY_MAX) history.shift();
    }

    function undoLast(): HistoryEntry | null {
      const entry = history.pop();
      if (!entry) return null;
      try {
        entry.undo();
      } catch {
        /* if the undo throws, the entry was malformed — drop it silently */
      }
      scheduleSave();
      renderAll();
      return entry;
    }

    // Direct delete (no history push) used as the inverse of create.
    function deleteNodeById(id: string) {
      removeNode(id);
    }

    // ---- Geometry ----
    function screenToWorld(sx: number, sy: number) {
      const rect = stage.getBoundingClientRect();
      const cx = sx - rect.left - rect.width / 2;
      const cy = sy - rect.top - rect.height / 2;
      return {
        x: (cx - state.pan.x) / state.zoom,
        y: (cy - state.pan.y) / state.zoom,
      };
    }

    function curvePath(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      t = 0,
      phase = 0,
    ) {
      const dx = (x2 - x1) * 0.5;
      const length = Math.hypot(x2 - x1, y2 - y1);
      const amp = Math.min(18, length * 0.07);
      const nx = -(y2 - y1) / (length || 1);
      const ny = (x2 - x1) / (length || 1);
      const w1 = Math.sin(t * 1.2 + phase) * amp;
      const w2 = Math.sin(t * 1.5 + phase + 1.7) * amp;
      const c1x = x1 + dx + nx * w1;
      const c1y = y1 + 0 + ny * w1;
      const c2x = x2 - dx + nx * w2;
      const c2y = y2 - 0 + ny * w2;
      return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
    }

    function wiggleAllEdges(time: number) {
      edgesG.querySelectorAll('path').forEach((p) => {
        const fromId = p.getAttribute('data-from') || '';
        const toId = p.getAttribute('data-to') || '';
        const from = state.nodes[fromId];
        const to = state.nodes[toId];
        if (!from || !to) return;
        const phase = parseFloat(p.getAttribute('data-phase') || '0') || 0;
        p.setAttribute('d', curvePath(from.x, from.y, to.x, to.y, time, phase));
      });
    }

    // ---- Brain SVG (no fallback chain — direct img) ----
    function buildBrainSvg(): HTMLDivElement {
      const wrap = document.createElement('div');
      wrap.className = 'brain-svg-wrap';
      const img = document.createElement('img');
      img.className = 'brain-img';
      img.alt = 'My Brain';
      img.draggable = false;
      img.src = '/brain.svg';
      wrap.appendChild(img);
      return wrap;
    }

    // ---- Detail content ----
    function buildDetailContent(n: MindMapNode): HTMLElement {
      const wrap = document.createElement('div');
      wrap.className = 'detail-content';
      wrap.addEventListener('mousedown', (e) => e.stopPropagation());
      wrap.addEventListener('click', (e) => e.stopPropagation());
      wrap.addEventListener('dblclick', (e) => e.stopPropagation());

      const close = document.createElement('button');
      close.className = 'detail-close';
      close.title = 'Close (Esc)';
      close.textContent = '✕';
      close.addEventListener('click', closeDetail);
      wrap.appendChild(close);

      const labelInput = document.createElement('input');
      labelInput.className = 'detail-label';
      const isRoot = n.id === state.rootId;
      // Show the parent-supplied title for the root node when it has no own label.
      const initialLabel =
        isRoot && (!n.label || n.label === 'My Brain')
          ? titleRef.current || n.label || 'My Brain'
          : n.label;
      labelInput.value = initialLabel;
      labelInput.spellcheck = false;
      if (readonlyRef.current) labelInput.readOnly = true;
      labelInput.addEventListener('input', () => {
        if (readonlyRef.current) return;
        n.label = labelInput.value || 'Untitled';
        if (n.id === state.rootId) {
          onTitleChangeRef.current?.(n.label);
          // Brain-label is hidden by CSS in detail mode but must reflect the
          // new value the moment detail closes. Update it now so a closeDetail
          // that doesn't trigger a full renderAll still leaves the right text.
          const brainLbl = nodesLayer.querySelector('.brain-label') as HTMLElement | null;
          if (brainLbl) brainLbl.textContent = n.label;
        }
        scheduleSave();
      });
      labelInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') closeDetail();
      });
      wrap.appendChild(labelInput);

      // Brain root is rename-only — skip note, color, and action buttons.
      if (isRoot) return wrap;

      const noteLabel = document.createElement('div');
      noteLabel.className = 'detail-section-label';
      noteLabel.textContent = 'Note';
      wrap.appendChild(noteLabel);

      const note = document.createElement('textarea');
      note.className = 'detail-note';
      note.placeholder = 'Add some thoughts…';
      note.value = n.note || '';
      if (readonlyRef.current) note.readOnly = true;
      note.addEventListener('input', () => {
        if (readonlyRef.current) return;
        n.note = note.value;
        scheduleSave();
      });
      note.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDetail();
        }
      });
      wrap.appendChild(note);

      const colorRow = document.createElement('div');
      colorRow.className = 'detail-section-label';
      colorRow.textContent = 'Color';
      wrap.appendChild(colorRow);

      const colors = document.createElement('div');
      colors.className = 'detail-colors';
      for (let i = 0; i < COLOR_COUNT; i++) {
        const dot = document.createElement('button');
        dot.className = 'color-dot' + (n.colorIdx === i ? ' active' : '');
        dot.style.background = `linear-gradient(135deg, var(--accent-${i + 1}), var(--accent-${((i + 2) % COLOR_COUNT) + 1}))`;
        dot.title = `Color ${i + 1}`;
        if (readonlyRef.current) dot.disabled = true;
        dot.addEventListener('click', () => {
          if (readonlyRef.current) return;
          const before = n.colorIdx;
          n.colorIdx = i;
          scheduleSave();
          renderAll();
          if (before !== i) {
            pushHistory({
              description: `Recoloured "${n.label}"`,
              undo: () => {
                n.colorIdx = before;
              },
            });
          }
        });
        colors.appendChild(dot);
      }
      wrap.appendChild(colors);

      // Image preview (read-only and editor both render it).
      const imageHolder = document.createElement('div');
      imageHolder.className = 'detail-image-holder';
      renderDetailImage(n, imageHolder);
      wrap.appendChild(imageHolder);

      // Action buttons row (hidden in readonly).
      if (!readonlyRef.current) {
        const actions = document.createElement('div');
        actions.className = 'detail-stubs';

        const imageBtn = document.createElement('button');
        imageBtn.className = 'stub-btn ai-btn';
        imageBtn.title = 'Upload an image (PNG, JPG, WEBP, GIF up to 5 MB)';
        imageBtn.textContent = n.imageUrl ? '🖼️ Replace image' : '🖼️ Add image';
        imageBtn.addEventListener('click', () => pickAndUploadImage(n, imageBtn, imageHolder));
        actions.appendChild(imageBtn);

        const aiBtn = document.createElement('button');
        aiBtn.className = 'stub-btn ai-btn';
        aiBtn.title = 'Suggest 5–8 child ideas with AI';
        aiBtn.textContent = '✨ AI expand';
        aiBtn.addEventListener('click', () => runAIExpand(n, aiBtn, wrap));
        actions.appendChild(aiBtn);

        wrap.appendChild(actions);

        // Drag-drop image upload on the whole detail wrap.
        wrap.addEventListener('dragenter', (e) => {
          if (readonlyRef.current) return;
          if (!e.dataTransfer?.types.includes('Files')) return;
          e.preventDefault();
          wrap.classList.add('dropzone-hover');
        });
        wrap.addEventListener('dragover', (e) => {
          if (readonlyRef.current) return;
          if (!e.dataTransfer?.types.includes('Files')) return;
          e.preventDefault();
        });
        wrap.addEventListener('dragleave', (e) => {
          if (e.target === wrap) wrap.classList.remove('dropzone-hover');
        });
        wrap.addEventListener('drop', async (e) => {
          if (readonlyRef.current) return;
          if (!e.dataTransfer?.files?.length) return;
          e.preventDefault();
          wrap.classList.remove('dropzone-hover');
          const file = e.dataTransfer.files[0];
          await uploadAndAttachImage(n, file, imageBtn, imageHolder);
        });
      }

      return wrap;
    }

    // ---- Image attachments ----
    function renderDetailImage(n: MindMapNode, holder: HTMLElement) {
      holder.innerHTML = '';
      if (!n.imageUrl) return;
      const img = document.createElement('img');
      img.className = 'detail-image';
      img.src = n.imageUrl;
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => {
        holder.innerHTML = '';
        const broken = document.createElement('div');
        broken.className = 'ai-error';
        broken.textContent = '✕ Image failed to load.';
        holder.appendChild(broken);
      });
      holder.appendChild(img);
      if (!readonlyRef.current) {
        const del = document.createElement('button');
        del.className = 'detail-image-del';
        del.title = 'Remove image';
        del.textContent = '✕';
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          n.imageUrl = null;
          renderDetailImage(n, holder);
          scheduleSave();
          renderAll();
        });
        holder.appendChild(del);
      }
    }

    function pickAndUploadImage(
      n: MindMapNode,
      btn: HTMLButtonElement,
      imageHolder: HTMLElement,
    ) {
      if (readonlyRef.current) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/gif';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file) await uploadAndAttachImage(n, file, btn, imageHolder);
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    }

    async function uploadAndAttachImage(
      n: MindMapNode,
      file: File,
      btn: HTMLButtonElement,
      imageHolder: HTMLElement,
    ) {
      if (readonlyRef.current) return;
      const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!ALLOWED.includes(file.type)) {
        showImageError(imageHolder, 'Only PNG, JPG, WEBP or GIF allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showImageError(imageHolder, 'File is over 5 MB.');
        return;
      }

      const originalText = btn.textContent || '🖼️ Add image';
      btn.disabled = true;
      btn.textContent = '🖼️ Uploading…';
      btn.classList.add('ai-thinking');

      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            body.error === 'too_large' ? 'File is over 5 MB.'
            : body.error === 'bad_type' ? 'Unsupported file type.'
            : body.error === 'unauthenticated' ? 'You need to be signed in.'
            : body.error || 'Upload failed.';
          showImageError(imageHolder, msg);
          return;
        }
        n.imageUrl = body.url;
        renderDetailImage(n, imageHolder);
        scheduleSave();
        renderAll();
        btn.textContent = '🖼️ Replace image';
      } catch {
        showImageError(imageHolder, 'Couldn’t reach upload server.');
      } finally {
        btn.disabled = false;
        btn.classList.remove('ai-thinking');
        if (btn.textContent === '🖼️ Uploading…') btn.textContent = originalText;
      }
    }

    function showImageError(holder: HTMLElement, msg: string) {
      const err = document.createElement('div');
      err.className = 'ai-error';
      err.textContent = `✕ ${msg}`;
      holder.appendChild(err);
      setTimeout(() => err.remove(), 4000);
    }

    // ---- AI expand ----
    type AISuggestion = { label: string; note: string };

    async function runAIExpand(
      n: MindMapNode,
      btn: HTMLButtonElement,
      wrap: HTMLElement,
    ) {
      if (readonlyRef.current) return;
      // Don't allow stacking — remove any existing panel first.
      wrap.querySelector('.ai-panel')?.remove();
      const originalText = btn.textContent || '✨ AI expand';
      btn.disabled = true;
      btn.textContent = '✨ Thinking…';
      btn.classList.add('ai-thinking');

      const parent = n.parentId ? state.nodes[n.parentId] : null;
      const siblingIds = (parent && state.childIndex[parent.id]) || [];
      const siblingLabels = siblingIds
        .filter((sid) => sid !== n.id)
        .map((sid) => state.nodes[sid]?.label)
        .filter((l): l is string => !!l);

      let suggestions: AISuggestion[] = [];
      let errorMsg: string | null = null;
      try {
        const res = await fetch(`/api/mindmaps/${mindmapId}/expand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeLabel: n.label,
            nodeNote: n.note || undefined,
            parentLabel: parent?.label,
            siblingLabels,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          errorMsg = body.error || `request failed (${res.status})`;
        } else {
          const body = await res.json();
          suggestions = Array.isArray(body.children) ? body.children : [];
        }
      } catch {
        errorMsg = 'Couldn’t reach AI';
      }

      btn.disabled = false;
      btn.textContent = originalText;
      btn.classList.remove('ai-thinking');

      if (errorMsg) {
        const err = document.createElement('div');
        err.className = 'ai-error';
        err.textContent = `✕ ${errorMsg}`;
        wrap.appendChild(err);
        setTimeout(() => err.remove(), 4000);
        return;
      }

      if (suggestions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ai-error';
        empty.textContent = 'No suggestions returned. Try a different label.';
        wrap.appendChild(empty);
        setTimeout(() => empty.remove(), 4000);
        return;
      }

      renderAIPanel(n, suggestions, wrap);
    }

    function renderAIPanel(
      parentNode: MindMapNode,
      suggestions: AISuggestion[],
      wrap: HTMLElement,
    ) {
      const panel = document.createElement('div');
      panel.className = 'ai-panel';

      const header = document.createElement('div');
      header.className = 'ai-panel-header';
      header.innerHTML = `<span class="ai-panel-title">✨ Suggestions</span><span class="ai-panel-hint">tweak labels, uncheck to drop</span>`;
      panel.appendChild(header);

      const list = document.createElement('ul');
      list.className = 'ai-panel-list';

      const items: { label: string; note: string; accepted: boolean; input: HTMLInputElement }[] = [];

      suggestions.forEach((s) => {
        const li = document.createElement('li');
        li.className = 'ai-panel-item';

        const checkLabel = document.createElement('label');
        checkLabel.className = 'ai-panel-check';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkLabel.appendChild(checkbox);

        const body = document.createElement('div');
        body.className = 'ai-panel-body';

        const labelInput = document.createElement('input');
        labelInput.className = 'ai-panel-label';
        labelInput.value = s.label;

        body.appendChild(labelInput);
        if (s.note) {
          const note = document.createElement('div');
          note.className = 'ai-panel-note';
          note.textContent = s.note;
          body.appendChild(note);
        }

        li.appendChild(checkLabel);
        li.appendChild(body);
        list.appendChild(li);

        const item = { label: s.label, note: s.note, accepted: true, input: labelInput };
        labelInput.addEventListener('input', () => {
          item.label = labelInput.value;
          updateAddCount();
        });
        checkbox.addEventListener('change', () => {
          item.accepted = checkbox.checked;
          updateAddCount();
        });
        items.push(item);
      });

      panel.appendChild(list);

      const actions = document.createElement('div');
      actions.className = 'ai-panel-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'ai-panel-btn ai-panel-btn-ghost';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => panel.remove());

      const addBtn = document.createElement('button');
      addBtn.className = 'ai-panel-btn ai-panel-btn-primary';
      addBtn.addEventListener('click', () => {
        const picks = items.filter((it) => it.accepted && it.label.trim().length > 0);
        if (picks.length === 0) return;
        const createdIds: string[] = [];
        for (const pick of picks) {
          const child = addChild(parentNode.id, pick.label.trim());
          if (child) {
            child.note = pick.note || '';
            createdIds.push(child.id);
          }
        }
        scheduleSave();
        panel.remove();
        renderAll();
        playSfx('pop');
        if (createdIds.length > 0) {
          pushHistory({
            description: `AI added ${createdIds.length} children to "${parentNode.label}"`,
            undo: () => {
              for (const id of createdIds) deleteNodeById(id);
            },
          });
        }
      });

      function updateAddCount() {
        const count = items.filter((it) => it.accepted && it.label.trim().length > 0).length;
        addBtn.disabled = count === 0;
        addBtn.textContent = count > 0 ? `Add ${count} selected` : 'Add selected';
      }
      updateAddCount();

      actions.appendChild(cancelBtn);
      actions.appendChild(addBtn);
      panel.appendChild(actions);

      wrap.appendChild(panel);
    }

    // ---- Action chip ----
    function renderActionChip() {
      const existing = nodesLayer.querySelector('#smm-action-chip');
      if (
        readonlyRef.current ||
        state.detailId ||
        state.editingId ||
        !state.selectedId
      ) {
        if (existing) existing.remove();
        return;
      }
      const n = state.nodes[state.selectedId];
      if (!n) {
        if (existing) existing.remove();
        return;
      }
      let chip = existing as HTMLDivElement | null;
      if (!chip) {
        chip = document.createElement('div');
        chip.id = 'smm-action-chip';
        chip.className = 'action-chip';
        chip.innerHTML =
          '<button data-act="color" title="Cycle colour">🎨</button>' +
          '<button data-act="open"  title="Expand (double-click)">' +
          '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M6 2H2V6 M10 2H14V6 M6 14H2V10 M10 14H14V10"/>' +
          '</svg>' +
          '</button>' +
          '<button data-act="delete" title="Delete (Del)">✕</button>';
        chip.addEventListener('mousedown', (e) => e.stopPropagation());
        chip.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button') as HTMLButtonElement | null;
          if (!btn) return;
          e.stopPropagation();
          handleChipAction(btn.dataset.act || '');
        });
        nodesLayer.appendChild(chip);
      }
      const yOffset = n.id === state.rootId ? 110 : 50;
      chip.style.left = n.x + 'px';
      chip.style.top = n.y + yOffset + 'px';
    }

    function handleChipAction(act: string) {
      if (readonlyRef.current) return;
      const id = state.selectedId;
      const n = id ? state.nodes[id] : null;
      if (!n || !id) return;
      if (act === 'color') {
        const before = n.colorIdx;
        n.colorIdx = ((n.colorIdx ?? 0) + 1) % COLOR_COUNT;
        scheduleSave();
        renderAll();
        pushHistory({
          description: `Recoloured "${n.label}"`,
          undo: () => {
            n.colorIdx = before;
          },
        });
      } else if (act === 'open') {
        openDetail(id);
      } else if (act === 'delete') {
        if (id === state.rootId) return;
        const snap = snapshotSubtree(id);
        removeNode(id);
        scheduleSave();
        renderAll();
        playPhrase('aww');
        pushHistory({
          description: `Deleted "${snap.rootLabel}"`,
          undo: () => restoreSubtree(snap),
        });
      }
    }

    function openDetail(id: string) {
      if (!state.nodes[id]) return;
      state.detailId = id;
      state.editingId = null;
      const n = state.nodes[id];
      const z = Math.max(state.zoom, 1.5);
      animateCamera(-n.x * z, -n.y * z, z, 350);
      renderAll();
      ensureBackdrop(true);
      setTimeout(() => {
        const el = nodesLayer.querySelector(
          `[data-id="${id}"] .detail-label`,
        ) as HTMLElement | null;
        if (el) el.focus();
      }, 0);
    }

    function closeDetail() {
      state.detailId = null;
      ensureBackdrop(false);
      renderAll();
    }

    function ensureBackdrop(show: boolean) {
      // State-driven className on root, not body mutation.
      setInDetailMode(!!show);
    }

    // ---- Render: nodes ----
    function renderNodes() {
      nodesLayer.innerHTML = '';
      Object.values(state.nodes).forEach((n) => {
        const el = document.createElement('div');
        el.className = 'node entering';
        el.dataset.id = n.id;
        el.dataset.depth = String(Math.min(n.depth, 5));
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        if (n.id === state.rootId) {
          el.classList.add('is-brain');
          const aura = document.createElement('div');
          aura.className = 'brain-aura';
          el.appendChild(aura);
          el.appendChild(buildBrainSvg());
          const lbl = document.createElement('div');
          lbl.className = 'brain-label';
          lbl.textContent = titleRef.current || n.label || 'My Brain';
          if (!readonlyRef.current) {
            lbl.classList.add('brain-label-clickable');
            // Stop the brain-click flow from running so a label click goes
            // straight to detail edit (no bounce + no ooh).
            lbl.addEventListener('mousedown', (ev) => ev.stopPropagation());
            lbl.addEventListener('click', (ev) => {
              ev.stopPropagation();
              openDetail(n.id);
            });
          }
          el.appendChild(lbl);
        } else if (n.imageUrl) {
          const thumb = document.createElement('img');
          thumb.className = 'node-thumb';
          thumb.src = n.imageUrl;
          thumb.alt = '';
          thumb.draggable = false;
          thumb.addEventListener('error', () => {
            // Graceful fallback: if image fails to load, hide thumb so label still reads.
            thumb.style.display = 'none';
          });
          el.appendChild(thumb);
          const lbl = document.createElement('div');
          lbl.className = 'node-label';
          lbl.textContent = n.label;
          el.appendChild(lbl);
        } else {
          el.textContent = n.label;
        }
        if (n.id === state.selectedId) el.classList.add('selected');

        // add handle (not in readonly mode)
        if (!readonlyRef.current) {
          const plus = document.createElement('div');
          plus.className = 'add-handle';
          plus.textContent = '+';
          plus.title = 'Add child';
          plus.addEventListener('mousedown', (e) => {
            if (readonlyRef.current) return;
            e.stopPropagation();
            e.preventDefault();
            const startSX = e.clientX,
              startSY = e.clientY;
            const parent = state.nodes[n.id];
            let moved = false;
            let endX = parent.x,
              endY = parent.y;

            const ghost = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'path',
            );
            ghost.setAttribute('class', 'edge-ghost');
            ghost.setAttribute(
              'd',
              `M ${parent.x} ${parent.y} L ${parent.x} ${parent.y}`,
            );
            edgesG.appendChild(ghost);

            function onMove(ev: MouseEvent) {
              if (
                !moved &&
                Math.hypot(ev.clientX - startSX, ev.clientY - startSY) > 4
              ) {
                moved = true;
                playSfx('stretch');
              }
              const w = screenToWorld(ev.clientX, ev.clientY);
              endX = w.x;
              endY = w.y;
              const dx = (endX - parent.x) * 0.5;
              ghost.setAttribute(
                'd',
                `M ${parent.x} ${parent.y} C ${parent.x + dx} ${parent.y}, ${endX - dx} ${endY}, ${endX} ${endY}`,
              );
            }

            function onUp() {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              ghost.remove();
              let child: MindMapNode | null;
              if (moved) {
                child = addNode(parent.id, 'New idea', endX, endY);
              } else {
                child = addChild(parent.id);
              }
              if (child) {
                const childId = child.id;
                state.selectedId = childId;
                // For a click (no drag) we auto-placed via placeChild — re-spread
                // siblings so they don't stack. For a drag the user picked the
                // exact spot; respect it.
                if (!moved) layoutChildren(parent.id);
                scheduleSave();
                renderAll();
                flashEdge(parent.id, childId);
                beginEdit(childId);
                playSfx('pop');
                pushHistory({
                  description: `Created "${child.label}"`,
                  undo: () => deleteNodeById(childId),
                });
              }
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          });
          el.appendChild(plus);
        }

        applyNodeColor(el, n.colorIdx);

        if (n.id === state.detailId) {
          el.classList.add('in-detail');
          const detail = buildDetailContent(n);
          el.appendChild(detail);
        }

        nodesLayer.appendChild(el);
        setTimeout(() => el.classList.remove('entering'), 420);
      });
      renderActionChip();
    }

    function renderEdges() {
      const all = Object.values(state.nodes);
      if (!all.length) {
        edgesG.innerHTML = '';
        return;
      }
      const minX = Math.min(...all.map((n) => n.x)) - 500;
      const minY = Math.min(...all.map((n) => n.y)) - 500;
      const maxX = Math.max(...all.map((n) => n.x)) + 500;
      const maxY = Math.max(...all.map((n) => n.y)) + 500;
      edgesSvg.style.left = minX + 'px';
      edgesSvg.style.top = minY + 'px';
      edgesSvg.setAttribute('width', String(maxX - minX));
      edgesSvg.setAttribute('height', String(maxY - minY));
      edgesSvg.setAttribute(
        'viewBox',
        `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
      );

      let html = '';
      const sel = state.selectedId;
      Object.values(state.nodes).forEach((n) => {
        if (n.parentId == null) return;
        const p = state.nodes[n.parentId];
        if (!p) return;
        const phase =
          ((parseInt(n.id.replace('n', ''), 10) || 0) * 0.41) % (Math.PI * 2);
        const d = curvePath(p.x, p.y, n.x, n.y, 0, phase);
        const highlight =
          sel && (sel === n.id || sel === p.id) ? ' highlight' : '';
        html += `<path class="edge-path${highlight}" d="${d}" data-from="${p.id}" data-to="${n.id}" data-phase="${phase}" />`;
      });
      edgesG.innerHTML = html;
    }

    function applyTransform() {
      world.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
      grid.style.backgroundPosition = `${state.pan.x}px ${state.pan.y}px, ${state.pan.x}px ${state.pan.y}px`;
      zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
      drawMinimap();
    }

    renderAllRef.current = () => renderAll();

    function renderAll() {
      renderEdges();
      renderNodes();
      applyTransform();
    }

    // ---- Edit (inline label) ----
    function beginEdit(id: string) {
      if (readonlyRef.current) return;
      const n = state.nodes[id];
      if (!n) return;
      state.editingId = id;
      state.selectedId = id;
      const el = nodesLayer.querySelector(
        `[data-id="${id}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      el.classList.add('editing');
      el.classList.add('selected');
      el.textContent = '';
      const ta = document.createElement('textarea');
      ta.className = 'node-edit';
      ta.value = n.label;
      ta.rows = 1;
      el.appendChild(ta);
      ta.focus();
      ta.setSelectionRange(0, ta.value.length);
      const autosize = () => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      };
      ta.addEventListener('input', autosize);
      autosize();

      const originalLabel = n.label;
      const finish = (save: boolean) => {
        if (state.editingId !== id) return;
        state.editingId = null;
        el.classList.remove('editing');
        if (save) {
          const next = ta.value.trim() || 'Untitled';
          n.label = next;
          if (n.id === state.rootId) onTitleChangeRef.current?.(n.label);
          // Speak the label only when it actually changed and isn't the brain
          // (brain has its own "Ooooh" on click — see playPhrase).
          if (next !== originalLabel && n.id !== state.rootId) speakLabel(next);
          if (next !== originalLabel) {
            pushHistory({
              description: `Renamed to "${next}"`,
              undo: () => {
                n.label = originalLabel;
                if (n.id === state.rootId) onTitleChangeRef.current?.(n.label);
              },
            });
          }
        }
        scheduleSave();
        renderAll();
      };
      ta.addEventListener('blur', () => finish(true));
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          finish(true);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      });
    }

    // ---- Pan / Drag / Zoom ----
    let panState: {
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    } | null = null;
    let dragNode: {
      id: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      descendants: { id: string; originX: number; originY: number }[];
      originalParentId: string | null;
      dropTargetId: string | null;
    } | null = null;
    let movedDuringClick = 0;

    function onStageMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      if (state.detailId) {
        const target = e.target as HTMLElement;
        if (!target.closest('.in-detail')) closeDetail();
        return;
      }
      const target = (e.target as HTMLElement).closest(
        '.node',
      ) as HTMLElement | null;
      if (target) {
        const id = target.dataset.id || '';
        const n = state.nodes[id];
        if (!n) return;
        if (readonlyRef.current) {
          // In readonly: allow click-to-select via mouseup, no dragging.
          dragNode = {
            id,
            startX: e.clientX,
            startY: e.clientY,
            originX: n.x,
            originY: n.y,
            descendants: [],
            originalParentId: n.parentId,
            dropTargetId: null,
          };
          movedDuringClick = 0;
          return;
        }
        dragNode = {
          id,
          startX: e.clientX,
          startY: e.clientY,
          originX: n.x,
          originY: n.y,
          descendants: getDescendants(id).map((did) => ({
            id: did,
            originX: state.nodes[did].x,
            originY: state.nodes[did].y,
          })),
          originalParentId: n.parentId,
          dropTargetId: null,
        };
        movedDuringClick = 0;
      } else {
        panState = {
          startX: e.clientX,
          startY: e.clientY,
          originX: state.pan.x,
          originY: state.pan.y,
        };
        stage.classList.add('panning');
      }
    }

    function onWindowMouseMove(e: MouseEvent) {
      if (panState) {
        state.pan.x = panState.originX + (e.clientX - panState.startX);
        state.pan.y = panState.originY + (e.clientY - panState.startY);
        applyTransform();
      } else if (dragNode) {
        const dx = (e.clientX - dragNode.startX) / state.zoom;
        const dy = (e.clientY - dragNode.startY) / state.zoom;
        movedDuringClick = Math.max(movedDuringClick, Math.hypot(dx, dy));
        if (readonlyRef.current) return;
        if (movedDuringClick > 4) {
          const n = state.nodes[dragNode.id];
          n.x = dragNode.originX + dx;
          n.y = dragNode.originY + dy;
          const el = nodesLayer.querySelector(
            `[data-id="${dragNode.id}"]`,
          ) as HTMLElement | null;
          if (el) {
            el.style.left = n.x + 'px';
            el.style.top = n.y + 'px';
            el.classList.add('dragging');
          }
          for (const d of dragNode.descendants) {
            const dn = state.nodes[d.id];
            if (!dn) continue;
            dn.x = d.originX + dx;
            dn.y = d.originY + dy;
            const dEl = nodesLayer.querySelector(
              `[data-id="${d.id}"]`,
            ) as HTMLElement | null;
            if (dEl) {
              dEl.style.left = dn.x + 'px';
              dEl.style.top = dn.y + 'px';
            }
          }

          // Drop-target detection: any other node under the cursor that isn't
          // the dragged node, the current parent, or one of its descendants.
          const descendantIds = new Set(dragNode.descendants.map((d) => d.id));
          const stack = document.elementsFromPoint(e.clientX, e.clientY);
          let newTargetId: string | null = null;
          for (const el of stack) {
            if (!(el instanceof HTMLElement)) continue;
            if (!el.classList.contains('node')) continue;
            const tid = el.dataset.id || '';
            if (!tid || tid === dragNode.id) continue;
            if (descendantIds.has(tid)) continue;
            if (tid === dragNode.originalParentId) continue; // already its parent
            newTargetId = tid;
            break;
          }

          if (newTargetId !== dragNode.dropTargetId) {
            if (dragNode.dropTargetId) {
              const prev = nodesLayer.querySelector(
                `[data-id="${dragNode.dropTargetId}"]`,
              );
              prev?.classList.remove('drop-target');
            }
            if (newTargetId) {
              const next = nodesLayer.querySelector(
                `[data-id="${newTargetId}"]`,
              );
              next?.classList.add('drop-target');
            }
            dragNode.dropTargetId = newTargetId;
          }
        }
      }
    }

    function onWindowMouseUp(_e: MouseEvent) {
      if (panState) {
        panState = null;
        stage.classList.remove('panning');
      }
      if (dragNode) {
        const wasClick = movedDuringClick < 4;
        const id = dragNode.id;
        const el = nodesLayer.querySelector(
          `[data-id="${id}"]`,
        ) as HTMLElement | null;
        if (el) el.classList.remove('dragging');
        const draggedNode = dragNode;
        dragNode = null;
        if (wasClick) {
          if (id === state.rootId) {
            // Brain: bounce + recenter + ooh. Never opens detail (label edit
            // is via the .brain-label click handler, not the brain itself).
            playPhrase('ooh');
            state.selectedId = id;
            const wasAlreadySelected = state.selectedId === id;
            if (!wasAlreadySelected) renderAll();
            focusOnNode(id);
            const brainEl = nodesLayer.querySelector('.is-brain') as HTMLElement | null;
            if (brainEl) {
              brainEl.classList.remove('dropped');
              // Force reflow so the animation restarts even on rapid clicks.
              void brainEl.offsetWidth;
              brainEl.classList.add('dropped');
              setTimeout(() => brainEl.classList.remove('dropped'), 600);
            }
          } else if (state.selectedId === id) {
            // Already selected non-brain node — second click opens detail.
            if (!readonlyRef.current) {
              openDetail(id);
            } else {
              renderAll();
              focusOnNode(id);
            }
          } else {
            state.selectedId = id;
            renderAll();
            focusOnNode(id);
          }
        } else if (!readonlyRef.current) {
          // Clear any lingering drop-target highlight.
          if (draggedNode.dropTargetId) {
            const targetEl = nodesLayer.querySelector(
              `[data-id="${draggedNode.dropTargetId}"]`,
            );
            targetEl?.classList.remove('drop-target');
          }

          if (draggedNode.dropTargetId) {
            // Reparent under the drop target. reparent() handles cycle
            // prevention and depth recompute. Capture the original parent
            // for undo.
            const originalParentId = draggedNode.originalParentId;
            const result = reparent(id, draggedNode.dropTargetId);
            if (result.success) {
              const label = state.nodes[id]?.label || 'node';
              playSfx('pop');
              pushHistory({
                description: `Moved "${label}"`,
                undo: () => {
                  if (originalParentId) reparent(id, originalParentId);
                },
              });
              renderAll();
            } else {
              // reparent refused (cycle, etc.) — leave node where the user
              // dropped it and just persist the position change.
            }
            scheduleSave();
          } else {
            if (el) {
              el.classList.remove('dropped');
              void el.offsetWidth;
              el.classList.add('dropped');
              setTimeout(
                () => el && el.classList.remove('dropped'),
                600,
              );
            }
            scheduleSave();
          }
        }
        // touch reference so TS doesn't warn
        void draggedNode;
      }
    }

    function onStageWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      const oldZoom = state.zoom;
      const newZoom = clamp(oldZoom * (1 + delta), 0.2, 3);
      const rect = stage.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const wx = (cx - state.pan.x) / oldZoom;
      const wy = (cy - state.pan.y) / oldZoom;
      state.zoom = newZoom;
      state.pan.x = cx - wx * newZoom;
      state.pan.y = cy - wy * newZoom;
      applyTransform();
      // Wheel-zoom is transient (not part of MindMapData) — no save needed in React port.
    }

    function onNodesDblClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(
        '.node',
      ) as HTMLElement | null;
      if (!target) return;
      if (readonlyRef.current) return;
      openDetail(target.dataset.id || '');
    }

    function onWindowKeyDown(e: KeyboardEvent) {
      if (state.editingId) return;
      const tag =
        (e.target && (e.target as HTMLElement).tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (readonlyRef.current) return;
        e.preventDefault();
        undoLast();
        return;
      }

      if (e.key === 'Tab') {
        if (readonlyRef.current) return;
        e.preventDefault();
        if (state.selectedId) {
          const parentId = state.selectedId;
          const c = addChild(parentId);
          if (c) {
            const childId = c.id;
            state.selectedId = childId;
            layoutChildren(parentId);
            scheduleSave();
            renderAll();
            flashEdge(parentId, childId);
            beginEdit(childId);
            playSfx('pop');
            pushHistory({
              description: `Created "${c.label}"`,
              undo: () => deleteNodeById(childId),
            });
          }
        }
      } else if (e.key === 'Enter') {
        if (readonlyRef.current) return;
        if (!state.selectedId) return;
        e.preventDefault();
        const c = addSibling(state.selectedId);
        if (c) {
          const childId = c.id;
          const parentId = c.parentId!;
          state.selectedId = childId;
          layoutChildren(parentId);
          scheduleSave();
          renderAll();
          flashEdge(parentId, childId);
          beginEdit(childId);
          playSfx('pop');
          pushHistory({
            description: `Created sibling "${c.label}"`,
            undo: () => deleteNodeById(childId),
          });
        } else if (state.selectedId) {
          beginEdit(state.selectedId);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (readonlyRef.current) return;
        if (state.selectedId && state.selectedId !== state.rootId) {
          e.preventDefault();
          const id = state.selectedId;
          const snap = snapshotSubtree(id);
          removeNode(id);
          scheduleSave();
          renderAll();
          playPhrase('aww');
          pushHistory({
            description: `Deleted "${snap.rootLabel}"`,
            undo: () => restoreSubtree(snap),
          });
        }
      } else if (e.key === 'Escape') {
        if (state.detailId) {
          closeDetail();
        } else {
          state.selectedId = null;
          renderAll();
        }
      } else if (e.key.toLowerCase() === 'f') {
        fitToScreen();
      } else if (e.key === 'Home') {
        centerOnRoot();
      } else if (e.key === 'F2') {
        if (readonlyRef.current) return;
        if (state.selectedId) beginEdit(state.selectedId);
      }
    }

    // ---- Camera ----
    function bounds() {
      const ns = Object.values(state.nodes);
      if (!ns.length) return null;
      return {
        minX: Math.min(...ns.map((n) => n.x)) - 100,
        maxX: Math.max(...ns.map((n) => n.x)) + 100,
        minY: Math.min(...ns.map((n) => n.y)) - 60,
        maxY: Math.max(...ns.map((n) => n.y)) + 60,
      };
    }

    function fitToScreen() {
      const b = bounds();
      if (!b) return;
      const w = stage.clientWidth,
        h = stage.clientHeight;
      const targetZoom = clamp(
        Math.min(w / (b.maxX - b.minX), h / (b.maxY - b.minY)) * 0.85,
        0.2,
        1.5,
      );
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      animateCamera(-cx * targetZoom, -cy * targetZoom, targetZoom);
    }

    function centerOnRoot() {
      const root2 = state.rootId ? state.nodes[state.rootId] : null;
      if (!root2) return;
      animateCamera(-root2.x * state.zoom, -root2.y * state.zoom, state.zoom);
    }

    function focusOnNode(id: string) {
      const n = state.nodes[id];
      if (!n) return;
      if (id === state.rootId) {
        animateCamera(-n.x * state.zoom, -n.y * state.zoom, state.zoom, 500);
      } else {
        const z = Math.max(state.zoom, 1.3);
        animateCamera(-n.x * z, -n.y * z, z, 500);
      }
    }

    let cameraRaf: number | null = null;
    function animateCamera(
      targetX: number,
      targetY: number,
      targetZoom: number,
      duration = 400,
    ) {
      const startX = state.pan.x,
        startY = state.pan.y,
        startZ = state.zoom;
      const t0 = performance.now();
      if (cameraRaf != null) cancelAnimationFrame(cameraRaf);
      function tick() {
        if (cancelledRef.current) return;
        const t = Math.min(1, (performance.now() - t0) / duration);
        const e = 1 - Math.pow(1 - t, 3);
        state.pan.x = startX + (targetX - startX) * e;
        state.pan.y = startY + (targetY - startY) * e;
        state.zoom = startZ + (targetZoom - startZ) * e;
        applyTransform();
        if (t < 1) cameraRaf = requestAnimationFrame(tick);
        else cameraRaf = null;
      }
      cameraRaf = requestAnimationFrame(tick);
    }

    // ---- Particles ----
    const pctx = particlesCanvas.getContext('2d')!;
    let pcW = 0,
      pcH = 0;
    function resizeParticles() {
      pcW = particlesCanvas.clientWidth;
      pcH = particlesCanvas.clientHeight;
      particlesCanvas.width = pcW * window.devicePixelRatio;
      particlesCanvas.height = pcH * window.devicePixelRatio;
      pctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0,
      );
    }
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function onWindowResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeParticles();
        drawMinimap();
      }, 80);
    }

    type Particle = {
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      t: number;
      life: number;
      born: number;
    };
    const particles: Particle[] = [];

    function flashEdge(parentId: string, childId: string, count = 6) {
      const a = state.nodes[parentId],
        b = state.nodes[childId];
      if (!a || !b) return;
      for (let i = 0; i < count; i++) {
        particles.push({
          fromX: a.x,
          fromY: a.y,
          toX: b.x,
          toY: b.y,
          t: 0,
          life: 800 + i * 120,
          born: performance.now() + i * 60,
        });
      }
    }

    function tickParticles() {
      if (cancelledRef.current) return;
      pctx.clearRect(0, 0, pcW, pcH);
      const now = performance.now();
      wiggleAllEdges(now / 1000);
      const accent =
        getComputedStyle(root)
          .getPropertyValue('--selection')
          .trim() || '#a78bfa';
      const cx = stage.clientWidth / 2 + state.pan.x;
      const cy = stage.clientHeight / 2 + state.pan.y;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const elapsed = now - p.born;
        if (elapsed < 0) continue;
        const t = elapsed / p.life;
        if (t > 1) {
          particles.splice(i, 1);
          continue;
        }
        const e =
          t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const wx = p.fromX + (p.toX - p.fromX) * e;
        const wy = p.fromY + (p.toY - p.fromY) * e;
        const sx = cx + wx * state.zoom;
        const sy = cy + wy * state.zoom;
        const r = (1 - t) * 4 * state.zoom + 1.2;
        const a = (1 - t) * 0.9;

        pctx.beginPath();
        pctx.arc(sx, sy, r, 0, Math.PI * 2);
        pctx.fillStyle = accent;
        pctx.globalAlpha = a;
        pctx.shadowBlur = 12;
        pctx.shadowColor = accent;
        pctx.fill();
      }
      pctx.globalAlpha = 1;
      pctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(tickParticles);
    }

    // ---- Minimap ----
    function drawMinimap() {
      const ctx = minimapCanvas.getContext('2d')!;
      const w = minimapCanvas.clientWidth,
        h = minimapCanvas.clientHeight;
      minimapCanvas.width = w * window.devicePixelRatio;
      minimapCanvas.height = h * window.devicePixelRatio;
      ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0,
      );
      ctx.clearRect(0, 0, w, h);

      const b = bounds();
      if (!b) return;
      const bw = b.maxX - b.minX,
        bh = b.maxY - b.minY;
      const scale = Math.min(w / bw, h / bh) * 0.85;
      const ox = (w - bw * scale) / 2 - b.minX * scale;
      const oy = (h - bh * scale) / 2 - b.minY * scale;

      const css = getComputedStyle(root);
      ctx.strokeStyle = css.getPropertyValue('--edge') || '#666';
      ctx.lineWidth = 1;
      Object.values(state.nodes).forEach((n) => {
        if (n.parentId == null) return;
        const p = state.nodes[n.parentId];
        if (!p) return;
        ctx.beginPath();
        ctx.moveTo(p.x * scale + ox, p.y * scale + oy);
        ctx.lineTo(n.x * scale + ox, n.y * scale + oy);
        ctx.stroke();
      });
      ctx.fillStyle = css.getPropertyValue('--selection') || '#a78bfa';
      Object.values(state.nodes).forEach((n) => {
        const r = n.id === state.rootId ? 4 : 2;
        ctx.beginPath();
        ctx.arc(n.x * scale + ox, n.y * scale + oy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      const sw = stage.clientWidth,
        sh = stage.clientHeight;
      const vx = (-state.pan.x - sw / 2) / state.zoom;
      const vy = (-state.pan.y - sh / 2) / state.zoom;
      const vw = sw / state.zoom,
        vh = sh / state.zoom;
      ctx.strokeStyle = css.getPropertyValue('--ui-text') || '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55;
      ctx.strokeRect(
        vx * scale + ox,
        vy * scale + oy,
        vw * scale,
        vh * scale,
      );
      ctx.globalAlpha = 1;
    }

    function onMinimapClick(e: MouseEvent) {
      const rect = minimapCanvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const w = rect.width,
        h = rect.height;
      const b = bounds();
      if (!b) return;
      const bw = b.maxX - b.minX,
        bh = b.maxY - b.minY;
      const scale = Math.min(w / bw, h / bh) * 0.85;
      const ox = (w - bw * scale) / 2 - b.minX * scale;
      const oy = (h - bh * scale) / 2 - b.minY * scale;
      const wx = (px - ox) / scale,
        wy = (py - oy) / scale;
      animateCamera(-wx * state.zoom, -wy * state.zoom, state.zoom);
    }

    // ---- Toolbar buttons (queried inside our root) ----
    function onAdd() {
      if (readonlyRef.current) return;
      if (state.selectedId) {
        const parentId = state.selectedId;
        const c = addChild(parentId);
        if (c) {
          const childId = c.id;
          state.selectedId = childId;
          layoutChildren(parentId);
          scheduleSave();
          renderAll();
          flashEdge(parentId, childId);
          beginEdit(childId);
          playSfx('pop');
          pushHistory({
            description: `Created "${c.label}"`,
            undo: () => deleteNodeById(childId),
          });
        }
      }
    }
    function onSibling() {
      if (readonlyRef.current) return;
      if (state.selectedId) {
        const c = addSibling(state.selectedId);
        if (c) {
          const childId = c.id;
          const parentId = c.parentId!;
          state.selectedId = childId;
          layoutChildren(parentId);
          scheduleSave();
          renderAll();
          flashEdge(parentId, childId);
          beginEdit(childId);
          playSfx('pop');
          pushHistory({
            description: `Created sibling "${c.label}"`,
            undo: () => deleteNodeById(childId),
          });
        }
      }
    }
    function onExport() {
      if (readonlyRef.current) return;
      const json = JSON.stringify(
        {
          nodes: state.nodes,
          childIndex: state.childIndex,
          rootId: state.rootId,
        },
        null,
        2,
      );
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'squishymind-' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(url);
    }
    function onImportClick() {
      if (readonlyRef.current) return;
      fileInputRef.current?.click();
    }
    function onFileChange(e: Event) {
      if (readonlyRef.current) return;
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          state.nodes = data.nodes || {};
          state.childIndex = data.childIndex || {};
          state.rootId = data.rootId || null;
          nextIdRef.current = nextIdFromNodes(state.nodes);
          state.selectedId = state.rootId;
          scheduleSave();
          renderAll();
          fitToScreen();
        } catch (err) {
          alert('Invalid JSON: ' + (err as Error).message);
        }
      };
      reader.readAsText(f);
      // reset so re-importing the same file works
      (e.target as HTMLInputElement).value = '';
    }
    function onClear() {
      if (readonlyRef.current) return;
      if (!confirm('Reset the mind map? This cannot be undone.')) return;
      state.nodes = {};
      state.childIndex = {};
      state.rootId = null;
      state.selectedId = null;
      nextIdRef.current = 1;
      const newRoot = addNode(null, 'My Brain', 0, 0);
      ['Example', 'Hobby', 'Profession', 'Private'].forEach((name) =>
        addChild(newRoot.id, name),
      );
      state.selectedId = newRoot.id;
      scheduleSave();
      renderAll();
      centerOnRoot();
    }

    // Wire toolbar buttons (scoped to root)
    const btnAdd = root.querySelector('[data-tb="add"]') as HTMLButtonElement | null;
    const btnSibling = root.querySelector(
      '[data-tb="sibling"]',
    ) as HTMLButtonElement | null;
    const btnFit = root.querySelector('[data-tb="fit"]') as HTMLButtonElement | null;
    const btnCenter = root.querySelector(
      '[data-tb="center"]',
    ) as HTMLButtonElement | null;
    const btnExport = root.querySelector(
      '[data-tb="export"]',
    ) as HTMLButtonElement | null;
    const btnImport = root.querySelector(
      '[data-tb="import"]',
    ) as HTMLButtonElement | null;
    const btnClear = root.querySelector('[data-tb="clear"]') as HTMLButtonElement | null;
    const btnMute = root.querySelector('[data-tb="mute"]') as HTMLButtonElement | null;
    const themeDots = Array.from(
      root.querySelectorAll('.theme-dot'),
    ) as HTMLElement[];

    btnAdd?.addEventListener('click', onAdd);
    btnSibling?.addEventListener('click', onSibling);
    btnFit?.addEventListener('click', fitToScreen);
    btnCenter?.addEventListener('click', centerOnRoot);
    btnExport?.addEventListener('click', onExport);
    btnImport?.addEventListener('click', onImportClick);
    btnClear?.addEventListener('click', onClear);
    btnMute?.addEventListener('click', () => setMuted(!muted));
    fileInputRef.current?.addEventListener('change', onFileChange);
    // Sync the button label with the persisted preference at mount.
    if (btnMute) btnMute.textContent = muted ? '🔇' : '🔊';

    function applyThemeAttr(name: Theme) {
      state.theme = name;
      if (name === 'aurora') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', name);
      themeDots.forEach((d) =>
        d.classList.toggle('active', d.dataset.theme === name),
      );
      // Theme is transient — drop persistence.
    }
    themeDots.forEach((el) => {
      el.addEventListener('click', () => {
        applyThemeAttr((el.dataset.theme as Theme) || 'aurora');
      });
    });
    applyThemeAttr('aurora');

    // ---- Wire global listeners ----
    stage.addEventListener('mousedown', onStageMouseDown);
    stage.addEventListener('wheel', onStageWheel, { passive: false });
    nodesLayer.addEventListener('dblclick', onNodesDblClick);
    minimapCanvas.addEventListener('click', onMinimapClick);
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    window.addEventListener('keydown', onWindowKeyDown);
    window.addEventListener('resize', onWindowResize);

    // ---- Boot ----
    if (!state.rootId) {
      // Empty initial data — seed the prototype's demo so the user has something to look at.
      const newRoot = addNode(null, 'My Brain', 0, 0);
      ['Example', 'Hobby', 'Profession', 'Private'].forEach((name) =>
        addChild(newRoot.id, name),
      );
      state.selectedId = newRoot.id;
      scheduleSave();
    }
    resizeParticles();
    renderAll();
    setTimeout(fitToScreen, 50);
    rafRef.current = requestAnimationFrame(tickParticles);

    // ---- Squishy voice command handler ----
    // Read-only viewers (share/[token]) still register the handler so list /
    // focus / fit work, but mutation commands return a clean error.
    const unregisterCanvasHandler = registerCanvasHandler((cmd): CanvasResult => {
      const isMutation =
        cmd.type === 'create_node' ||
        cmd.type === 'create_nodes_batch' ||
        cmd.type === 'update_node' ||
        cmd.type === 'move_node' ||
        cmd.type === 'delete_node' ||
        cmd.type === 'undo';
      if (isMutation && readonlyRef.current) {
        return { success: false, error: 'This map is read-only.' };
      }

      if (cmd.type === 'create_node') {
        const parent = state.nodes[cmd.parent_id];
        if (!parent) return { success: false, error: `No parent with id ${cmd.parent_id}` };
        const newNode = addChild(cmd.parent_id, cmd.label);
        if (!newNode) return { success: false, error: 'Could not create node' };
        if (cmd.note) newNode.note = cmd.note;
        if (typeof cmd.color_idx === 'number') {
          newNode.colorIdx = ((cmd.color_idx % COLOR_COUNT) + COLOR_COUNT) % COLOR_COUNT;
        }
        const newId = newNode.id;
        // Re-spread existing siblings so the new one doesn't stack on top.
        layoutChildren(cmd.parent_id);
        scheduleSave();
        renderAll();
        flashEdge(cmd.parent_id, newId);
        playSfx('pop');
        pushHistory({
          description: `Created "${newNode.label}"`,
          undo: () => deleteNodeById(newId),
        });
        return {
          success: true,
          data: { node_id: newId, label: newNode.label, parent_id: cmd.parent_id },
        };
      }

      if (cmd.type === 'create_nodes_batch') {
        const parent = state.nodes[cmd.parent_id];
        if (!parent) return { success: false, error: `No parent with id ${cmd.parent_id}` };
        const created: Array<{ id: string; label: string }> = [];
        for (const child of cmd.children) {
          const node = addChild(cmd.parent_id, child.label);
          if (!node) continue;
          if (child.note) node.note = child.note;
          if (typeof child.color_idx === 'number') {
            node.colorIdx = ((child.color_idx % COLOR_COUNT) + COLOR_COUNT) % COLOR_COUNT;
          }
          created.push({ id: node.id, label: node.label });
          flashEdge(cmd.parent_id, node.id);
        }
        // Spread the whole sibling set so the batch lands evenly.
        layoutChildren(cmd.parent_id);
        scheduleSave();
        renderAll();
        playSfx('pop');
        if (created.length > 0) {
          const ids = created.map((c) => c.id);
          pushHistory({
            description: `Created ${created.length} children under "${parent.label}"`,
            undo: () => {
              for (const id of ids) deleteNodeById(id);
            },
          });
        }
        return { success: true, data: { created, count: created.length } };
      }

      if (cmd.type === 'update_node') {
        const n = state.nodes[cmd.node_id];
        if (!n) return { success: false, error: `No node with id ${cmd.node_id}` };
        const before = { label: n.label, note: n.note, colorIdx: n.colorIdx };
        if (cmd.label !== undefined) n.label = cmd.label;
        if (cmd.note !== undefined) n.note = cmd.note;
        if (typeof cmd.color_idx === 'number') {
          n.colorIdx = ((cmd.color_idx % COLOR_COUNT) + COLOR_COUNT) % COLOR_COUNT;
        }
        if (n.id === state.rootId && cmd.label !== undefined) {
          onTitleChangeRef.current?.(n.label);
        }
        scheduleSave();
        renderAll();
        pushHistory({
          description: `Updated "${n.label}"`,
          undo: () => {
            n.label = before.label;
            n.note = before.note;
            n.colorIdx = before.colorIdx;
            if (n.id === state.rootId) onTitleChangeRef.current?.(n.label);
          },
        });
        return {
          success: true,
          data: { node_id: n.id, label: n.label, note: n.note, color_idx: n.colorIdx },
        };
      }

      if (cmd.type === 'move_node') {
        const node = state.nodes[cmd.node_id];
        if (!node) return { success: false, error: `No node with id ${cmd.node_id}` };
        const oldParentId = node.parentId;
        const result = reparent(cmd.node_id, cmd.new_parent_id);
        if (!result.success) return { success: false, error: result.error };
        scheduleSave();
        renderAll();
        pushHistory({
          description: `Moved "${node.label}"`,
          undo: () => {
            if (oldParentId) reparent(cmd.node_id, oldParentId);
          },
        });
        return {
          success: true,
          data: { node_id: cmd.node_id, new_parent_id: cmd.new_parent_id },
        };
      }

      if (cmd.type === 'delete_node') {
        const n = state.nodes[cmd.node_id];
        if (!n) return { success: false, error: `No node with id ${cmd.node_id}` };
        if (cmd.node_id === state.rootId) {
          return { success: false, error: 'Cannot delete the root brain' };
        }
        const snap = snapshotSubtree(cmd.node_id);
        removeNode(cmd.node_id);
        scheduleSave();
        renderAll();
        playPhrase('aww');
        pushHistory({
          description: `Deleted "${snap.rootLabel}"`,
          undo: () => restoreSubtree(snap),
        });
        return {
          success: true,
          data: { deleted_count: snap.descendantCount + 1, label: snap.rootLabel },
        };
      }

      if (cmd.type === 'undo') {
        const undone = undoLast();
        if (!undone) return { success: false, error: 'Nothing to undo' };
        return { success: true, data: { description: undone.description } };
      }

      if (cmd.type === 'list_nodes') {
        let nodeArr: MindMapNode[];
        if (cmd.parent_id) {
          const childIds = state.childIndex[cmd.parent_id] || [];
          nodeArr = childIds.map((id) => state.nodes[id]).filter(Boolean);
        } else {
          nodeArr = Object.values(state.nodes);
        }
        if (cmd.query) {
          const q = cmd.query.toLowerCase();
          nodeArr = nodeArr.filter((n) => n.label.toLowerCase().includes(q));
        }
        const summary = nodeArr.map((n) => ({
          id: n.id,
          label: n.label,
          depth: n.depth,
          parent_id: n.parentId,
          child_count: (state.childIndex[n.id] || []).length,
          has_note: !!n.note,
          color_idx: n.colorIdx,
          is_root: n.id === state.rootId,
        }));
        return {
          success: true,
          data: { count: summary.length, root_id: state.rootId, nodes: summary },
        };
      }

      if (cmd.type === 'focus_node') {
        const n = state.nodes[cmd.node_id];
        if (!n) return { success: false, error: `No node with id ${cmd.node_id}` };
        focusOnNode(cmd.node_id);
        return { success: true, data: { node_id: cmd.node_id, label: n.label } };
      }

      if (cmd.type === 'fit_to_screen') {
        fitToScreen();
        return { success: true };
      }

      if (cmd.type === 'open_detail_view') {
        const n = state.nodes[cmd.node_id];
        if (!n) return { success: false, error: `No node with id ${cmd.node_id}` };
        openDetail(cmd.node_id);
        return {
          success: true,
          data: {
            node_id: n.id,
            label: n.label,
            note: n.note || null,
            color_idx: n.colorIdx,
            has_image: !!n.imageUrl,
          },
        };
      }

      if (cmd.type === 'close_detail_view') {
        if (!state.detailId) {
          return { success: false, error: 'No detail view is currently open' };
        }
        closeDetail();
        return { success: true };
      }

      if (cmd.type === 'switch_theme') {
        applyThemeAttr(cmd.theme);
        return { success: true, data: { theme: cmd.theme } };
      }

      if (cmd.type === 'list_templates') {
        const summaries = TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
        }));
        return { success: true, data: { templates: summaries, count: summaries.length } };
      }

      if (cmd.type === 'apply_template') {
        const template = TEMPLATES.find((t) => t.id === cmd.template_id);
        if (!template) {
          return { success: false, error: `No template with id ${cmd.template_id}` };
        }
        // Snapshot the entire current map so the user can Cmd+Z back to it.
        const before = {
          nodes: JSON.parse(JSON.stringify(state.nodes)) as typeof state.nodes,
          childIndex: JSON.parse(JSON.stringify(state.childIndex)) as typeof state.childIndex,
          rootId: state.rootId,
          selectedId: state.selectedId,
        };
        const fresh = JSON.parse(JSON.stringify(template.data)) as typeof template.data;
        state.nodes = fresh.nodes;
        state.childIndex = fresh.childIndex;
        state.rootId = fresh.rootId;
        state.selectedId = fresh.rootId;
        state.detailId = null;
        nextIdRef.current = nextIdFromNodes(state.nodes);
        // Push title up to the parent so the editor toolbar shows the template name.
        if (fresh.rootId && state.nodes[fresh.rootId]) {
          onTitleChangeRef.current?.(state.nodes[fresh.rootId].label);
        }
        scheduleSave();
        renderAll();
        setTimeout(fitToScreen, 50);
        playSfx('pop');
        pushHistory({
          description: `Applied "${template.name}" template`,
          undo: () => {
            state.nodes = before.nodes;
            state.childIndex = before.childIndex;
            state.rootId = before.rootId;
            state.selectedId = before.selectedId;
            state.detailId = null;
            nextIdRef.current = nextIdFromNodes(state.nodes);
            if (before.rootId && state.nodes[before.rootId]) {
              onTitleChangeRef.current?.(state.nodes[before.rootId].label);
            }
          },
        });
        return {
          success: true,
          data: {
            template_id: template.id,
            template_name: template.name,
            node_count: Object.keys(template.data.nodes).length,
          },
        };
      }

      return { success: false, error: 'Unknown command type' };
    });

    // ---- Cleanup ----
    return () => {
      unregisterCanvasHandler();
      cancelledRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (cameraRaf != null) cancelAnimationFrame(cameraRaf);
      cameraRaf = null;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = null;
      if (ttsTimer) clearTimeout(ttsTimer);
      if (ttsObjectUrl) URL.revokeObjectURL(ttsObjectUrl);
      ttsObjectUrl = null;
      for (const url of ttsCache.values()) URL.revokeObjectURL(url);
      ttsCache.clear();
      if (ttsCtx) {
        ttsCtx.close().catch(() => {});
        ttsCtx = null;
      }

      stage.removeEventListener('mousedown', onStageMouseDown);
      stage.removeEventListener('wheel', onStageWheel);
      nodesLayer.removeEventListener('dblclick', onNodesDblClick);
      minimapCanvas.removeEventListener('click', onMinimapClick);
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('keydown', onWindowKeyDown);
      window.removeEventListener('resize', onWindowResize);

      btnAdd?.removeEventListener('click', onAdd);
      btnSibling?.removeEventListener('click', onSibling);
      btnFit?.removeEventListener('click', fitToScreen);
      btnCenter?.removeEventListener('click', centerOnRoot);
      btnExport?.removeEventListener('click', onExport);
      btnImport?.removeEventListener('click', onImportClick);
      btnClear?.removeEventListener('click', onClear);
      fileInputRef.current?.removeEventListener('change', onFileChange);

      // Clear DOM artifacts (next mount will rebuild)
      nodesLayer.innerHTML = '';
      edgesG.innerHTML = '';
    };
    // Re-run only if mindmapId changes (treat each map as a fresh boot).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmapId]);

  // When initialData changes for the SAME mindmapId, hydrate without remounting.
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  return (
    <div
      ref={rootRef}
      className={`smm-root${inDetailMode ? ' in-detail-mode' : ''}${readonly ? ' smm-readonly' : ''}`}
      data-mindmap-id={mindmapId}
    >
      <div ref={stageRef} className="smm-stage">
        <div ref={gridRef} className="smm-grid" />
        <div ref={worldRef} className="smm-world">
          <svg ref={edgesSvgRef} className="smm-edges">
            <g ref={edgesGRef} />
          </svg>
          <div ref={nodesLayerRef} className="smm-nodes" />
        </div>
        <canvas ref={particlesCanvasRef} className="smm-particles" />
      </div>

      <div className="panel smm-toolbar">
        <h1>SquishyMind</h1>
        {!readonly && (
          <>
            <button
              className="tb-btn"
              data-tb="add"
              title="Add child to selected node (Tab)"
            >
              + Child
            </button>
            <button
              className="tb-btn"
              data-tb="sibling"
              title="Add sibling to selected node (Enter)"
            >
              + Sibling
            </button>
            <span className="tb-sep" />
          </>
        )}
        <button
          className="tb-btn icon"
          data-tb="fit"
          title="Fit to screen (F)"
        >
          Fit
        </button>
        <button
          className="tb-btn icon"
          data-tb="center"
          title="Center on root (Home)"
        >
          Center
        </button>
        <span className="tb-zoom" ref={zoomLabelRef}>
          100%
        </span>
        {!readonly && (
          <>
            <span className="tb-sep" />
            <button className="tb-btn icon" data-tb="export" title="Export JSON">
              Export
            </button>
            <button className="tb-btn icon" data-tb="import" title="Import JSON">
              Import
            </button>
            <button className="tb-btn icon" data-tb="clear" title="Clear all">
              Reset
            </button>
          </>
        )}
        <span className="tb-sep" />
        <button
          id="smm-mute-btn"
          className="tb-btn icon"
          data-tb="mute"
          title="Mute / unmute sound effects"
        >
          🔊
        </button>
        <span className="tb-sep" />
        <div
          className="theme-dot active"
          data-theme="aurora"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
          title="Aurora"
        />
        <div
          className="theme-dot"
          data-theme="sunrise"
          style={{ background: 'linear-gradient(135deg, #ff6b6b, #f59e0b)' }}
          title="Sunrise"
        />
        <div
          className="theme-dot"
          data-theme="forest"
          style={{ background: 'linear-gradient(135deg, #4ade80, #22d3ee)' }}
          title="Forest"
        />
        <div
          className="theme-dot"
          data-theme="mono"
          style={{ background: 'linear-gradient(135deg, #18181b, #71717a)' }}
          title="Mono"
        />
      </div>

      {infoVisible ? (
        <div className="panel smm-info">
          <button
            className="smm-info-close"
            title="Hide shortcuts"
            onClick={() => setInfoVisible(false)}
          >
            ✕
          </button>
          <div>
            <b>Drag</b> empty space to pan · <b>Scroll</b> to zoom
          </div>
          <div>
            <b>Click</b> a node to select · <b>Double-click</b> to edit
          </div>
          <div>
            <kbd>Tab</kbd> add child · <kbd>Enter</kbd> sibling ·{' '}
            <kbd>Del</kbd> remove
          </div>
          <div>
            <kbd>F</kbd> fit · <kbd>Home</kbd> center · <kbd>Esc</kbd>{' '}
            deselect
          </div>
        </div>
      ) : (
        <button
          className="smm-info-toggle"
          onClick={() => setInfoVisible(true)}
        >
          ⌨ shortcuts
        </button>
      )}

      <div className="panel smm-minimap">
        <canvas ref={minimapCanvasRef} className="smm-minimap-canvas" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
      />

      <style jsx>{`
        .smm-root {
          /* aurora palette (default) */
          --bg-1: #0a0b16;
          --bg-2: #0f1124;
          --grid: rgba(139, 92, 246, 0.07);
          --grid-strong: rgba(139, 92, 246, 0.14);
          --node-bg: #1a1d35;
          --node-bg-2: #232649;
          --node-border: rgba(255, 255, 255, 0.08);
          --node-text: #e8eaff;
          --node-shadow: rgba(0, 0, 0, 0.45);
          --accent-1: #8b5cf6;
          --accent-2: #06b6d4;
          --accent-3: #ec4899;
          --accent-4: #f59e0b;
          --accent-5: #10b981;
          --edge: rgba(139, 92, 246, 0.55);
          --selection: #a78bfa;
          --ui-bg: rgba(15, 17, 36, 0.78);
          --ui-border: rgba(255, 255, 255, 0.08);
          --ui-text: rgba(232, 234, 255, 0.92);
          --ui-text-dim: rgba(232, 234, 255, 0.55);

          position: absolute;
          inset: 0;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI',
            sans-serif;
          color: var(--node-text);
          background:
            radial-gradient(circle at 20% 0%, var(--bg-2) 0%, var(--bg-1) 50%),
            radial-gradient(circle at 80% 100%, var(--bg-2) 0%, var(--bg-1) 50%);
          user-select: none;
          -webkit-user-select: none;
        }
        .smm-root[data-theme='sunrise'] {
          --bg-1: #fff5ef;
          --bg-2: #ffe9da;
          --grid: rgba(217, 119, 87, 0.08);
          --grid-strong: rgba(217, 119, 87, 0.16);
          --node-bg: #ffffff;
          --node-bg-2: #fff7f1;
          --node-border: rgba(60, 30, 10, 0.08);
          --node-text: #2a1a0e;
          --node-shadow: rgba(180, 80, 30, 0.18);
          --accent-1: #ff6b6b;
          --accent-2: #f59e0b;
          --accent-3: #ec4899;
          --accent-4: #14b8a6;
          --accent-5: #6366f1;
          --edge: rgba(217, 119, 87, 0.55);
          --selection: #ff6b6b;
          --ui-bg: rgba(255, 245, 235, 0.85);
          --ui-border: rgba(60, 30, 10, 0.1);
          --ui-text: #2a1a0e;
          --ui-text-dim: rgba(42, 26, 14, 0.55);
        }
        .smm-root[data-theme='forest'] {
          --bg-1: #0e1612;
          --bg-2: #14201b;
          --grid: rgba(74, 222, 128, 0.07);
          --grid-strong: rgba(74, 222, 128, 0.14);
          --node-bg: #1a2620;
          --node-bg-2: #233029;
          --node-border: rgba(255, 255, 255, 0.08);
          --node-text: #e8f3ec;
          --node-shadow: rgba(0, 0, 0, 0.45);
          --accent-1: #4ade80;
          --accent-2: #22d3ee;
          --accent-3: #facc15;
          --accent-4: #fb7185;
          --accent-5: #a78bfa;
          --edge: rgba(74, 222, 128, 0.55);
          --selection: #4ade80;
          --ui-bg: rgba(20, 32, 27, 0.78);
          --ui-border: rgba(255, 255, 255, 0.08);
          --ui-text: rgba(232, 243, 236, 0.92);
          --ui-text-dim: rgba(232, 243, 236, 0.55);
        }
        .smm-root[data-theme='mono'] {
          --bg-1: #f7f7f8;
          --bg-2: #ececef;
          --grid: rgba(0, 0, 0, 0.05);
          --grid-strong: rgba(0, 0, 0, 0.1);
          --node-bg: #ffffff;
          --node-bg-2: #fafafa;
          --node-border: rgba(0, 0, 0, 0.08);
          --node-text: #18181b;
          --node-shadow: rgba(0, 0, 0, 0.12);
          --accent-1: #18181b;
          --accent-2: #52525b;
          --accent-3: #a1a1aa;
          --accent-4: #71717a;
          --accent-5: #3f3f46;
          --edge: rgba(0, 0, 0, 0.35);
          --selection: #18181b;
          --ui-bg: rgba(255, 255, 255, 0.85);
          --ui-border: rgba(0, 0, 0, 0.08);
          --ui-text: #18181b;
          --ui-text-dim: rgba(24, 24, 27, 0.55);
        }

        .smm-root :global(*) {
          box-sizing: border-box;
        }

        .smm-stage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          cursor: grab;
        }
        .smm-stage:global(.panning) {
          cursor: grabbing;
        }

        .smm-grid {
          position: absolute;
          width: 200vw;
          height: 200vh;
          left: -50vw;
          top: -50vh;
          background-image:
            radial-gradient(circle, var(--grid) 1px, transparent 1.5px),
            radial-gradient(circle, var(--grid-strong) 1px, transparent 2px);
          background-size:
            30px 30px,
            150px 150px;
          background-position:
            0 0,
            0 0;
          pointer-events: none;
          transition: background-image 0.4s ease;
        }

        .smm-world {
          position: absolute;
          left: 50%;
          top: 50%;
          transform-origin: 0 0;
          will-change: transform;
        }

        .smm-edges {
          position: absolute;
          overflow: visible;
          pointer-events: none;
        }

        .smm-root :global(.node) {
          position: absolute;
          transform: translate(-50%, -50%);
          background:
            linear-gradient(
              180deg,
              color-mix(
                  in srgb,
                  var(--accent-c1, var(--accent-1)) 32%,
                  var(--node-bg)
                )
                0%,
              var(--node-bg-2) 70%
            );
          color: var(--node-text);
          padding: 12px 18px;
          border-radius: 14px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--accent-c1, var(--accent-1)) 40%,
              var(--node-border)
            );
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 12px 28px var(--node-shadow),
            0 2px 6px var(--node-shadow),
            0 0 18px
              color-mix(
                in srgb,
                var(--accent-c1, var(--accent-1)) 22%,
                transparent
              );
          cursor: pointer;
          transition:
            transform 0.18s cubic-bezier(0.2, 0.7, 0.3, 1.4),
            box-shadow 0.2s ease,
            border-color 0.2s ease;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.35;
          max-width: 220px;
          min-width: 80px;
          text-align: center;
          white-space: pre-wrap;
          word-wrap: break-word;
          animation: smm-breathe 4.5s ease-in-out infinite;
        }
        .smm-root :global(.node::before) {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            var(--accent-c1, var(--accent-1)),
            var(--accent-c2, var(--accent-2))
          );
          opacity: 0;
          z-index: -1;
          filter: blur(14px);
          transition: opacity 0.25s ease;
          animation: smm-blobMorph 8s ease-in-out infinite;
        }
        .smm-root :global(.node:hover) {
          transform: translate(-50%, -50%) scale(1.07) rotate(-0.5deg);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 0 0 1px rgba(255, 255, 255, 0.04) inset,
            0 18px 40px var(--node-shadow),
            0 4px 10px var(--node-shadow),
            0 0 0 4px rgba(167, 139, 250, 0.06);
          border-color: rgba(255, 255, 255, 0.16);
        }
        .smm-root :global(.node:hover::before) {
          opacity: 0.55;
        }
        .smm-root :global(.node:active:not(.dragging)) {
          transform: translate(-50%, -50%) scale(0.94);
          transition: transform 0.08s ease-out;
        }
        .smm-root :global(.node.selected) {
          border-color: var(--selection);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 0 0 1px rgba(255, 255, 255, 0.04) inset,
            0 18px 40px var(--node-shadow),
            0 0 0 3px color-mix(in srgb, var(--selection) 35%, transparent),
            0 0 24px color-mix(in srgb, var(--selection) 25%, transparent);
          animation: smm-pulse 2.4s ease-in-out infinite;
        }
        .smm-root :global(.node.drop-target) {
          outline: 2px dashed var(--selection);
          outline-offset: 6px;
          transition: outline 0.12s ease;
        }
        @keyframes smm-pulse {
          0%,
          100% {
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.06) inset,
              0 18px 40px var(--node-shadow),
              0 0 0 3px color-mix(in srgb, var(--selection) 30%, transparent),
              0 0 24px color-mix(in srgb, var(--selection) 20%, transparent);
          }
          50% {
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.06) inset,
              0 18px 40px var(--node-shadow),
              0 0 0 5px color-mix(in srgb, var(--selection) 40%, transparent),
              0 0 36px color-mix(in srgb, var(--selection) 35%, transparent);
          }
        }
        .smm-root :global(.node.dragging) {
          transition: none !important;
          cursor: grabbing;
          opacity: 0.92;
        }
        .smm-root :global(.node.editing) {
          cursor: text;
        }
        .smm-root :global(.node.entering) {
          animation: smm-nodeEnter 0.4s cubic-bezier(0.2, 0.7, 0.3, 1.4) both;
        }
        @keyframes smm-nodeEnter {
          0% {
            transform: translate(-50%, -50%) scale(0.2) rotate(-12deg);
            opacity: 0;
          }
          60% {
            transform: translate(-50%, -50%) scale(1.18) rotate(3deg);
            opacity: 1;
          }
          80% {
            transform: translate(-50%, -50%) scale(0.94) rotate(-1deg);
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
        }

        .smm-root :global(.node[data-depth='0']) {
          font-size: 17px;
          font-weight: 600;
          padding: 14px 22px;
          background: linear-gradient(
            135deg,
            var(--accent-1),
            var(--accent-3)
          );
          border-color: rgba(255, 255, 255, 0.18);
          color: white;
          --accent-c1: var(--accent-1);
          --accent-c2: var(--accent-3);
        }
        .smm-root :global(.node[data-depth='1']) {
          --accent-c1: var(--accent-1);
          --accent-c2: var(--accent-2);
        }
        .smm-root :global(.node[data-depth='2']) {
          --accent-c1: var(--accent-2);
          --accent-c2: var(--accent-3);
        }
        .smm-root :global(.node[data-depth='3']) {
          --accent-c1: var(--accent-3);
          --accent-c2: var(--accent-4);
        }
        .smm-root :global(.node[data-depth='4']) {
          --accent-c1: var(--accent-4);
          --accent-c2: var(--accent-5);
        }
        .smm-root :global(.node[data-depth='5']) {
          --accent-c1: var(--accent-5);
          --accent-c2: var(--accent-1);
        }

        .smm-root :global(.node-edit) {
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font: inherit;
          text-align: center;
          width: 100%;
          resize: none;
          overflow: hidden;
          padding: 0;
          margin: 0;
        }

        .smm-root :global(.add-handle) {
          position: absolute;
          top: 50%;
          right: -10px;
          transform: translate(50%, -50%) scale(0);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--selection);
          color: var(--bg-1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          line-height: 1;
          cursor: grab;
          box-shadow:
            0 4px 12px var(--node-shadow),
            0 0 0 3px color-mix(in srgb, var(--selection) 25%, transparent);
          transition:
            transform 0.18s cubic-bezier(0.2, 0.7, 0.3, 1.4),
            background 0.15s;
          z-index: 5;
        }
        .smm-root :global(.add-handle:active) {
          cursor: grabbing;
        }
        .smm-root :global(.node.selected .add-handle),
        .smm-root :global(.node:hover .add-handle) {
          transform: translate(50%, -50%) scale(1);
        }
        .smm-root :global(.add-handle:hover) {
          background: color-mix(in srgb, var(--selection) 80%, white);
        }

        .smm-root :global(.edge-path) {
          fill: none;
          stroke: var(--edge);
          stroke-width: 2;
          stroke-linecap: round;
          transition:
            stroke-width 0.18s ease,
            opacity 0.18s ease,
            stroke 0.18s ease;
          opacity: 0.7;
        }
        .smm-root :global(.edge-path.highlight) {
          stroke: var(--selection);
          stroke-width: 2.5;
          opacity: 1;
        }
        @keyframes smm-flow {
          to {
            stroke-dashoffset: -24;
          }
        }
        .smm-root :global(.edge-ghost) {
          fill: none;
          stroke: var(--selection);
          stroke-width: 2.5;
          stroke-dasharray: 6 5;
          stroke-linecap: round;
          opacity: 0.85;
          animation: smm-flow 0.7s linear infinite;
          pointer-events: none;
        }

        @keyframes smm-breathe {
          0%,
          100% {
            filter: brightness(1) saturate(1);
          }
          50% {
            filter: brightness(1.08) saturate(1.1);
          }
        }
        @keyframes smm-blobMorph {
          0% {
            border-radius: 42% 58% 50% 50% / 50% 45% 55% 50%;
          }
          33% {
            border-radius: 55% 45% 60% 40% / 40% 60% 40% 60%;
          }
          66% {
            border-radius: 45% 55% 40% 60% / 55% 40% 60% 45%;
          }
          100% {
            border-radius: 42% 58% 50% 50% / 50% 45% 55% 50%;
          }
        }
        .smm-root :global(.node.dropped) {
          animation:
            smm-dropBounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both,
            smm-breathe 4.5s ease-in-out infinite 0.55s;
        }
        @keyframes smm-dropBounce {
          0% {
            transform: translate(-50%, -50%) scale(1, 1);
          }
          20% {
            transform: translate(-50%, -50%) scale(1.18, 0.82);
          }
          45% {
            transform: translate(-50%, -50%) scale(0.88, 1.12);
          }
          70% {
            transform: translate(-50%, -50%) scale(1.04, 0.96);
          }
          100% {
            transform: translate(-50%, -50%) scale(1, 1);
          }
        }

        /* Brain */
        .smm-root :global(.is-brain) {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .smm-root :global(.is-brain::before) {
          display: none !important;
        }
        .smm-root :global(.is-brain:hover) {
          transform: translate(-50%, -50%) scale(1.05) rotate(0deg);
          box-shadow: none !important;
        }
        .smm-root :global(.is-brain.selected) {
          animation: none;
        }
        .smm-root :global(.brain-svg-wrap) {
          width: 150px;
          line-height: 0;
          filter: drop-shadow(0 0 14px rgba(255, 130, 170, 0.45))
            drop-shadow(
              0 0 28px color-mix(in srgb, var(--accent-3) 50%, transparent)
            );
          animation: smm-brainWobble 3.6s ease-in-out infinite;
          transform-origin: 50% 60%;
        }
        .smm-root :global(.brain-svg) {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        .smm-root :global(.brain-img) {
          width: 100%;
          height: auto;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }
        .smm-root :global(.is-brain.selected .brain-svg-wrap) {
          filter: drop-shadow(0 0 22px rgba(255, 130, 170, 0.85))
            drop-shadow(
              0 0 44px color-mix(in srgb, var(--accent-1) 70%, transparent)
            );
        }
        @keyframes smm-brainWobble {
          0%,
          100% {
            transform: scale(1) rotate(0deg) skewX(0deg);
          }
          20% {
            transform: scale(1.08) rotate(-4deg) skewX(2deg);
          }
          40% {
            transform: scale(1.03) rotate(2deg) skewX(-1deg);
          }
          60% {
            transform: scale(1.1) rotate(3deg) skewX(1deg);
          }
          80% {
            transform: scale(1.04) rotate(-2deg) skewX(-2deg);
          }
        }
        .smm-root :global(.brain-label) {
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.6px;
          color: var(--ui-text);
          text-transform: uppercase;
          opacity: 0.85;
          text-shadow: 0 0 12px
            color-mix(in srgb, var(--accent-3) 50%, transparent);
          padding: 4px 10px;
          border-radius: 6px;
          transition: opacity 0.15s, background 0.15s;
        }
        .smm-root :global(.brain-label-clickable) {
          cursor: text;
        }
        .smm-root :global(.brain-label-clickable:hover) {
          opacity: 1;
          background: color-mix(in srgb, var(--ui-text) 8%, transparent);
        }
        .smm-root :global(.brain-aura) {
          position: absolute;
          width: 120px;
          height: 90px;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -55%);
          border-radius: 50%;
          pointer-events: none;
          z-index: -1;
          animation: smm-brainPulseRing 2.6s cubic-bezier(0.4, 0, 0.6, 1)
            infinite;
        }
        .smm-root :global(.brain-aura::after) {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: smm-brainPulseRing 2.6s cubic-bezier(0.4, 0, 0.6, 1)
            infinite 1.3s;
          box-shadow: inherit;
        }
        @keyframes smm-brainPulseRing {
          0% {
            box-shadow:
              0 0 0 0 color-mix(in srgb, var(--accent-1) 70%, transparent),
              0 0 0 0 color-mix(in srgb, var(--accent-3) 50%, transparent);
          }
          100% {
            box-shadow:
              0 0 0 24px color-mix(in srgb, var(--accent-1) 0%, transparent),
              0 0 0 48px color-mix(in srgb, var(--accent-3) 0%, transparent);
          }
        }
        .smm-root :global(.is-brain .add-handle) {
          right: -22px;
        }

        /* Action chip */
        .smm-root :global(.action-chip) {
          position: absolute;
          transform: translate(-50%, 0);
          display: flex;
          gap: 4px;
          padding: 5px;
          background: var(--ui-bg);
          border: 1px solid var(--ui-border);
          border-radius: 24px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 6;
          animation: smm-chipIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          pointer-events: auto;
        }
        @keyframes smm-chipIn {
          0% {
            transform: translate(-50%, -8px) scale(0.7);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, 0) scale(1);
            opacity: 1;
          }
        }
        .smm-root :global(.action-chip button) {
          background: transparent;
          border: none;
          color: var(--ui-text);
          font-size: 14px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition:
            background 0.15s,
            transform 0.15s;
        }
        .smm-root :global(.action-chip button:hover) {
          background: color-mix(in srgb, var(--selection) 25%, transparent);
          transform: scale(1.12);
        }

        /* Detail mode dim */
        .smm-root.in-detail-mode :global(.smm-grid),
        .smm-root.in-detail-mode .smm-grid,
        .smm-root.in-detail-mode :global(.smm-particles),
        .smm-root.in-detail-mode .smm-particles,
        .smm-root.in-detail-mode :global(.edge-path),
        .smm-root.in-detail-mode :global(.node:not(.in-detail)) {
          opacity: 0.18;
          filter: blur(2px);
          pointer-events: none;
          transition:
            opacity 0.3s ease,
            filter 0.3s ease;
        }
        .smm-root :global(.node) {
          /* base transition for fade out of detail */
        }
        .smm-root:not(.in-detail-mode) :global(.node) {
          transition:
            opacity 0.3s ease,
            filter 0.3s ease;
        }

        .smm-root :global(.node.in-detail) {
          width: 360px;
          min-width: 320px;
          max-width: 360px;
          padding: 16px 18px !important;
          cursor: default;
          z-index: 100;
          animation: none !important;
          transform: translate(-50%, -50%) !important;
        }
        .smm-root :global(.node.in-detail:hover) {
          transform: translate(-50%, -50%) !important;
        }
        .smm-root :global(.node.in-detail .add-handle) {
          display: none;
        }
        .smm-root :global(.is-brain.in-detail) {
          background: linear-gradient(
            180deg,
            var(--node-bg) 0%,
            var(--node-bg-2) 100%
          ) !important;
          border: 1px solid var(--node-border) !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.04) inset,
            0 12px 28px var(--node-shadow),
            0 2px 6px var(--node-shadow) !important;
          padding: 16px 18px !important;
        }
        .smm-root :global(.is-brain.in-detail .brain-svg-wrap),
        .smm-root :global(.is-brain.in-detail .brain-aura),
        .smm-root :global(.is-brain.in-detail .brain-label) {
          display: none !important;
        }

        .smm-root :global(.detail-content) {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: stretch;
          position: relative;
          width: 100%;
          text-align: left;
        }
        .smm-root :global(.detail-close) {
          position: absolute;
          top: -4px;
          right: -4px;
          background: transparent;
          border: none;
          color: var(--node-text);
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 4px 6px;
          opacity: 0.55;
          transition: opacity 0.15s;
          z-index: 2;
        }
        .smm-root :global(.detail-close:hover) {
          opacity: 1;
        }
        .smm-root :global(.detail-label) {
          background: transparent;
          border: none;
          outline: none;
          color: var(--node-text);
          font-size: 17px;
          font-weight: 600;
          font-family: inherit;
          padding: 4px 0;
          border-bottom: 1px solid var(--node-border);
          margin-right: 22px;
          width: calc(100% - 22px);
        }
        .smm-root :global(.detail-label:focus) {
          border-bottom-color: var(--selection);
        }
        .smm-root :global(.detail-section-label) {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--ui-text-dim);
          margin-top: 4px;
          font-weight: 500;
        }
        .smm-root :global(.detail-note) {
          background: color-mix(in srgb, var(--node-bg) 70%, black 12%);
          border: 1px solid var(--node-border);
          border-radius: 8px;
          padding: 8px 10px;
          color: var(--node-text);
          font-family: inherit;
          font-size: 13px;
          line-height: 1.55;
          resize: vertical;
          min-height: 90px;
          max-height: 280px;
          outline: none;
          box-sizing: border-box;
          width: 100%;
        }
        .smm-root :global(.detail-note:focus) {
          border-color: color-mix(in srgb, var(--selection) 60%, transparent);
        }
        .smm-root :global(.detail-note::placeholder) {
          color: var(--ui-text-dim);
        }
        .smm-root :global(.detail-colors) {
          display: flex;
          gap: 8px;
        }
        .smm-root :global(.color-dot) {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
          transition:
            transform 0.12s,
            border-color 0.12s;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        .smm-root :global(.color-dot:hover) {
          transform: scale(1.18);
        }
        .smm-root :global(.color-dot.active) {
          border-color: var(--node-text);
          transform: scale(1.12);
        }
        .smm-root :global(.detail-stubs) {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }
        .smm-root :global(.stub-btn) {
          flex: 1;
          background: transparent;
          border: 1px dashed var(--node-border);
          border-radius: 8px;
          padding: 6px 8px;
          color: var(--ui-text-dim);
          font-size: 11px;
          cursor: not-allowed;
          font-family: inherit;
        }
        .smm-root :global(.stub-btn.ai-btn) {
          border-style: solid;
          border-color: color-mix(in srgb, var(--selection) 35%, var(--node-border));
          color: var(--ui-text);
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
        }
        .smm-root :global(.stub-btn.ai-btn:hover:not(:disabled)) {
          background: color-mix(in srgb, var(--selection) 12%, transparent);
          border-color: var(--selection);
        }
        .smm-root :global(.stub-btn.ai-btn.ai-thinking) {
          animation: aiPulse 1.4s ease-in-out infinite;
        }
        @keyframes aiPulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        .smm-root :global(.ai-error) {
          font-size: 12px;
          color: #fca5a5;
          padding: 6px 8px;
          border: 1px solid rgba(252, 165, 165, 0.3);
          border-radius: 8px;
          background: rgba(252, 165, 165, 0.05);
        }
        .smm-root :global(.ai-panel) {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: color-mix(in srgb, var(--node-bg) 70%, black 12%);
          border: 1px solid var(--node-border);
          border-radius: 10px;
          padding: 10px;
          margin-top: 4px;
          animation: aiPanelIn 0.22s cubic-bezier(.34, 1.56, .64, 1);
        }
        @keyframes aiPanelIn {
          0% { opacity: 0; transform: translateY(-4px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .smm-root :global(.ai-panel-header) {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .smm-root :global(.ai-panel-title) {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: var(--ui-text);
        }
        .smm-root :global(.ai-panel-hint) {
          font-size: 10px;
          color: var(--ui-text-dim);
        }
        .smm-root :global(.ai-panel-list) {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 240px;
          overflow-y: auto;
        }
        .smm-root :global(.ai-panel-item) {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 0.12s;
        }
        .smm-root :global(.ai-panel-item:hover) {
          background: color-mix(in srgb, var(--ui-text) 5%, transparent);
        }
        .smm-root :global(.ai-panel-check) {
          margin-top: 4px;
          flex-shrink: 0;
        }
        .smm-root :global(.ai-panel-check input) {
          accent-color: var(--selection);
        }
        .smm-root :global(.ai-panel-body) {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .smm-root :global(.ai-panel-label) {
          background: transparent;
          border: 1px solid transparent;
          outline: none;
          color: var(--node-text);
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          padding: 2px 4px;
          border-radius: 4px;
          width: 100%;
        }
        .smm-root :global(.ai-panel-label:hover),
        .smm-root :global(.ai-panel-label:focus) {
          border-color: var(--node-border);
          background: color-mix(in srgb, var(--node-bg) 60%, black 8%);
        }
        .smm-root :global(.ai-panel-note) {
          font-size: 11px;
          line-height: 1.45;
          color: var(--ui-text-dim);
          padding: 0 4px;
        }
        .smm-root :global(.ai-panel-actions) {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }
        .smm-root :global(.ai-panel-btn) {
          font-family: inherit;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--ui-border);
          background: transparent;
          color: var(--ui-text);
          transition: background 0.12s, border-color 0.12s;
        }
        .smm-root :global(.ai-panel-btn-ghost:hover) {
          background: color-mix(in srgb, var(--ui-text) 8%, transparent);
        }
        .smm-root :global(.ai-panel-btn-primary) {
          background: var(--selection);
          color: var(--bg-1);
          border-color: var(--selection);
          font-weight: 600;
        }
        .smm-root :global(.ai-panel-btn-primary:hover:not(:disabled)) {
          background: color-mix(in srgb, var(--selection) 85%, white);
        }
        .smm-root :global(.ai-panel-btn-primary:disabled) {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Image attachments */
        .smm-root :global(.node-thumb) {
          display: block;
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 10px;
          margin: -2px auto 6px;
          border: 1px solid color-mix(in srgb, var(--accent-c1, var(--accent-1)) 35%, var(--node-border));
          box-shadow: 0 2px 6px var(--node-shadow);
          background: color-mix(in srgb, var(--node-bg) 80%, black 8%);
        }
        .smm-root :global(.node-label) {
          display: block;
        }
        .smm-root :global(.detail-image-holder) {
          position: relative;
          display: flex;
          justify-content: center;
        }
        .smm-root :global(.detail-image-holder:empty) {
          display: none;
        }
        .smm-root :global(.detail-image) {
          display: block;
          max-width: 100%;
          max-height: 240px;
          border-radius: 10px;
          border: 1px solid var(--node-border);
          box-shadow: 0 2px 6px var(--node-shadow);
          background: color-mix(in srgb, var(--node-bg) 80%, black 8%);
        }
        .smm-root :global(.detail-image-del) {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.55);
          color: white;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, transform 0.15s;
          padding: 0;
        }
        .smm-root :global(.detail-image-del:hover) {
          background: rgba(0, 0, 0, 0.78);
          transform: scale(1.08);
        }
        .smm-root :global(.detail-content.dropzone-hover) {
          outline: 2px dashed color-mix(in srgb, var(--selection) 60%, transparent);
          outline-offset: 4px;
          border-radius: 8px;
        }

        /* Toolbar */
        .panel {
          position: absolute;
          background: var(--ui-bg);
          border: 1px solid var(--ui-border);
          border-radius: 14px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          color: var(--ui-text);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          z-index: 50;
        }
        .smm-toolbar {
          top: 16px;
          left: 16px;
          padding: 10px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .smm-toolbar h1 {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.3px;
          margin: 0 12px 0 6px;
          background: linear-gradient(
            135deg,
            var(--accent-1),
            var(--accent-2),
            var(--accent-3)
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .tb-btn {
          background: transparent;
          border: 1px solid var(--ui-border);
          border-radius: 9px;
          color: var(--ui-text);
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tb-btn:hover {
          background: color-mix(in srgb, var(--selection) 12%, transparent);
          border-color: color-mix(in srgb, var(--selection) 35%, transparent);
        }
        .tb-btn.icon {
          padding: 7px 9px;
        }
        .tb-sep {
          width: 1px;
          align-self: stretch;
          background: var(--ui-border);
          margin: 0 4px;
        }
        .tb-zoom {
          font-variant-numeric: tabular-nums;
          min-width: 42px;
          text-align: center;
          font-size: 12px;
          color: var(--ui-text-dim);
        }
        .theme-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            border-color 0.15s;
        }
        .theme-dot:hover {
          transform: scale(1.15);
        }
        .theme-dot.active {
          border-color: white;
        }

        /* Info panel */
        .smm-info {
          bottom: 16px;
          left: 16px;
          padding: 12px 14px;
          font-size: 11px;
          line-height: 1.7;
          color: var(--ui-text-dim);
          max-width: 260px;
        }
        .smm-info b {
          color: var(--ui-text);
          font-weight: 500;
        }
        .smm-info kbd {
          background: color-mix(in srgb, var(--ui-text) 8%, transparent);
          border: 1px solid var(--ui-border);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 10px;
          font-family: ui-monospace, 'SF Mono', monospace;
          color: var(--ui-text);
        }
        .smm-info-close {
          position: absolute;
          top: 6px;
          right: 8px;
          background: transparent;
          border: none;
          color: var(--ui-text-dim);
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          padding: 2px 4px;
          border-radius: 4px;
          transition:
            color 0.15s,
            background 0.15s;
        }
        .smm-info-close:hover {
          color: var(--ui-text);
          background: color-mix(in srgb, var(--ui-text) 10%, transparent);
        }
        .smm-info-toggle {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: var(--ui-bg);
          border: 1px solid var(--ui-border);
          border-radius: 10px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          color: var(--ui-text-dim);
          font-size: 11px;
          padding: 6px 10px;
          cursor: pointer;
          transition: color 0.15s;
          z-index: 50;
        }
        .smm-info-toggle:hover {
          color: var(--ui-text);
        }

        /* Minimap */
        .smm-minimap {
          bottom: 16px;
          right: 16px;
          width: 200px;
          height: 140px;
          padding: 0;
          overflow: hidden;
          cursor: pointer;
        }
        .smm-minimap-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Particles */
        .smm-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
        }
      `}</style>
    </div>
  );
}
