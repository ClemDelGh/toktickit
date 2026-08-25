import { useEffect, useState } from 'react';

interface Requester {
  id: number;
  name: string;
  email: string;
}

interface Props {
  onSelect: (requester: Requester) => void;
}

export default function RequesterSelector({ onSelect }: Props) {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/api/development-requesters')
      .then((res) => {
        if (!res.ok) throw new Error('API Failure');
        return res.json();
      })
      .then((data) => {
        setRequesters(data);
        if (data.length > 0) setSelectedId(String(data[0].id));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load active requesters. Safe API-failure state.');
        setLoading(false);
      });
  }, []);

  const handleContinue = () => {
    const requester = requesters.find((r) => String(r.id) === selectedId);
    if (requester) onSelect(requester);
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <div className="card shadow-sm" style={{ backgroundColor: '#ffffff', border: '1px solid #EAF6EF' }}>
        <div className="card-body text-center p-5">
          <div className="mb-4">
            {/* Simple User Icon SVG */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#0B7A46">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h2 className="card-title mb-3" style={{ color: '#2C3E35' }}>Select Development Requester</h2>
          <p className="text-muted mb-4 text-start">
            Choose a development requester to simulate the current requester context for Lab 2. 
            This is for testing only and is not a login screen.
          </p>

          {loading && <div className="spinner-border text-success" role="status"><span className="visually-hidden">Loading...</span></div>}
          {error && <div className="alert alert-danger">{error}</div>}
          
          {!loading && !error && requesters.length === 0 && (
             <div className="alert alert-warning">No active development requesters found.</div>
          )}

          {!loading && !error && requesters.length > 0 && (
            <div className="text-start mb-4">
              <label htmlFor="requester-select" className="form-label fw-bold" style={{ color: '#2C3E35' }}>
                Development Requester <span className="text-danger">*</span>
              </label>
              <select 
                id="requester-select" 
                className="form-select" 
                value={selectedId} 
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {requesters.map(req => (
                  <option key={req.id} value={req.id}>{req.name}</option>
                ))}
              </select>
              <div className="form-text mt-2" style={{ backgroundColor: '#EAF6EF', padding: '10px', borderRadius: '5px' }}>
                ⓘ Only active development requesters are shown.
              </div>
            </div>
          )}

          <div className="alert text-start mt-4 d-flex align-items-center" style={{ backgroundColor: '#F5F7F6', border: '1px solid #ddd' }}>
            <div className="me-3 fs-3">🛡️</div>
            <div>
              <strong>Authentication coming in Lab 3</strong><br/>
              <small className="text-muted">In Lab 3, this selection will be replaced with secure authentication.</small>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-4">
            <button className="btn btn-light me-2">Cancel</button>
            <button 
              className="btn text-white" 
              style={{ backgroundColor: '#006B3C' }} 
              onClick={handleContinue}
              disabled={loading || requesters.length === 0}
            >
              → Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}