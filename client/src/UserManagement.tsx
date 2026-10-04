import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Requester', isActive: true, initialPassword: '' });
  const [passwordResetData, setPasswordResetData] = useState({ id: 0, newPassword: '' });

  const fetchUsers = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (roleFilter) params.append('role', roleFilter);

    fetch(`/api/users?${params.toString()}`, { 
      credentials: 'include' // <-- AJOUT ICI
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(() => alert('Erreur lors du chargement des utilisateurs'));
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include' // <-- AJOUT ICI
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la sauvegarde');
      
      setIsFormOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCreateForm = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'Requester', isActive: true, initialPassword: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, initialPassword: '' });
    setIsFormOpen(true);
  };

  const handleResetPassword = async () => {
    if (!passwordResetData.newPassword) return alert('Veuillez entrer un mot de passe.');
    
    try {
      const res = await fetch(`/api/users/${passwordResetData.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialPassword: passwordResetData.newPassword }),
        credentials: 'include' // <-- AJOUT ICI
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert('Mot de passe initial réinitialisé avec succès !');
      setPasswordResetData({ id: 0, newPassword: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: '#006B3C' }}>User Management</h2>
        <button className="btn text-white" style={{ backgroundColor: '#006B3C' }} onClick={openCreateForm}>
          + Create User
        </button>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-header bg-light d-flex gap-3">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="Requester">Requester</option>
            <option value="ITStaff">IT Staff</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="align-middle">{u.name}</td>
                  <td className="align-middle">{u.email}</td>
                  <td className="align-middle">
                    <span className="badge bg-secondary">{u.role}</span>
                  </td>
                  <td className="align-middle">
                    {u.isActive ? (
                      <span className="badge bg-success">Active</span>
                    ) : (
                      <span className="badge bg-danger">Inactive</span>
                    )}
                  </td>
                  <td className="align-middle">
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditForm(u)}>Edit</button>
                    <button className="btn btn-sm btn-outline-warning" onClick={() => setPasswordResetData({ id: u.id, newPassword: '' })}>Reset Pwd</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay for Form */}
      {isFormOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title">{editingUser ? 'Edit User' : 'Create New User'}</h5>
                  <button type="button" className="btn-close" onClick={() => setIsFormOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Full Name</label>
                    <input required className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email Address</label>
                    <input required type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="Requester">Requester</option>
                      <option value="ITStaff">IT Staff</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>
                  <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                    <label className="form-check-label">Account Active</label>
                  </div>
                  {!editingUser && (
                    <div className="mb-3">
                      <label className="form-label">Initial Password</label>
                      <input required type="text" className="form-control" value={formData.initialPassword} onChange={e => setFormData({...formData, initialPassword: e.target.value})} />
                      <div className="form-text">User will be forced to change this on first login.</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Cancel</button>
                  <button type="submit" className="btn text-white" style={{ backgroundColor: '#006B3C' }}>Save User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Password Reset */}
      {passwordResetData.id !== 0 && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reset Initial Password</h5>
                <button type="button" className="btn-close" onClick={() => setPasswordResetData({ id: 0, newPassword: '' })}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">New Temporary Password</label>
                  <input type="text" className="form-control" placeholder="e.g. TempPass123!" value={passwordResetData.newPassword} onChange={e => setPasswordResetData({...passwordResetData, newPassword: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPasswordResetData({ id: 0, newPassword: '' })}>Cancel</button>
                <button type="button" className="btn btn-warning" onClick={handleResetPassword}>Confirm Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}