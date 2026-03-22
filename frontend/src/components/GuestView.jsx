import { Link } from 'react-router-dom';

const features = [
  {
    icon: '↓',
    color: 'var(--cd-success)',
    bg: 'var(--cd-success-bg)',
    border: 'rgba(0,200,150,0.2)',
    title: 'Cash Inflow',
    desc: 'Record income in seconds',
  },
  {
    icon: '↑',
    color: 'var(--cd-danger)',
    bg: 'var(--cd-danger-bg)',
    border: 'rgba(255,92,92,0.2)',
    title: 'Cash Outflow',
    desc: 'Track every expense easily',
  },
  {
    icon: '📊',
    color: '#A78BFA',
    bg: 'rgba(108,99,255,0.1)',
    border: 'rgba(108,99,255,0.2)',
    title: 'View & Manage',
    desc: 'Edit or delete transactions',
  },
  {
    icon: '🕐',
    color: '#FFB84D',
    bg: 'rgba(255,184,77,0.1)',
    border: 'rgba(255,184,77,0.2)',
    title: 'Full History',
    desc: 'See every transaction record',
  },
  {
    icon: '📄',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.2)',
    title: 'PDF Reports',
    desc: 'Export clean PDF summaries',
  },
  {
    icon: '📚',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.2)',
    title: 'Multiple Cashbooks',
    desc: 'Organize by project or category',
  },
];

const GuestView = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cd-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glows */}
      <div style={{
        position: 'absolute', top: -200, left: -200, width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -150, right: -150, width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,200,150,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 60px', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }} className="cd-anim-fade-up">
          {/* Logo icon */}
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'var(--cd-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            overflow: 'hidden'
          }}>
            <img src="/cdlogo.png" alt="CashDiary Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: 6 }}>
            <div className="cd-logo-text" style={{ fontSize: '2.2rem', marginBottom: 0 }}>CashDiary</div>
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--cd-text-soft)', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
            Smart cash tracking for individuals & businesses
          </div>
        </div>

        {/* Guest banner */}
        <div style={{
          background: 'rgba(255,184,77,0.1)',
          border: '1px solid rgba(255,184,77,0.3)',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 28,
          textAlign: 'center',
        }} className="cd-anim-fade-up">
          <div style={{ fontSize: '0.85rem', color: 'var(--cd-warning)', fontWeight: 500, lineHeight: 1.6 }}>
            👁 You're browsing as a guest. Explore the features below, then sign in to get started.
          </div>
        </div>

        {/* Feature grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 36 }}
          className="cd-anim-fade-up"
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: f.bg,
                border: `1px solid ${f.border}`,
                borderRadius: 16,
                padding: '16px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: typeof f.icon === 'string' && f.icon.length > 1 ? '1.2rem' : '1.1rem',
                color: f.color,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.87rem', fontWeight: 700, color: f.color, marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cd-text-soft)', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="cd-anim-fade-up">
          <Link
            to="/login"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '15px 24px', borderRadius: 999,
              background: 'var(--cd-primary)',
              color: '#fff', fontWeight: 700, fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 10px 28px var(--cd-primary-glow)',
            }}
          >
            Sign In to Your Account
          </Link>
          <Link
            to="/signup"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '15px 24px', borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--cd-text)', fontWeight: 600, fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GuestView;
