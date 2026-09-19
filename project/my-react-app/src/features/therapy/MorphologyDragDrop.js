import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';

// ─────────────────────────────────────────────────────────────────
// MORPHOLOGY DRAG & DROP DATA POOL
// ─────────────────────────────────────────────────────────────────
const morphologyDragPool = [
  { prefix: 'Un', root: 'happy', suffix: '', target: 'Unhappy', instruction: 'Build a word meaning "not happy"', distractors: ['Re', 'play', '-ness'] },
  { prefix: 'Re', root: 'play', suffix: '', target: 'Replay', instruction: 'Build a word meaning "play again"', distractors: ['Un', 'read', '-ful'] },
  { prefix: '', root: 'Play', suffix: '-er', target: 'Player', instruction: 'Build a word for "someone who plays"', distractors: ['Un', 'read', '-ful'] },
  { prefix: '', root: 'Care', suffix: '-ful', target: 'Careful', instruction: 'Build a word meaning "full of care"', distractors: ['Re', 'hope', '-less'] },
  { prefix: '', root: 'Hope', suffix: '-less', target: 'Hopeless', instruction: 'Build a word meaning "without hope"', distractors: ['Un', 'care', '-ful'] },
  { prefix: 'Un', root: 'lock', suffix: '', target: 'Unlock', instruction: 'Build a word meaning "open a lock"', distractors: ['Re', 'play', '-ed'] },
  { prefix: 'Re', root: 'build', suffix: '', target: 'Rebuild', instruction: 'Build a word meaning "build again"', distractors: ['Un', 'form', '-ing'] },
  { prefix: '', root: 'Read', suffix: '-able', target: 'Readable', instruction: 'Build a word meaning "can be read"', distractors: ['Un', 'write', '-ful'] },
  { prefix: '', root: 'Act', suffix: '-or', target: 'Actor', instruction: 'Build a word for "a person who acts"', distractors: ['Re', 'sing', '-ment'] },
  { prefix: 'Pre', root: 'view', suffix: '', target: 'Preview', instruction: 'Build a word meaning "to view beforehand"', distractors: ['Un', 'read', '-ful'] },
  { prefix: '', root: 'Create', suffix: '-ive', target: 'Creative', instruction: 'Build a word meaning "having ability to create"', distractors: ['Re', 'move', '-ment'] },
  { prefix: 'Mis', root: 'read', suffix: '', target: 'Misread', instruction: 'Build a word meaning "to read incorrectly"', distractors: ['Un', 'play', '-ed'] },
  { prefix: '', root: 'Flex', suffix: '-ible', target: 'Flexible', instruction: 'Build a word meaning "able to bend"', distractors: ['Re', 'act', '-or'] },
  { prefix: 'In', root: 'direct', suffix: '', target: 'Indirect', instruction: 'Build a word meaning "not direct"', distractors: ['Un', 'sign', '-ture'] },
  { prefix: '', root: 'Move', suffix: '-ment', target: 'Movement', instruction: 'Build a word meaning "the act of moving"', distractors: ['Re', 'flex', '-ible'] },
];

const shuffleArray = (arr) => {
  const n = [...arr];
  for (let i = n.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [n[i], n[j]] = [n[j], n[i]];
  }
  return n;
};

const getRandomItems = (arr, count) => shuffleArray(arr).slice(0, count);

// ─────────────────────────────────────────────────────────────────
// MORPHOLOGY DRAG & DROP COMPONENT
// ─────────────────────────────────────────────────────────────────
const MorphologyDragDrop = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [tasks] = useState(() => getRandomItems(morphologyDragPool, 5));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Slot state: { prefix, root, suffix }
  const [slots, setSlots] = useState({ prefix: null, root: null, suffix: null });
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [shakeSlots, setShakeSlots] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Drag hover highlight state
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Touch drag state
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [touchPos, setTouchPos] = useState(null);
  const slotRefs = useRef({ prefix: null, root: null, suffix: null });

  const task = tasks[currentIdx] || {};

  // Build static available blocks for current task with stable unique IDs
  const availableBlocks = useMemo(() => {
    if (!task.root) return [];
    const parts = [];
    if (task.prefix) parts.push({ id: `p_${task.prefix}`, text: task.prefix, type: 'prefix', correct: true });
    parts.push({ id: `r_${task.root}`, text: task.root, type: 'root', correct: true });
    if (task.suffix) parts.push({ id: `s_${task.suffix}`, text: task.suffix, type: 'suffix', correct: true });
    (task.distractors || []).forEach((d, idx) => {
      const type = d.startsWith('-') ? 'suffix' : d.length <= 3 && d[0] === d[0].toUpperCase() ? 'prefix' : 'root';
      parts.push({ id: `d_${idx}_${d}`, text: d, type, correct: false });
    });
    return shuffleArray(parts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.prefix, task.root, task.suffix, task.distractors]);

  // Determine required slots
  const hasPrefix = !!task.prefix;
  const hasSuffix = !!task.suffix;

  // Which blocks are placed vs in tray
  const placedIds = [slots.prefix?.id, slots.root?.id, slots.suffix?.id].filter(Boolean);
  const draggableBlocks = availableBlocks.filter((b) => !placedIds.includes(b.id));

  // ── Click-to-Place (Tap / Click Fallback) ──
  const handleBlockClick = (block) => {
    if (feedback) return;

    let targetSlot = null;
    if (hasPrefix && !slots.prefix) {
      targetSlot = 'prefix';
    } else if (!slots.root) {
      targetSlot = 'root';
    } else if (hasSuffix && !slots.suffix) {
      targetSlot = 'suffix';
    }

    if (targetSlot) {
      placeBlock(block, targetSlot);
    }
  };

  // ── Remove block from slot ──
  const removeFromSlot = (slotType) => {
    if (feedback) return;
    setSlots((prev) => ({ ...prev, [slotType]: null }));
  };

  // ── HTML5 Drag Handlers ──
  const handleDragStart = (e, block) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(block));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedBlock(block);
  };

  const handleDragOver = (e, slotType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotType) {
      setDragOverSlot(slotType);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverSlot(null);
  };

  const handleDrop = (e, slotType) => {
    e.preventDefault();
    setDragOverSlot(null);
    try {
      const block = JSON.parse(e.dataTransfer.getData('text/plain'));
      placeBlock(block, slotType);
    } catch (err) { /* ignore */ }
    setDraggedBlock(null);
  };

  // ── Touch Drag Handlers ──
  const handleTouchStart = (e, block) => {
    setDraggedBlock(block);
    const touch = e.touches[0];
    setTouchPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e) => {
    if (!draggedBlock) return;
    const touch = e.touches[0];
    setTouchPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!draggedBlock || !touchPos) {
      setDraggedBlock(null);
      setTouchPos(null);
      return;
    }

    const slotTypes = ['prefix', 'root', 'suffix'];
    for (const st of slotTypes) {
      const el = slotRefs.current[st];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        touchPos.x >= rect.left &&
        touchPos.x <= rect.right &&
        touchPos.y >= rect.top &&
        touchPos.y <= rect.bottom
      ) {
        placeBlock(draggedBlock, st);
        break;
      }
    }

    setDraggedBlock(null);
    setTouchPos(null);
  };

  // ── Place block in slot ──
  const placeBlock = useCallback(
    (block, slotType) => {
      setSlots((prev) => {
        const newSlots = { ...prev, [slotType]: block };

        // Check if all required slots are filled
        const requiredFilled =
          (!hasPrefix || newSlots.prefix) &&
          newSlots.root &&
          (!hasSuffix || newSlots.suffix);

        if (requiredFilled) {
          setTimeout(() => validateAnswer(newSlots), 150);
        }

        return newSlots;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPrefix, hasSuffix]
  );

  // ── Validate answer ──
  const validateAnswer = (filledSlots) => {
    const builtWord = [
      filledSlots.prefix?.text || '',
      filledSlots.root?.text || '',
      filledSlots.suffix?.text?.replace('-', '') || '',
    ].join('');

    const targetClean = (task.target || '').toLowerCase();
    const isCorrect = builtWord.toLowerCase() === targetClean;

    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      setScore((s) => s + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    } else {
      setShakeSlots(true);
      setTimeout(() => setShakeSlots(false), 600);
    }

    // Instant/Smooth 1-second transition delay
    setTimeout(() => {
      setFeedback(null);
      if (currentIdx < tasks.length - 1) {
        setCurrentIdx((i) => i + 1);
        setSlots({ prefix: null, root: null, suffix: null });
      } else {
        handleFinish(isCorrect);
      }
    }, isCorrect ? 1000 : 1200);
  };

  const handleFinish = async (lastCorrect) => {
    const finalScore = score + (lastCorrect ? 1 : 0);
    const accuracy = Math.round((finalScore / tasks.length) * 100);
    setFinished(true);
    await saveTherapyProgress(currentUser, 'morphology', finalScore * 100, accuracy, 'Drag & Drop');
  };

  const resetGame = () => {
    setCurrentIdx(0);
    setScore(0);
    setFinished(false);
    setSlots({ prefix: null, root: null, suffix: null });
    setFeedback(null);
  };

  // Block color mapping
  const blockColor = (type) => {
    switch (type) {
      case 'prefix': return { bg: 'rgba(34, 211, 238, 0.18)', border: '#22d3ee', text: '#22d3ee', shadow: '0 0 12px rgba(34,211,238,0.4)' };
      case 'root': return { bg: 'rgba(251, 191, 36, 0.18)', border: '#fbbf24', text: '#fbbf24', shadow: '0 0 12px rgba(251,191,36,0.4)' };
      case 'suffix': return { bg: 'rgba(132, 204, 22, 0.18)', border: '#84cc16', text: '#84cc16', shadow: '0 0 12px rgba(132,204,22,0.4)' };
      default: return { bg: 'rgba(255,255,255,0.05)', border: '#475569', text: '#94a3b8', shadow: 'none' };
    }
  };

  if (finished) {
    const accuracy = Math.round((score / tasks.length) * 100);
    return (
      <div className="exercise-session">
        <div className="exercise-completion-card">
          <div className="completion-trophy">🧩</div>
          <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--lf-primary)', marginBottom: '0.5rem' }}>
            Morphology Builder Complete!
          </h4>
          <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            You correctly built {score} out of {tasks.length} words. Accuracy: {accuracy}%
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={resetGame}>🔄 Practice Again</button>
            <button className="btn-finish" onClick={onComplete}>Complete & View Dashboard →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="exercise-session"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', userSelect: 'none', background: '#0c0e1a', color: '#f3f4f6', padding: '2rem', borderRadius: '20px' }}
    >
      <h3 style={{ color: 'var(--lf-primary)' }}>🧬 Morphology Drag & Drop Builder</h3>
      <p className="exercise-desc" style={{ color: '#94a3b8' }}>
        Click or drag the word parts into the target slots to build the word.
        <span style={{ display: 'block', marginTop: '4px', fontWeight: 700, color: 'var(--lf-primary)' }}>
          Word {currentIdx + 1} of {tasks.length} • Score: {score}
        </span>
      </p>

      {/* Instruction badge */}
      <div className="badge badge-info" style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
        💡 {task.instruction}
      </div>

      {/* Target word display */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--lf-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
          Target Word
        </span>
        <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--lf-text-primary)', letterSpacing: '-0.02em' }}>
          {task.target}
        </span>
      </div>

      {/* ── SNAP SLOTS (Drop Zones) ── */}
      <div
        className={`morph-workspace ${shakeSlots ? 'morph-shake' : ''}`}
        style={{
          display: 'flex', justifyContent: 'center', gap: '16px', padding: '2.2rem 1.5rem',
          background: feedback === 'correct' ? 'rgba(132, 204, 22, 0.08)' : feedback === 'incorrect' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          border: `2px dashed ${feedback === 'correct' ? '#84cc16' : feedback === 'incorrect' ? '#f43f5e' : 'rgba(255, 255, 255, 0.12)'}`,
          boxShadow: feedback === 'correct' ? '0 0 30px rgba(132,204,22,0.2)' : 'none',
          borderRadius: '24px', marginBottom: '2rem', transition: 'all 0.3s ease', position: 'relative',
        }}
      >
        {showConfetti && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '24px', zIndex: 10 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', width: '8px', height: '14px', borderRadius: '3px',
                background: ['#a78bfa', '#3b82f6', '#14b8a6', '#fbbf24', '#f472b6', '#10b981'][i % 6],
                left: `${4 + Math.random() * 92}%`, top: '-10px',
                animation: `morphConfettiFall 1.1s ease-out ${Math.random() * 0.4}s forwards`,
                opacity: 0,
              }} />
            ))}
          </div>
        )}

        {/* Prefix slot */}
        {hasPrefix && (
          <div
            ref={(el) => (slotRefs.current.prefix = el)}
            onDragOver={(e) => handleDragOver(e, 'prefix')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'prefix')}
            onClick={() => removeFromSlot('prefix')}
            className="morph-slot"
            style={{
              minWidth: '130px', minHeight: '70px', borderRadius: '16px',
              border: `2px dashed ${dragOverSlot === 'prefix' ? '#22d3ee' : slots.prefix ? '#22d3ee' : 'rgba(255,255,255,0.2)'}`,
              background: dragOverSlot === 'prefix' ? 'rgba(34, 211, 238, 0.25)' : slots.prefix ? 'rgba(34, 211, 238, 0.14)' : 'rgba(0,0,0,0.3)',
              boxShadow: dragOverSlot === 'prefix' ? '0 0 25px rgba(34,211,238,0.6)' : slots.prefix ? '0 0 15px rgba(34,211,238,0.3)' : 'none',
              transform: dragOverSlot === 'prefix' ? 'scale(1.06)' : 'scale(1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 20px', transition: 'all 0.2s ease', cursor: slots.prefix ? 'pointer' : 'default',
            }}
          >
            {slots.prefix ? (
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#22d3ee', textShadow: '0 0 10px rgba(34,211,238,0.6)' }}>{slots.prefix.text}</span>
            ) : (
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[PREFIX]</span>
            )}
          </div>
        )}

        {/* Root slot */}
        <div
          ref={(el) => (slotRefs.current.root = el)}
          onDragOver={(e) => handleDragOver(e, 'root')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'root')}
          onClick={() => removeFromSlot('root')}
          className="morph-slot"
          style={{
            minWidth: '140px', minHeight: '70px', borderRadius: '16px',
            border: `2px dashed ${dragOverSlot === 'root' ? '#fbbf24' : slots.root ? '#fbbf24' : 'rgba(255,255,255,0.2)'}`,
            background: dragOverSlot === 'root' ? 'rgba(251, 191, 36, 0.25)' : slots.root ? 'rgba(251, 191, 36, 0.14)' : 'rgba(0,0,0,0.3)',
            boxShadow: dragOverSlot === 'root' ? '0 0 25px rgba(251,191,36,0.6)' : slots.root ? '0 0 15px rgba(251,191,36,0.3)' : 'none',
            transform: dragOverSlot === 'root' ? 'scale(1.06)' : 'scale(1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 20px', transition: 'all 0.2s ease', cursor: slots.root ? 'pointer' : 'default',
          }}
        >
          {slots.root ? (
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.6)' }}>{slots.root.text}</span>
          ) : (
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[ROOT]</span>
          )}
        </div>

        {/* Suffix slot */}
        {hasSuffix && (
          <div
            ref={(el) => (slotRefs.current.suffix = el)}
            onDragOver={(e) => handleDragOver(e, 'suffix')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'suffix')}
            onClick={() => removeFromSlot('suffix')}
            className="morph-slot"
            style={{
              minWidth: '130px', minHeight: '70px', borderRadius: '16px',
              border: `2px dashed ${dragOverSlot === 'suffix' ? '#84cc16' : slots.suffix ? '#84cc16' : 'rgba(255,255,255,0.2)'}`,
              background: dragOverSlot === 'suffix' ? 'rgba(132, 204, 22, 0.25)' : slots.suffix ? 'rgba(132, 204, 22, 0.14)' : 'rgba(0,0,0,0.3)',
              boxShadow: dragOverSlot === 'suffix' ? '0 0 25px rgba(132,204,22,0.6)' : slots.suffix ? '0 0 15px rgba(132,204,22,0.3)' : 'none',
              transform: dragOverSlot === 'suffix' ? 'scale(1.06)' : 'scale(1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 20px', transition: 'all 0.2s ease', cursor: slots.suffix ? 'pointer' : 'default',
            }}
          >
            {slots.suffix ? (
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#84cc16', textShadow: '0 0 10px rgba(132,204,22,0.6)' }}>{slots.suffix.text}</span>
            ) : (
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[SUFFIX]</span>
            )}
          </div>
        )}
      </div>

      {/* Feedback message */}
      {feedback && (
        <div style={{
          textAlign: 'center', marginBottom: '1rem', padding: '10px 18px', borderRadius: '12px',
          background: feedback === 'correct' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${feedback === 'correct' ? '#10b981' : '#f43f5e'}`,
          color: feedback === 'correct' ? '#34d399' : '#fb7185',
          fontWeight: 900, fontSize: '1rem',
          animation: 'fadeInUp 0.3s ease',
        }}>
          {feedback === 'correct' ? '✅ Perfect! Word built correctly!' : '❌ Not quite right — try again!'}
        </div>
      )}

      {/* ── DRAGGABLE & CLICKABLE MORPHEME TRAY ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center',
        padding: '1.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ width: '100%', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--lf-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
          💡 Click or Drag blocks into the slots above
        </span>
        {draggableBlocks.map((block) => {
          const colors = blockColor(block.type);
          return (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, block)}
              onTouchStart={(e) => handleTouchStart(e, block)}
              onClick={() => handleBlockClick(block)}
              className="morph-block"
              style={{
                padding: '12px 22px', borderRadius: '14px', cursor: 'pointer',
                background: colors.bg, border: `2px solid ${colors.border}`,
                color: colors.text, fontWeight: 900, fontSize: '1.15rem',
                boxShadow: colors.shadow, textShadow: `0 0 6px ${colors.bg}`,
                transition: 'all 0.15s ease',
                userSelect: 'none', WebkitUserSelect: 'none',
              }}
            >
              {block.text}
            </div>
          );
        })}
      </div>

      {/* Touch drag ghost */}
      {draggedBlock && touchPos && (
        <div style={{
          position: 'fixed', left: touchPos.x - 40, top: touchPos.y - 25,
          padding: '10px 20px', borderRadius: '14px', fontWeight: 900, fontSize: '1.15rem',
          background: blockColor(draggedBlock.type).bg,
          border: `2px solid ${blockColor(draggedBlock.type).border}`,
          color: blockColor(draggedBlock.type).text,
          pointerEvents: 'none', zIndex: 9999, opacity: 0.9,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}>
          {draggedBlock.text}
        </div>
      )}
    </div>
  );
};

export default MorphologyDragDrop;
