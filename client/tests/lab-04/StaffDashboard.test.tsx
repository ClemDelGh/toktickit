import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffDashboard from '../../src/StaffDashboard';

const mockStaffDashboardData = {
  generatedAt: '2026-10-24T00:00:00.000Z',
  unassigned: 4,
  myAssigned: 3,
  byStatus: {
    New: 2,
    Open: 3,
    InProgress: 2,
    WaitingForRequester: 1,
    Resolved: 4,
    Closed: 5,
    Reopened: 1,
    Cancelled: 0,
  },
  byItPriority: {
    High: 3,
    Medium: 4,
    Low: 2,
  },
  awaitingReview: 2,
  myOpenFollowUps: 1,
  myRecentTickets: [
    {
      id: 201,
      ticketNumber: 'TKT-2026-0010',
      summary: 'Printer offline in building A',
      status: 'Open',
      requestedPriority: 'Medium',
      itPriority: 'Medium',
      updatedAt: '2026-10-24T00:00:00.000Z',
      resolvedAt: null,
    },
    {
      id: 202,
      ticketNumber: 'TKT-2026-0011',
      summary: 'Email delivery delay',
      status: 'InProgress',
      requestedPriority: 'High',
      itPriority: 'High',
      updatedAt: '2026-10-23T00:00:00.000Z',
      resolvedAt: null,
    },
  ],
  urgentTickets: [
    {
      id: 203,
      ticketNumber: 'TKT-2026-0005',
      summary: 'Core switch malfunction',
      status: 'Open',
      requestedPriority: 'High',
      itPriority: 'High',
      updatedAt: '2026-10-22T00:00:00.000Z',
      resolvedAt: null,
    },
  ],
  myRecentActions: [
    {
      id: 301,
      ticketId: 201,
      description: 'Replaced toner and power cycled the network interface',
      actionDateTime: '2026-10-24T00:00:00.000Z',
      result: 'Printer online',
    },
  ],
};

const mockAdminDashboardData = {
  ...mockStaffDashboardData,
  userCounts: {
    active: 10,
    inactive: 2,
    byRole: {
      Requester: 7,
      ITStaff: 3,
      Administrator: 2,
    },
  },
};

const emptyDashboardData = {
  generatedAt: '2026-10-24T00:00:00.000Z',
  unassigned: 0,
  myAssigned: 0,
  byStatus: {
    New: 0,
    Open: 0,
    InProgress: 0,
    WaitingForRequester: 0,
    Resolved: 0,
    Closed: 0,
    Reopened: 0,
    Cancelled: 0,
  },
  byItPriority: {
    High: 0,
    Medium: 0,
    Low: 0,
  },
  awaitingReview: 0,
  myOpenFollowUps: 0,
  myRecentTickets: [],
  urgentTickets: [],
  myRecentActions: [],
};

describe('StaffDashboard Component (UI-17, UI-18, UI-19)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // UI-17: Rendering Staff + Admin
  // -----------------------------------------------------------------------
  describe('UI-17: Rendering for ITStaff and Administrator', () => {
    it('renders all metrics cards and 3 lists for ITStaff, without Users card', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      // Workload cards
      const unassignedCard = await screen.findByTestId('card-unassigned');
      expect(unassignedCard).toHaveTextContent('4');
      expect(unassignedCard).toHaveTextContent(/Unassigned/i);

      const myAssignedCard = screen.getByTestId('card-myAssigned');
      expect(myAssignedCard).toHaveTextContent('3');
      expect(myAssignedCard).toHaveTextContent(/My Assigned/i);

      // Status breakdown
      expect(screen.getByText(/New/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Open/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Waiting for Requester/i)).toBeInTheDocument();

      // Priority breakdown
      expect(screen.getAllByText(/High/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Medium/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Low/i).length).toBeGreaterThanOrEqual(1);

      // Awaiting review & follow-ups
      expect(screen.getByText(/Requester Says Resolved/i)).toBeInTheDocument();
      expect(screen.getByText(/My Open Follow-Ups/i)).toBeInTheDocument();

      // 3 Lists
      expect(screen.getByText('Printer offline in building A')).toBeInTheDocument();
      expect(screen.getByText('Email delivery delay')).toBeInTheDocument();
      expect(screen.getByText('Core switch malfunction')).toBeInTheDocument();
      expect(screen.getByText('Replaced toner and power cycled the network interface')).toBeInTheDocument();
      expect(screen.getByText('Printer online')).toBeInTheDocument();

      // Refresh button
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();

      // Users card should NOT be rendered for ITStaff
      expect(screen.queryByTestId('card-users')).not.toBeInTheDocument();
      expect(screen.queryByText(/Users/i)).not.toBeInTheDocument();
    });

    it('renders Users card for Administrator', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAdminDashboardData,
      });

      render(
        <StaffDashboard
          user={{ role: 'Administrator' }}
          setActiveTab={vi.fn()}
          setQueueFilter={vi.fn()}
        />
      );

      // Users card should be rendered
      expect(await screen.findByTestId('card-users')).toBeInTheDocument();
      expect(screen.getByText(/Users/i)).toBeInTheDocument();
      expect(screen.getByText('10 active')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // UI-18: Card activation (drill-down to queue)
  // -----------------------------------------------------------------------
  describe('UI-18: Card activation and queue filter navigation', () => {
    it('clicking Unassigned card navigates to queue with owner=unassigned', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      const unassignedCard = await screen.findByTestId('card-unassigned');
      await userEvent.click(unassignedCard);

      expect(setQueueFilter).toHaveBeenCalledWith({ owner: 'unassigned' });
      expect(setActiveTab).toHaveBeenCalledWith('queue');
    });

    it('clicking My Assigned card navigates to queue with owner=me', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      const myAssignedCard = await screen.findByTestId('card-myAssigned');
      await userEvent.click(myAssignedCard);

      expect(setQueueFilter).toHaveBeenCalledWith({ owner: 'me' });
      expect(setActiveTab).toHaveBeenCalledWith('queue');
    });

    it('clicking a status card navigates to queue with status filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      const openCard = await screen.findByTestId('card-status-Open');
      await userEvent.click(openCard);

      expect(setQueueFilter).toHaveBeenCalledWith({ status: 'Open' });
      expect(setActiveTab).toHaveBeenCalledWith('queue');
    });

    it('clicking a priority card navigates to queue with itPriority filter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      const highCard = await screen.findByTestId('card-priority-High');
      await userEvent.click(highCard);

      expect(setQueueFilter).toHaveBeenCalledWith({ itPriority: 'High' });
      expect(setActiveTab).toHaveBeenCalledWith('queue');
    });

    it('clicking Requester Says Resolved card navigates to queue with indicated=true', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      const indicatedCard = await screen.findByTestId('card-awaitingReview');
      await userEvent.click(indicatedCard);

      expect(setQueueFilter).toHaveBeenCalledWith({ indicated: 'true' });
      expect(setActiveTab).toHaveBeenCalledWith('queue');
    });

    it('clicking My Open Follow-Ups card does not navigate (informative only)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      const followUpCard = await screen.findByTestId('card-myOpenFollowUps');
      await userEvent.click(followUpCard);

      expect(setActiveTab).not.toHaveBeenCalled();
      expect(setQueueFilter).not.toHaveBeenCalled();
    });

    it('clicking Users card for Administrator navigates to users tab', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAdminDashboardData,
      });

      const setActiveTab = vi.fn();
      const setQueueFilter = vi.fn();

      render(
        <StaffDashboard
          user={{ role: 'Administrator' }}
          setActiveTab={setActiveTab}
          setQueueFilter={setQueueFilter}
        />
      );

      const usersCard = await screen.findByTestId('card-users');
      await userEvent.click(usersCard);

      expect(setActiveTab).toHaveBeenCalledWith('users');
    });
  });

  // -----------------------------------------------------------------------
  // UI-19: Distinct states (loading, empty, forbidden, failure)
  // -----------------------------------------------------------------------
  describe('UI-19: Distinct dashboard states', () => {
    it('shows accessible loading indicator while fetching', () => {
      // Pending promise
      global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={vi.fn()}
          setQueueFilter={vi.fn()}
        />
      );

      expect(screen.getByText(/Loading staff dashboard.../i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows zero counts and empty-list messages in empty state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => emptyDashboardData,
      });

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={vi.fn()}
          setQueueFilter={vi.fn()}
        />
      );

      // Counts should be 0
      const zeros = await screen.findAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(4);

      // Empty messages
      expect(screen.getByText(/No tickets assigned to you/i)).toBeInTheDocument();
      expect(screen.getByText(/No urgent tickets/i)).toBeInTheDocument();
      expect(screen.getByText(/No recent actions/i)).toBeInTheDocument();
    });

    it('shows distinct failure state with Retry button on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={vi.fn()}
          setQueueFilter={vi.fn()}
        />
      );

      expect(await screen.findByText(/Unable to load staff dashboard/i)).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Test Retry clicks refetches
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStaffDashboardData,
      });

      await userEvent.click(retryBtn);
      expect(await screen.findByText('Printer offline in building A')).toBeInTheDocument();
    });

    it('shows distinct forbidden state when API returns 403', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      });

      render(
        <StaffDashboard
          user={{ role: 'ITStaff' }}
          setActiveTab={vi.fn()}
          setQueueFilter={vi.fn()}
        />
      );

      expect(await screen.findByText(/Access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/You do not have permission to view the staff dashboard/i)).toBeInTheDocument();
    });
  });
});
