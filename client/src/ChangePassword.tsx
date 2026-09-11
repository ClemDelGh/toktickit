import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, setUser, logout } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Vérification de base côté client
    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match');
    }
    if (newPassword.length < 8) {
      return setError('New password must be at least 8 characters long');
    }
    if (newPassword === currentPassword) {
      return setError('New password must be different from current password');
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-sm p-4" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <h2 style={{ color: '#006B3C', fontWeight: 'bold' }}>Security Update</h2>
          <p className="text-muted small">You must change your password before continuing.</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-muted small fw-bold">Current Password</label>
            <input
              type="password"
              className="form-control"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          <div className="mb-3">
            <label className="form-label text-muted small fw-bold">New Password</label>
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <div className="form-text" style={{ fontSize: '0.75rem' }}>Minimum 8 characters</div>
          </div>

          <div className="mb-4">
            <label className="form-label text-muted small fw-bold">Confirm New Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary flex-grow-1"
              onClick={logout}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn text-white flex-grow-1 fw-bold"
              style={{ backgroundColor: '#006B3C' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}