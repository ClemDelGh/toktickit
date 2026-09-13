import { useState, useEffect } from 'react';

interface Attachment { id: number; originalName: string; isRemoved: boolean; }
interface Comment {
  id: number;
  text: string;
  createdAt: string;
  author: { name: string; role: string };
}
interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  status: string; // Changé de currentStatus à status pour correspondre à la BDD
  createdAt: string;
  category: { name: string };
  relatedSystem: { name: string };
  requester: { name: string };
  attachments: Attachment[];
  comments: Comment[]; // NOUVEAU: Le tableau des commentaires
}

interface Props { 
  ticketId: number; 
  onBack: () => void; 
}

export default function RequesterTicketDetail({ ticketId, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // States pour les pièces jointes
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // States pour les commentaires et la résolution
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchTicket = () => {
    // PLUS DE HEADERS, PLUS DE LOCALHOST !
    fetch(`/api/tickets/${ticketId}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(data => { setTicket(data); setLoading(false); })
      .catch(() => { setError('Error loading ticket details'); setLoading(false); });
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  // --- ACTIONS PIÈCES JOINTES ---
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
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
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
      const res = await fetch(`/api/attachments/${attachmentId}/download`);
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
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      fetchTicket();
    } catch {
      alert('Failed to remove file.');
    }
  };

  // --- ACTIONS COMMENTAIRES ET RÉSOLUTION ---
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment.trim() })
      });
      if (!res.ok) throw new Error();
      setNewComment('');
      fetchTicket(); // Recharge le ticket pour afficher le nouveau commentaire
    } catch (err) {
      alert('Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolve = async () => {
    if (!confirm('Are you sure your problem is resolved? This will update the ticket status.')) return;
    
    setResolving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/resolve`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error();
      fetchTicket();
    } catch (err) {
      alert('Failed to resolve ticket.');
    } finally {
      setResolving(false);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-success" /></div>;
  if (error || !ticket) return <div className="alert alert-danger mt-4">{error}</div>;

  const activeAttachments = ticket.attachments.filter(a => !a.isRemoved);
  // Empêcher de résoudre si déjà résolu/fermé/annulé
  const canResolve = !['Resolved', 'Closed', 'Cancelled'].includes(ticket.status); 

  return (
    <div className="card shadow-sm mt-4 mb-5">
      <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0 text-success fw-bold">Ticket Details: {ticket.ticketNumber}</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>
          ← Back to My Tickets
        </button>
      </div>
      
      <div className="card-body bg-white">
        
        {/* En-tête des actions */}
        {canResolve && (
          <div className="d-flex justify-content-end mb-3">
             <button 
               className="btn btn-outline-success" 
               onClick={handleResolve}
               disabled={resolving}
             >
               {resolving ? 'Resolving...' : '✓ Problem Appears Resolved'}
             </button>
          </div>
        )}

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
            <div className="p-2 bg-light border rounded text-success fw-bold">{ticket.status}</div>
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

        <div className="row">
          {/* Colonne de gauche: Commentaires */}
          <div className="col-md-7 border-end">
            <h6 className="fw-bold mb-3">💬 Public Comments</h6>
            
            <div className="mb-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map(comment => (
                  <div key={comment.id} className="card mb-2 shadow-sm border-0 bg-light">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold small text-success">
                          {comment.author.name} <span className="text-muted fw-normal">({comment.author.role})</span>
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted small">No comments yet.</p>
              )}
            </div>

            <form onSubmit={handlePostComment} className="mt-3">
              <div className="mb-2">
                <textarea 
                  className="form-control" 
                  rows={3} 
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
              </div>
              <div className="d-flex justify-content-end">
                <button 
                  type="submit" 
                  className="btn btn-sm btn-success" 
                  disabled={!newComment.trim() || submittingComment}
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>

          {/* Colonne de droite: Pièces jointes */}
          <div className="col-md-5 ps-4">
            <h6 className="fw-bold mb-3">📎 Attachments ({ticket.attachments.length})</h6>
            
            {ticket.attachments.length > 0 ? (
              <ul className="list-group mb-4 small">
                {ticket.attachments.map(att => (
                  <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center border-0 bg-light mb-1 rounded">
                    <span className={`text-truncate me-2 ${att.isRemoved ? 'text-decoration-line-through text-muted' : ''}`} style={{ maxWidth: '150px' }}>
                      {att.originalName} {att.isRemoved && '(Removed)'}
                    </span>
                    {!att.isRemoved && (
                      <div className="text-nowrap">
                        <button className="btn btn-sm btn-link text-success p-0 me-2" onClick={() => handleDownload(att.id, att.originalName)}>
                          ↓
                        </button>
                        <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleRemove(att.id)}>
                          ✕
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
              <form onSubmit={handleUpload} className="d-flex flex-column p-3 bg-light border rounded">
                <input 
                  type="file" 
                  className="form-control form-control-sm mb-2" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                />
                <button type="submit" className="btn btn-sm btn-outline-success" disabled={!file || uploading}>
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </form>
            ) : (
              <div className="alert alert-warning small py-2">Max 5 attachments reached.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}