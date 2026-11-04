'use client';

export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        height: 44,
        padding: '0 20px',
        border: 0,
        borderRadius: 12,
        background: '#2D58F2',
        color: '#fff',
        font: 'inherit',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Thử lại
    </button>
  );
}
