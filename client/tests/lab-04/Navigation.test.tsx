import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';

// Mock child components so the test stays focused on navigation
vi.mock('../../src/Login', () => ({
  default: () => <div>Login Page</div>,
}));
vi.mock('../../src/ChangePassword', () => ({
  default: () => <div>Change Password Page</div>,
}));
vi.mock('../../src/CreateTicket', () => ({
  default: () => <div>Create Ticket Page</div>,
}));
vi.mock('../../src/MyTickets', () => ({
  default: ({ statusFilter }: { statusFilter?: string }) => (
    <div>My Tickets Page {statusFilter && `(filter: ${statusFilter})`}</div>
  ),
}));
vi.mock('../../src/RequesterDashboard', () => ({
  default: ({ setActiveTab, setStatusFilter }: any) => (
    <div>
      Requester Dashboard
      <button onClick={() => { setActiveTab('list'); setStatusFilter('Open'); }}>Go to list</button>
    </div>
  ),
}));
vi.mock('../../src/StaffDashboard', () => ({
  default: () => <div>Staff Dashboard coming soon</div>,
}));
vi.mock('../../src/StaffTicketQueue', () => ({
  default: () => <div>Staff Queue Page</div>,
}));
vi.mock('../../src/UserManagement', () => ({
  default: () => <div>User Management Page</div>,
}));

// Mock AuthContext – we override per test
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../src/contexts/AuthContext';

const REQUESTER_USER = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.a@example.com',
  role: 'Requester' as const,
  mustChangePassword: false,
};

const STAFF_USER = {
  id: 2,
  name: 'Alex IT',
  email: 'it1@example.com',
  role: 'ITStaff' as const,
  mustChangePassword: false,
};

const ADMIN_USER = {
  id: 3,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'Administrator' as const,
  mustChangePassword: false,
};

describe('App Navigation (UI-20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // UI-20: Role navigation and active indicator
  // -----------------------------------------------------------------------
  describe('UI-20: Role-aware navigation and aria-current', () => {
    it('Requester sees 3 nav items: Dashboard, Create Ticket, My Tickets', async () => {
      (useAuth as any).mockReturnValue({
        user: REQUESTER_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      const navItems = screen.getAllByRole('button', {
        name: /Dashboard|Create Ticket|My Tickets/i,
      });
      // Should have at least 3 nav buttons for requester
      const dashboardBtn = screen.getByRole('button', { name: /^Dashboard$/i });
      const createBtn = screen.getByRole('button', { name: /^Create Ticket$/i });
      const myTicketsBtn = screen.getByRole('button', { name: /^My Tickets$/i });

      expect(dashboardBtn).toBeInTheDocument();
      expect(createBtn).toBeInTheDocument();
      expect(myTicketsBtn).toBeInTheDocument();
    });

    it('Requester landing is Dashboard with aria-current="page"', async () => {
      (useAuth as any).mockReturnValue({
        user: REQUESTER_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      const dashboardBtn = screen.getByRole('button', { name: /^Dashboard$/i });
      expect(dashboardBtn).toHaveAttribute('aria-current', 'page');

      const createBtn = screen.getByRole('button', { name: /^Create Ticket$/i });
      expect(createBtn).not.toHaveAttribute('aria-current', 'page');

      const myTicketsBtn = screen.getByRole('button', { name: /^My Tickets$/i });
      expect(myTicketsBtn).not.toHaveAttribute('aria-current', 'page');
    });

    it('Requester can navigate to Create Ticket tab', async () => {
      (useAuth as any).mockReturnValue({
        user: REQUESTER_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      const createBtn = screen.getByRole('button', { name: /^Create Ticket$/i });
      await userEvent.click(createBtn);

      expect(createBtn).toHaveAttribute('aria-current', 'page');
      expect(screen.getByText('Create Ticket Page')).toBeInTheDocument();
    });

    it('Requester can navigate to My Tickets tab', async () => {
      (useAuth as any).mockReturnValue({
        user: REQUESTER_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      const myTicketsBtn = screen.getByRole('button', { name: /^My Tickets$/i });
      await userEvent.click(myTicketsBtn);

      expect(myTicketsBtn).toHaveAttribute('aria-current', 'page');
      expect(screen.getByText(/My Tickets Page/)).toBeInTheDocument();
    });

    it('ITStaff sees 2 nav items: Dashboard, Queue', async () => {
      (useAuth as any).mockReturnValue({
        user: STAFF_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      expect(screen.getByRole('button', { name: /^Dashboard$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Queue$/i })).toBeInTheDocument();

      // Requester-only tabs should not be visible
      expect(screen.queryByRole('button', { name: /^Create Ticket$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^My Tickets$/i })).not.toBeInTheDocument();
    });

    it('ITStaff landing has Dashboard with aria-current="page"', async () => {
      (useAuth as any).mockReturnValue({
        user: STAFF_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      const dashboardBtn = screen.getByRole('button', { name: /^Dashboard$/i });
      expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
      // Dashboard shows placeholder
      expect(screen.getByText(/Staff Dashboard coming soon/i)).toBeInTheDocument();
    });

    it('Administrator sees 3 nav items: Dashboard, Queue, Users', async () => {
      (useAuth as any).mockReturnValue({
        user: ADMIN_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      expect(screen.getByRole('button', { name: /^Dashboard$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Queue$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Users$/i })).toBeInTheDocument();
    });

    it('Administrator landing has Dashboard with aria-current="page"', async () => {
      (useAuth as any).mockReturnValue({
        user: ADMIN_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      const dashboardBtn = screen.getByRole('button', { name: /^Dashboard$/i });
      expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
      expect(screen.getByText(/Dashboard coming soon/i)).toBeInTheDocument();
    });

    it('only one nav item has aria-current="page" at a time', async () => {
      (useAuth as any).mockReturnValue({
        user: REQUESTER_USER,
        isLoading: false,
        logout: vi.fn(),
      });

      render(<App />);

      // Initially dashboard is active
      let activeBtns = screen
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-current') === 'page');
      expect(activeBtns.length).toBe(1);

      // Navigate to My Tickets
      const myTicketsBtn = screen.getByRole('button', { name: /^My Tickets$/i });
      await userEvent.click(myTicketsBtn);

      activeBtns = screen
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-current') === 'page');
      expect(activeBtns.length).toBe(1);
      expect(activeBtns[0]).toBe(myTicketsBtn);
    });
  });
});
