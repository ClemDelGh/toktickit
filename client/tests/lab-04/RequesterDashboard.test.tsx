import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RequesterDashboard from '../../src/RequesterDashboard';

// Mock AuthContext
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, name: 'Jennifer Anderson', role: 'Requester' },
    logout: vi.fn(),
  })),
}));

const mockDashboardData = {
  open: 5,
  waitingForYou: 2,
  resolved: 3,
  closed: 1,
  recentTickets: [
    {
      id: 101,
      ticketNumber: 'TKT-2026-0001',
      summary: 'Laptop screen flickering',
      status: 'Open',
      requestedPriority: 'High',
      itPriority: 'High',
      updatedAt: '2026-10-20T10:00:00.000Z',
      resolvedAt: null,
    },
    {
      id: 102,
      ticketNumber: 'TKT-2026-0002',
      summary: 'VPN connection issue',
      status: 'InProgress',
      requestedPriority: 'Medium',
      itPriority: 'Medium',
      updatedAt: '2026-10-19T09:00:00.000Z',
      resolvedAt: null,
    },
  ],
  attentionTickets: [
    {
      id: 103,
      ticketNumber: 'TKT-2026-0003',
      summary: 'Please confirm fix',
      status: 'WaitingForRequester',
      requestedPriority: 'Low',
      itPriority: 'Low',
      updatedAt: '2026-10-18T08:00:00.000Z',
      resolvedAt: null,
    },
  ],
  recentlyResolved: [
    {
      id: 104,
      ticketNumber: 'TKT-2026-0004',
      summary: 'Printer offline',
      status: 'Resolved',
      requestedPriority: 'Medium',
      itPriority: 'Medium',
      updatedAt: '2026-10-17T07:00:00.000Z',
      resolvedAt: '2026-10-17T07:00:00.000Z',
    },
  ],
};

const zeroDashboardData = {
  open: 0,
  waitingForYou: 0,
  resolved: 0,
  closed: 0,
  recentTickets: [],
  attentionTickets: [],
  recentlyResolved: [],
};

describe('RequesterDashboard Component (UI-13, UI-14, UI-15, UI-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // UI-13: Rendering — 4 cards + 3 listes avec données de l'API
  // -----------------------------------------------------------------------
  describe('UI-13: Rendering with API data', () => {
    it('renders 4 stat cards and 3 ticket lists with data from the API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData,
      });

      const mockSetActiveTab = vi.fn();
      const mockSetStatusFilter = vi.fn();

      render(
        <RequesterDashboard
          setActiveTab={mockSetActiveTab}
          setStatusFilter={mockSetStatusFilter}
        />
      );

      // Cards
      expect(await screen.findByText('5')).toBeInTheDocument(); // open
      expect(screen.getByText('2')).toBeInTheDocument(); // waitingForYou
      expect(screen.getByText('3')).toBeInTheDocument(); // resolved
      expect(screen.getByText('1')).toBeInTheDocument(); // closed

      // Card labels
      expect(screen.getByText(/Waiting for You/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Open/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Resolved/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Closed/i).length).toBeGreaterThanOrEqual(1);

      // Recent tickets section
      expect(screen.getByText('Laptop screen flickering')).toBeInTheDocument();
      expect(screen.getByText('VPN connection issue')).toBeInTheDocument();

      // Attention tickets section
      expect(screen.getByText('Please confirm fix')).toBeInTheDocument();

      // Recently resolved section
      expect(screen.getByText('Printer offline')).toBeInTheDocument();

      // Quick Actions
      expect(screen.getByRole('button', { name: /Create Ticket/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /My Tickets/i })).toBeInTheDocument();

      // Refresh button
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // UI-14: Zero-state — shows 0, empty-list messages, Create Ticket CTA
  // -----------------------------------------------------------------------
  describe('UI-14: Zero-state display', () => {
    it('shows 0 counts, empty list messages, and Create Ticket CTA when no tickets', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => zeroDashboardData,
      });

      render(
        <RequesterDashboard
          setActiveTab={vi.fn()}
          setStatusFilter={vi.fn()}
        />
      );

      // All counts should be 0
      await waitFor(() => {
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThanOrEqual(4);
      });

      // Empty list messages
      expect(screen.getAllByText(/No tickets/i).length).toBeGreaterThanOrEqual(1);

      // Create Ticket CTA visible
      expect(screen.getByRole('button', { name: /Create Ticket/i })).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // UI-15: Card drill-down — cliquer "Open" appelle setActiveTab('list')
  // -----------------------------------------------------------------------
  describe('UI-15: Card drill-down navigation', () => {
    it('clicking the Open card calls setActiveTab with "list" and correct status filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData,
      });

      const mockSetActiveTab = vi.fn();
      const mockSetStatusFilter = vi.fn();

      render(
        <RequesterDashboard
          setActiveTab={mockSetActiveTab}
          setStatusFilter={mockSetStatusFilter}
        />
      );

      // Wait for dashboard to load
      await screen.findByText('5');

      // Find and click the "Open" card
      const openCard = screen.getByTestId('card-open');
      await userEvent.click(openCard);

      expect(mockSetActiveTab).toHaveBeenCalledWith('list');
      expect(mockSetStatusFilter).toHaveBeenCalledWith(
        'New,Open,InProgress,WaitingForRequester,Reopened'
      );
    });

    it('clicking the Waiting for You card sets correct status filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData,
      });

      const mockSetActiveTab = vi.fn();
      const mockSetStatusFilter = vi.fn();

      render(
        <RequesterDashboard
          setActiveTab={mockSetActiveTab}
          setStatusFilter={mockSetStatusFilter}
        />
      );

      await screen.findByText('2');

      const card = screen.getByTestId('card-waitingForYou');
      await userEvent.click(card);

      expect(mockSetActiveTab).toHaveBeenCalledWith('list');
      expect(mockSetStatusFilter).toHaveBeenCalledWith('WaitingForRequester');
    });

    it('clicking the Resolved card sets correct status filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData,
      });

      const mockSetActiveTab = vi.fn();
      const mockSetStatusFilter = vi.fn();

      render(
        <RequesterDashboard
          setActiveTab={mockSetActiveTab}
          setStatusFilter={mockSetStatusFilter}
        />
      );

      await screen.findByText('3');

      const card = screen.getByTestId('card-resolved');
      await userEvent.click(card);

      expect(mockSetActiveTab).toHaveBeenCalledWith('list');
      expect(mockSetStatusFilter).toHaveBeenCalledWith('Resolved');
    });

    it('clicking the Closed card sets correct status filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData,
      });

      const mockSetActiveTab = vi.fn();
      const mockSetStatusFilter = vi.fn();

      render(
        <RequesterDashboard
          setActiveTab={mockSetActiveTab}
          setStatusFilter={mockSetStatusFilter}
        />
      );

      await screen.findByText('1');

      const card = screen.getByTestId('card-closed');
      await userEvent.click(card);

      expect(mockSetActiveTab).toHaveBeenCalledWith('list');
      expect(mockSetStatusFilter).toHaveBeenCalledWith('Closed');
    });
  });

  // -----------------------------------------------------------------------
  // UI-16: Loading, error + Retry
  // -----------------------------------------------------------------------
  describe('UI-16: Loading and error states', () => {
    it('shows a loading spinner with accessible text while fetching', () => {
      // Never resolves to keep loading state
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      render(
        <RequesterDashboard
          setActiveTab={vi.fn()}
          setStatusFilter={vi.fn()}
        />
      );

      // Spinner role="status" should be present
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();
    });

    it('shows an error message and Retry button on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <RequesterDashboard
          setActiveTab={vi.fn()}
          setStatusFilter={vi.fn()}
        />
      );

      expect(await screen.findByRole('button', { name: /Retry/i })).toBeInTheDocument();
      // Generic error message (not exposing internal error)
      expect(screen.getByText(/Unable to load dashboard/i)).toBeInTheDocument();
    });

    it('refetches data when Retry is clicked', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData,
        });
      });

      render(
        <RequesterDashboard
          setActiveTab={vi.fn()}
          setStatusFilter={vi.fn()}
        />
      );

      const retryBtn = await screen.findByRole('button', { name: /Retry/i });
      await userEvent.click(retryBtn);

      // After retry, data should load
      expect(await screen.findByText('5')).toBeInTheDocument();
    });
  });
});
