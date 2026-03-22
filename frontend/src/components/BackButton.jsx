import { useNavigate } from 'react-router-dom';

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '10px 0 4px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--cd-border)',
          borderRadius: 999, padding: '7px 14px',
          color: 'var(--cd-text-soft)', fontFamily: 'inherit',
          fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
          transition: 'background 150ms, color 150ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--cd-text)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--cd-text-soft)'; }}
        aria-label="Go back"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back
      </button>
    </div>
  );
};

export default BackButton;
