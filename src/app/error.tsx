'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: '640px',
        width: '100%',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1rem',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
          }}>
            !
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#0f172a',
            marginBottom: '0.5rem',
          }}>
            Une erreur est survenue
          </h2>
          <p style={{
            color: '#64748b',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            L&apos;application a rencontré une erreur inattendue.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: '#f43f5e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            Réessayer
          </button>
        </div>

        {/* Error details for debugging */}
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem',
          overflow: 'auto',
          maxHeight: '400px',
        }}>
          <p style={{
            fontWeight: 600,
            color: '#dc2626',
            marginBottom: '0.5rem',
            fontSize: '0.8rem',
            wordBreak: 'break-word',
          }}>
            {error.message}
          </p>
          <pre style={{
            fontSize: '0.7rem',
            color: '#7f1d1d',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}>
            {error.stack}
          </pre>
        </div>
      </div>
    </div>
  );
}
