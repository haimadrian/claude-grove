import React, { useState, useEffect, useRef } from 'react';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import type { FileData, HunkData } from 'react-diff-view';

type ViewType = 'unified' | 'split';

const LS_LAYOUT_KEY = 'claude-grove:diff-layout';
const LS_TREE_WIDTH_KEY = 'claude-grove:tree-width';
function loadTreeWidth(): number {
  try { const v = parseInt(localStorage.getItem(LS_TREE_WIDTH_KEY) ?? '', 10); return isNaN(v) ? 220 : Math.max(120, Math.min(500, v)); } catch { return 220; }
}
function loadLayout(): ViewType {
  try { const v = localStorage.getItem(LS_LAYOUT_KEY); if (v === 'split' || v === 'unified') return v; } catch { /* ignore */ }
  return 'unified';
}

interface Props {
  rawDiff: string;
  ignoreWhitespace?: boolean;
  onIgnoreWhitespaceChange?: (v: boolean) => void;
}

export function DiffViewer({ rawDiff, ignoreWhitespace, onIgnoreWhitespaceChange }: Props): React.JSX.Element {
  const [viewType, setViewType] = useState<ViewType>(loadLayout);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [treeWidth, setTreeWidth] = useState(loadTreeWidth);
  const treeSplitterDragging = useRef(false);
  useEffect(() => { try { localStorage.setItem(LS_LAYOUT_KEY, viewType); } catch { /* ignore */ } }, [viewType]);
  useEffect(() => { try { localStorage.setItem(LS_TREE_WIDTH_KEY, String(treeWidth)); } catch { /* ignore */ } }, [treeWidth]);

  const scrollToFile = (index: number): void => {
    setActiveFileIndex(index);
    document.getElementById(`diff-file-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!rawDiff.trim()) {
    return <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>No diff available.</div>;
  }

  if (rawDiff === '\x00MERGE\x00') {
    return (
      <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Merge commit</div>
        Integrates upstream changes into this branch. No feature-specific diff to display.
      </div>
    );
  }

  let files: FileData[];
  try {
    files = parseDiff(rawDiff);
  } catch {
    return <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>Failed to parse diff.</div>;
  }

  const totalAdds = files.reduce((n, f) => n + f.hunks.reduce((m, h) => m + h.changes.filter((c) => c.type === 'insert').length, 0), 0);
  const totalDels = files.reduce((n, f) => n + f.hunks.reduce((m, h) => m + h.changes.filter((c) => c.type === 'delete').length, 0), 0);

  const diffContent = (
    <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
      <div style={{ padding: '4px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          <span style={{ color: 'var(--ok)' }}>+{totalAdds}</span>
          <span style={{ color: 'var(--danger)' }}>−{totalDels}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={ignoreWhitespace ?? false}
              onChange={(e) => onIgnoreWhitespaceChange?.(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            Ignore whitespace
          </label>
          <div style={{ display: 'flex', borderRadius: 5, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {(['unified', 'split'] as ViewType[]).map((vt) => (
              <button
                key={vt}
                onClick={() => setViewType(vt)}
                style={{
                  fontSize: 11, padding: '3px 10px', border: 'none', cursor: 'pointer',
                  borderLeft: vt === 'split' ? '1px solid var(--border)' : undefined,
                  background: viewType === vt ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: viewType === vt ? 'var(--bg)' : 'var(--fg)',
                  textTransform: 'capitalize',
                }}
              >
                {vt}
              </button>
            ))}
          </div>
        </div>
      </div>
      {files.map((file, i) => (
        <FileSection key={i} id={`diff-file-${i}`} file={file} viewType={viewType} />
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontSize: 13, fontFamily: 'monospace' }}>
      <DiffFileTree
        files={files}
        activeIndex={activeFileIndex}
        onSelect={scrollToFile}
        width={treeWidth}
      />
      {/* Tree splitter */}
      <div
        style={{
          width: 8,
          flexShrink: 0,
          cursor: 'col-resize',
          background: 'var(--border)',
          transition: 'background 0.1s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--accent)'; }}
        onMouseLeave={(e) => { if (!treeSplitterDragging.current) (e.currentTarget as HTMLDivElement).style.background = 'var(--border)'; }}
        onMouseDown={(e) => {
          e.preventDefault();
          treeSplitterDragging.current = true;
          const startX = e.clientX;
          const startW = treeWidth;
          const el = e.currentTarget as HTMLDivElement;
          el.style.background = 'var(--accent)';
          const onMove = (ev: MouseEvent): void => {
            setTreeWidth(Math.max(120, Math.min(500, startW + ev.clientX - startX)));
          };
          const onUp = (): void => {
            treeSplitterDragging.current = false;
            el.style.background = 'var(--border)';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--fg-muted)', opacity: 0.45 }} />
          ))}
        </div>
      </div>
      {diffContent}
    </div>
  );
}

function FileSection({ id, file, viewType }: { id?: string; file: FileData; viewType: ViewType }): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [viewed, setViewed] = useState(false);
  const adds = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'insert').length, 0);
  const dels = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'delete').length, 0);
  const name = file.newPath || file.oldPath || 'unknown';

  return (
    <div id={id} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', opacity: viewed ? 0.55 : 1 }}>
      <div
        style={{
          padding: '6px 10px', background: 'var(--bg-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <input
          type="checkbox"
          checked={viewed}
          title="Mark as viewed"
          style={{ cursor: 'pointer', accentColor: 'var(--ok)', flexShrink: 0 }}
          onChange={(e) => {
            e.stopPropagation();
            const next = e.target.checked;
            setViewed(next);
            if (next) setCollapsed(true);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <span style={{ fontWeight: 500, color: viewed ? 'var(--fg-muted)' : undefined, textDecoration: viewed ? 'line-through' : undefined }}>{name}</span>
        <span style={{ color: 'var(--ok)' }}>+{adds}</span>
        <span style={{ color: 'var(--danger)' }}>-{dels}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-muted)' }}>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <Diff viewType={viewType} diffType={file.type} hunks={file.hunks}>
            {(hunks: HunkData[]) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
          </Diff>
        </div>
      )}
    </div>
  );
}

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  fileIndex?: number;
  adds?: number;
  dels?: number;
}

function buildFileTree(files: FileData[]): TreeNode {
  const root: TreeNode = { name: '', children: new Map() };
  files.forEach((file, i) => {
    const path = file.newPath || file.oldPath || 'unknown';
    const parts = path.split('/');
    let node = root;
    parts.forEach((part, pi) => {
      if (pi === parts.length - 1) {
        const adds = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'insert').length, 0);
        const dels = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'delete').length, 0);
        node.children.set(part, { name: part, children: new Map(), fileIndex: i, adds, dels });
      } else {
        if (!node.children.has(part)) {
          node.children.set(part, { name: part, children: new Map() });
        }
        node = node.children.get(part)!;
      }
    });
  });
  return root;
}

function DiffFileTree({ files, activeIndex, onSelect, width }: { files: FileData[]; activeIndex: number | null; onSelect: (i: number) => void; width: number }): React.JSX.Element {
  const tree = React.useMemo(() => buildFileTree(files), [files]);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const toggleFolder = (path: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) { next.delete(path); } else { next.add(path); }
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number, path: string): React.ReactNode => {
    const entries = [...node.children.entries()].sort(([aName, aNode], [bName, bNode]) => {
      const aIsFile = aNode.fileIndex !== undefined;
      const bIsFile = bNode.fileIndex !== undefined;
      if (aIsFile !== bIsFile) { return aIsFile ? 1 : -1; }
      return aName.localeCompare(bName);
    });

    return entries.map(([name, child]) => {
      const childPath = path ? `${path}/${name}` : name;
      const isFile = child.fileIndex !== undefined;
      const isCollapsed = collapsed.has(childPath);
      const isActive = isFile && child.fileIndex === activeIndex;

      if (isFile) {
        return (
          <div
            key={childPath}
            onClick={() => onSelect(child.fileIndex!)}
            title={childPath}
            style={{
              paddingLeft: depth * 12 + 8,
              paddingTop: 3,
              paddingBottom: 3,
              paddingRight: 8,
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: isActive ? 'var(--accent-muted)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              color: isActive ? 'var(--accent)' : 'var(--fg)',
            }}
            onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isActive ? 'var(--accent-muted)' : 'transparent'; }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
            {child.adds !== undefined && child.adds > 0 && (
              <span style={{ color: 'var(--ok)', flexShrink: 0 }}>+{child.adds}</span>
            )}
            {child.dels !== undefined && child.dels > 0 && (
              <span style={{ color: 'var(--danger)', flexShrink: 0 }}>-{child.dels}</span>
            )}
          </div>
        );
      }

      return (
        <div key={childPath}>
          <div
            onClick={() => toggleFolder(childPath)}
            style={{
              paddingLeft: depth * 12 + 4,
              paddingTop: 3,
              paddingBottom: 3,
              paddingRight: 8,
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--fg-muted)',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 9, flexShrink: 0 }}>{isCollapsed ? '▶' : '▼'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          </div>
          {!isCollapsed && renderNode(child, depth + 1, childPath)}
        </div>
      );
    });
  };

  return (
    <div style={{
      width,
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      borderRight: '1px solid var(--border)',
      background: 'var(--bg)',
      paddingTop: 6,
      paddingBottom: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-muted)', padding: '2px 10px 6px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        Files changed
      </div>
      {renderNode(tree, 0, '')}
    </div>
  );
}
