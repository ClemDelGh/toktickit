import { useState, useEffect } from 'react';

interface Requester { id: number; name: string; email: string; }
interface Attachment { id: number; originalName: string; isRemoved: boolean; }
interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  currentStatus: string;
  createdAt: string;
  category: { name: string };
  relatedSystem: { name: string };
  requester: { name: string };
  attachments: Attachment[];
}

interface Props { 
  ticketId: number; 
  requester: Requester; 
  onBack: () => void; 
}

export default function RequesterTicketDetail({ ticketId, requester, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchTicket = () => {
    fetch(`http://localhost:3000/api/tickets/${ticketId}`, {
      headers: { 'X-Requester-Id': String(requester.id) }
    })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(data => { setTicket(data); setLoading(false); })
      .catch(() => { setError('Error loading ticket details'); setLoading(false); });
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId, requester.id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large (Max 5MB)');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`http://localhost:3000/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: { 'X-Requester-Id': String(requester.id) },
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      setFile(null);
      fetchTicket();
    } catch (err) {
      alert('Failed to upload file. Check format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId: number, filename: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/attachments/${attachmentId}/download`, {
        headers: { 'X-Requester-Id': String(requester.id) }
      });
      if (!res.ok) throw new Error();
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download file.');
    }
  };

  const handleRemove = async (attachmentId: number) => {
    if (!confirm('Are you sure you want to remove this attachment?')) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'X-Requester-Id': String(requester.id) }
      });
      if (!res.ok) throw new Error();
      fetchTicket();
    } catch {
      alert('Failed to remove file.');
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-success" /></div>;
  if (error || !ticket) return <div className="alert alert-danger mt-4">{error}</div>;

  const activeAttachments = ticket.attachments.filter(a => !a.isRemoved);

  return (
    <div className="card shadow-sm mt-4 mb-5">
      <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0 text-success fw-bold">Ticket Details: {ticket.ticketNumber}</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>
          ← Back to My Tickets
        </button>
      </div>
      
      <div className="card-body bg-white">
        {/* Read-Only Fields */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <label className="fw-bold small text-muted">Created Date</label>
            <div className="p-2 bg-light border rounded">{new Date(ticket.createdAt).toLocaleString()}</div>
          </div>
          <div className="col-md-3">
            <label className="fw-bold small text-muted">Category</label>
            <div className="p-2 bg-light border rounded">{ticket.category.name}</div>
          </div>
          <div className="col-md-3">
            <label className="fw-bold small text-muted">Related System</label>
            <div className="p-2 bg-light border rounded">{ticket.relatedSystem.name}</div>
          </div>
          <div className="col-md-3">
            <label className="fw-bold small text-muted">Current Status</label>
            <div className="p-2 bg-light border rounded text-success fw-bold">{ticket.currentStatus}</div>
          </div>
        </div>

        <div className="mb-3">
          <label className="fw-bold small text-muted">Summary</label>
          <div className="p-2 bg-light border rounded">{ticket.summary}</div>
        </div>

        <div className="mb-4">
          <label className="fw-bold small text-muted">Description</label>
          <div className="p-3 bg-light border rounded" style={{ minHeight: '100px', whiteSpace: 'pre-wrap' }}>
            {ticket.description}
          </div>
        </div>

        <hr />

        {/* Attachments Section */}
        <h6 className="fw-bold mt-4 mb-3">📎 Attachments ({ticket.attachments.length})</h6>
        
        {ticket.attachments.length > 0 ? (
          <ul className="list-group mb-4">
            {ticket.attachments.map(att => (
              <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center">
                <span className={att.isRemoved ? 'text-decoration-line-through text-muted' : ''}>
                  {att.originalName} {att.isRemoved && '(Removed)'}
                </span>
                {!att.isRemoved && (
                  <div>
                    <button className="btn btn-sm btn-outline-success me-2" onClick={() => handleDownload(att.id, att.originalName)}>
                      Download
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemove(att.id)}>
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted small">No attachments yet.</p>
        )}

        {activeAttachments.length < 5 ? (
          <form onSubmit={handleUpload} className="d-flex align-items-center p-3 bg-light border rounded">
            <input 
              type="file" 
              className="form-control form-control-sm me-3" 
              onChange={e => setFile(e.target.files?.[0] || null)}
              accept=".jpg,.jpeg,.png,.webp,.pdf"
            />
            <button type="submit" className="btn btn-sm btn-success px-4" disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        ) : (
          <div className="alert alert-warning small py-2">Maximum of 5 active attachments reached.</div>
        )}
      </div>
    </div>
  );
}