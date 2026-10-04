import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

interface User { name: string; role: string; }
interface Comment { id: number; text: string; createdAt: string; author: User; }
interface InternalNote { id: number; text: string; createdAt: string; author: User; }
interface Attachment { id: number; originalName: string; isRemoved: boolean; }

interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  createdAt: string;
  category: { name: string };
  relatedSystem: { name: string };
  requester: { name: string; email: string };
  ticketOwner: { name: string; email: string } | null;
  comments: Comment[];
  internalNotes: InternalNote[];
  attachments: Attachment[];
}

interface Props {
  ticketId: number;
  onBack: () => void;
}

export default function StaffTicketDetail({ ticketId, onBack }: Props) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [status, setStatus] = useState('');
  const [itPriority, setItPriority] = useState('');
  const [updating, setUpdating] = useState(false);

  // Notes & Comments states
  const [newComment, setNewComment] = useState('');
  const [newNote, setNewNote] = useState('');

  const fetchTicket = () => {
    // AJOUT ICI
    fetch(`/api/staff/tickets/${ticketId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(data => { 
        setTicket(data); 
        setStatus(data.status);
        setItPriority(data.itPriority || '');
        setLoading(false); 
      })
      .catch(() => { setError('Error loading ticket details'); setLoading(false); });
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // AJOUT ICI
        body: JSON.stringify({ status, itPriority: itPriority || null })
      });
      if (!res.ok) throw new Error();
      fetchTicket();
      alert('Ticket updated successfully!');
    } catch {
      alert('Failed to update ticket.');
    } finally {
      setUpdating(false);
    }
  };

  const handleClaimTicket = async () => {
    const currentUserId = user?.id || (user as any)?.userId;
    
    if (!currentUserId) {
      alert("Erreur: Impossible de trouver l'ID de votre utilisateur.");
      return;
    }

    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // AJOUT ICI
        body: JSON.stringify({ ticketOwnerId: Number(currentUserId) })
      });
      if (!res.ok) throw new Error();
      fetchTicket();
    } catch {
      alert('Failed to claim ticket.');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // AJOUT ICI
        body: JSON.stringify({ text: newComment })
      });
      if (!res.ok) throw new Error();
      setNewComment('');
      fetchTicket();
    } catch {
      alert('Failed to post comment.');
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // AJOUT ICI
        body: JSON.stringify({ text: newNote })
      });
      if (!res.ok) throw new Error();
      setNewNote('');
      fetchTicket();
    } catch {
      alert('Failed to post note.');
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" /></div>;
  if (error || !ticket) return <div className="alert alert-danger mt-4">{error}</div>;

  return (
    <div className="card shadow-sm mt-4 mb-5">
      <div className="card-header text-white d-flex justify-content-between align-items-center py-3" style={{ backgroundColor: '#004B87' }}>
        <h5 className="mb-0 fw-bold">IT Workspace: {ticket.ticketNumber}</h5>
        <button className="btn btn-sm btn-outline-light" onClick={onBack}>← Back to Queue</button>
      </div>
      
      <div className="card-body bg-light">
        <div className="row">
          {/* COLONNE GAUCHE : Infos et Propriétés */}
          <div className="col-md-5 border-end pe-4">
            <h6 className="fw-bold mb-3">Requester Info</h6>
            <div className="p-3 bg-white border rounded mb-4">
              <p className="mb-1"><strong>Name:</strong> {ticket.requester.name}</p>
              <p className="mb-1"><strong>Email:</strong> {ticket.requester.email}</p>
              <p className="mb-1"><strong>System:</strong> {ticket.relatedSystem.name}</p>
              <p className="mb-0 text-danger"><strong>Requested Priority:</strong> {ticket.requestedPriority}</p>
            </div>

            <h6 className="fw-bold mb-3">Ticket Properties</h6>
            <form onSubmit={handleUpdateTicket} className="p-3 bg-white border rounded mb-4">
              <div className="mb-3">
                <label className="form-label small fw-bold">IT Priority</label>
                <select className="form-select form-select-sm" value={itPriority} onChange={e => setItPriority(e.target.value)}>
                  <option value="">Unassigned</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">Status</label>
                <select className="form-select form-select-sm" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="New">New</option>
                  <option value="Open">Open</option>
                  <option value="InProgress">In Progress</option>
                  <option value="WaitingForRequester">Waiting For Requester</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Reopened">Reopened</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <button type="submit" className="btn btn-sm btn-primary w-100" disabled={updating}>
                {updating ? 'Saving...' : 'Save Properties'}
              </button>
            </form>

            <h6 className="fw-bold mb-3">Ticket Owner</h6>
            <div className="p-3 bg-white border rounded mb-4 d-flex justify-content-between align-items-center">
              <span className="fw-bold">{ticket.ticketOwner ? ticket.ticketOwner.name : 'Unassigned'}</span>
              {!ticket.ticketOwner && (
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleClaimTicket}>Claim Ticket</button>
              )}
            </div>
            
            <div className="mb-4">
              <h6 className="fw-bold mb-2">Description</h6>
              <div className="p-3 bg-white border rounded small" style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
            </div>
          </div>

          {/* COLONNE DROITE : Commentaires Publics et Notes Internes */}
          <div className="col-md-7 ps-4">
            
            {/* PUBLIC COMMENTS */}
            <h6 className="fw-bold mb-3 text-success">💬 Public Comments (Visible to Requester)</h6>
            <div className="mb-4" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {ticket.comments.map(c => (
                <div key={c.id} className="card mb-2 shadow-sm border-success bg-white">
                  <div className="card-body p-2 small">
                    <div className="d-flex justify-content-between text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                      <span className="fw-bold text-success">{c.author.name} ({c.author.role})</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {c.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handlePostComment} className="mb-5">
              <textarea className="form-control mb-2" rows={2} placeholder="Add a public comment..." value={newComment} onChange={e => setNewComment(e.target.value)} />
              <button type="submit" className="btn btn-sm btn-success" disabled={!newComment.trim()}>Post Public Comment</button>
            </form>

            <hr />

            {/* INTERNAL NOTES */}
            <h6 className="fw-bold mb-3 mt-4 text-warning" style={{ color: '#d39e00' }}>🔒 Internal Notes (Staff Only)</h6>
            <div className="mb-4" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {ticket.internalNotes.map(n => (
                <div key={n.id} className="card mb-2 shadow-sm border-warning" style={{ backgroundColor: '#fffdf5' }}>
                  <div className="card-body p-2 small">
                    <div className="d-flex justify-content-between text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                      <span className="fw-bold text-warning" style={{ color: '#d39e00' }}>{n.author.name} ({n.author.role})</span>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    {n.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handlePostNote}>
              <textarea className="form-control mb-2 border-warning" rows={2} placeholder="Add a private internal note..." value={newNote} onChange={e => setNewNote(e.target.value)} style={{ backgroundColor: '#fffdf5' }} />
              <button type="submit" className="btn btn-sm btn-warning text-dark fw-bold" disabled={!newNote.trim()}>Post Internal Note</button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}