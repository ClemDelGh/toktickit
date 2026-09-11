import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './Login';
import ChangePassword from './ChangePassword';
import CreateTicket from './CreateTicket';
import MyTickets from './MyTickets';

export default function App() {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" style={{ color: '#006B3C' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  return (
    <div>
      <nav className="navbar navbar-dark shadow-sm" style={{ backgroundColor: '#006B3C' }}>
        <div className="container-fluid px-4">
          <span className="navbar-brand mb-0 h1 d-flex align-items-center">
            TokTickIT
          </span>
          <div className="d-flex align-items-center text-white">
            <span className="me-4 d-flex flex-column" style={{ fontSize: '0.9rem' }}>
               <span className="fw-bold">{user.name}</span>
               <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Role: {user.role}</span>
            </span>
            <button 
              className="btn btn-sm btn-outline-light" 
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Barre de navigation interne, affichée uniquement pour le rôle Requester pour le moment */}
      {user.role === 'Requester' && (
        <div className="bg-light border-bottom py-2">
          <div className="container">
            <div className="btn-group" role="group">
              <button 
                type="button" 
                className={`btn btn-sm ${activeTab === 'create' ? 'text-white' : 'btn-outline-success'}`}
                style={{ backgroundColor: activeTab === 'create' ? '#006B3C' : 'transparent', borderColor: '#006B3C' }}
                onClick={() => setActiveTab('create')}
              >
                Create Ticket
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${activeTab === 'list' ? 'text-white' : 'btn-outline-success'}`}
                style={{ backgroundColor: activeTab === 'list' ? '#006B3C' : 'transparent', borderColor: '#006B3C' }}
                onClick={() => setActiveTab('list')}
              >
                My Tickets
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="container mt-4 mb-5">
        {user.role === 'Requester' ? (
          activeTab === 'create' ? (
            <CreateTicket requester={user} />
          ) : (
            <MyTickets requester={user} />
          )
        ) : (
          <div className="alert alert-info">
            Welcome {user.name}! The IT Staff / Admin dashboard is not yet implemented.
          </div>
        )}
      </main>
    </div>
  );
}