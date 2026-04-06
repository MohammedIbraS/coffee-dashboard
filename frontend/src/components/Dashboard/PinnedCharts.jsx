import { useState, useRef } from "react";
import { DynamicChart } from "../Charts/DynamicChart";
import styles from "./PinnedCharts.module.css";

function EditableTitle({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commit = () => { onChange(draft.trim() || value); setEditing(false); };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={styles.titleInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
      />
    );
  }
  return (
    <span className={styles.titleText} onClick={start} title="Click to rename">
      {value}
    </span>
  );
}

export function PinnedCharts({ charts, onDismiss, onClearAll, onReorder, onRename }) {
  const dragIdx = useRef(null);

  if (!charts.length) return null;

  const handleDragStart = (i) => { dragIdx.current = i; };
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const reordered = [...charts];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(i, 0, moved);
    dragIdx.current = i;
    onReorder(reordered);
  };
  const handleDragEnd = () => { dragIdx.current = null; };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>✦ AI Charts ({charts.length})</span>
        <button className={styles.clearAll} onClick={onClearAll}>Clear all</button>
      </div>

      {charts.map(({ id, spec }, i) => (
        <div
          key={id}
          className={styles.card}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardLeft}>
              <span className={styles.dragHandle} title="Drag to reorder">⠿</span>
              <span className={styles.aiLabel}>AI</span>
              {spec.title ? (
                <EditableTitle
                  value={spec.title}
                  onChange={(newTitle) => onRename(id, newTitle)}
                />
              ) : (
                <EditableTitle value="Untitled chart" onChange={(t) => onRename(id, t)} />
              )}
            </div>
            <button className={styles.dismiss} onClick={() => onDismiss(id)}>✕</button>
          </div>
          <div className={styles.cardBody}>
            <DynamicChart spec={spec} height={260} />
          </div>
        </div>
      ))}
    </div>
  );
}
