import React, { useEffect, useRef, useState } from 'react';

const seenTooltips = new Set();

export function TutorialTooltip({ id, children, hint }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!seenTooltips.has(id)) {
      seenTooltips.add(id);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 4000);
    }
    return () => clearTimeout(timerRef.current);
  }, [id]);

  const dismiss = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {visible && (
        <div
          onClick={dismiss}
          style={{
            position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,10,30,0.97)', border: '1px solid #7c5cbf',
            borderRadius: 6, padding: '8px 12px', zIndex: 9999,
            color: '#e8d5ff', fontSize: 13, whiteSpace: 'nowrap',
            boxShadow: '0 2px 12px rgba(124,92,191,0.4)', cursor: 'pointer',
            maxWidth: 240, textAlign: 'center',
          }}
        >
          💡 {hint}
          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>Click to dismiss</div>
        </div>
      )}
    </div>
  );
}
