import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffTicketDetail from '../../src/StaffTicketDetail';
import RequesterTicketDetail from '../../src/RequesterTicketDetail';

// Mock AuthContext
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 2, name: 'Alex Tech', role: 'ITStaff' },
    logout: vi.fn(),
  })),
}));

import { useAuth } from '../../src/contexts/AuthContext';

describe('Ticket Workflow Component Tests (UI-08 through UI-12)', () => {
  const baseTicket = {
    id: 101,
    ticketNumber: 'TKT-2026-9002',
    summary: 'Email client crashes',
    description: 'Outlook crashes when opening large attachments',
    requestedPriority: 'High',
    itPriority: 'High',
    status: 'Open',
    version: 1,
    createdAt: '2026-03-01T08:00:00.000Z',
    category: { id: 1, name: 'Software' },
    relatedSystem: { id: 1, name: 'Email' },
    requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.a@example.com' },
    ticketOwner: { id: 2, name: 'Alex Tech', email: 'it1@example.com' },
    comments: [],
    internalNotes: [],
    attachments: [],
    resolutionSummary: null,
    resolvedAt: null,
    closedAt: null,
    requesterResolvedIndicatedAt: null,
    allowedTransitions: ['InProgress', 'WaitingForRequester', 'Resolved', 'Cancelled'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 2, name: 'Alex Tech', role: 'ITStaff' },
      logout: vi.fn(),
    });
  });

  // UI-08: Status control options
  describe('UI-08: Status control options', () => {
    it('shows only current status and allowed transitions for Staff, and no status controls for Requester', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/actions')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => baseTicket,
        });
      });

      // 1. Staff view
      const { unmount } = render(<StaffTicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />);

      const statusSelect = await screen.findByLabelText(/Status/i) as HTMLSelectElement;
      expect(statusSelect).toBeInTheDocument();

      const options = Array.from(statusSelect.options).map((o) => o.value);
      expect(options).toContain('Open'); // Current status
      expect(options).toContain('InProgress');
      expect(options).toContain('WaitingForRequester');
      expect(options).toContain('Resolved');
      expect(options).toContain('Cancelled');

      // Invalid transitions like New, Closed, Reopened must NOT be present
      expect(options).not.toContain('New');
      expect(options).not.toContain('Closed');
      expect(options).not.toContain('Reopened');

      unmount();

      // 2. Requester view
      (useAuth as any).mockReturnValue({
        user: { id: 1, name: 'Jennifer Anderson', role: 'Requester' },
        logout: vi.fn(),
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/actions')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...baseTicket, allowedTransitions: [] }),
        });
      });

      render(<RequesterTicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/TKT-2026-9002/)).toBeInTheDocument();
      });

      // No status dropdown control for Requester
      expect(screen.queryByLabelText(/Status/i)).toBeNull();
    });
  });

  // UI-09: Choose Resolved
  describe('UI-09: Choose Resolved requires summary and shows blockers on RESOLUTION_BLOCKED', () => {
    it('reveals resolution summary field when Resolved is selected and shows checklist of blockers on failure', async () => {
      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/actions')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 422,
            json: async () => ({
              error: 'Resolution gate conditions not met',
              code: 'RESOLUTION_BLOCKED',
              blockers: ['NO_ACTIONS', 'OPEN_FOLLOW_UP'],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => baseTicket,
        });
      });

      render(<StaffTicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />);

      const statusSelect = await screen.findByLabelText(/Status/i);
      await userEvent.selectOptions(statusSelect, 'Resolved');

      // Resolution Summary field is revealed
      const summaryInput = await screen.findByLabelText(/Resolution Summary/i);
      expect(summaryInput).toBeInTheDocument();

      // Submit form
      const saveBtn = screen.getByRole('button', { name: /Save Properties|Update Ticket/i });
      await userEvent.click(saveBtn);

      // Check blockers checklist is displayed
      expect(await screen.findByText(/Resolution Blocked/i)).toBeInTheDocument();
      expect(screen.getByText(/At least one Action Taken must be recorded/i)).toBeInTheDocument();
      expect(screen.getByText(/All Action Taken follow-ups must be completed/i)).toBeInTheDocument();
    });
  });

  // UI-10: Problem Appears Resolved (Requester) and staff view
  describe('UI-10: Advisory indicator in Requester and Staff views', () => {
    it('shows confirmation text in Requester view and callout in Staff view', async () => {
      // 1. Requester indicates resolution
      (useAuth as any).mockReturnValue({
        user: { id: 1, name: 'Jennifer Anderson', role: 'Requester' },
        logout: vi.fn(),
      });

      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/actions')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ...baseTicket,
              requesterResolvedIndicatedAt: '2026-03-02T14:30:00.000Z',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => baseTicket,
        });
      });

      const { unmount } = render(
        <RequesterTicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />
      );

      const resolveBtn = await screen.findByRole('button', {
        name: /Problem Appears Resolved/i,
      });
      await userEvent.click(resolveBtn);

      // Turns into confirmation text
      expect(
        await screen.findByText(/You indicated this problem appears resolved/i)
      ).toBeInTheDocument();

      // Status badge remains unchanged ("Open")
      expect(screen.getByText('Open')).toBeInTheDocument();

      unmount();

      // 2. Staff view displays advisory callout
      (useAuth as any).mockReturnValue({
        user: { id: 2, name: 'Alex Tech', role: 'ITStaff' },
        logout: vi.fn(),
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/actions')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...baseTicket,
            requesterResolvedIndicatedAt: '2026-03-02T14:30:00.000Z',
          }),
        });
      });

      render(<StaffTicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />);

      expect(
        await screen.findByText(/Requester indicates this is resolved/i)
      ).toBeInTheDocument();
    });
  });

  // UI-11: 409 on Ticket save
  describe('UI-11: Stale update (409) conflict handling', () => {
    it('shows conflict message on 409, preserves form values, and allows reloading', async () => {
      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes('/actions')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({
              error: 'The ticket has been modified by another user',
              code: 'STALE_UPDATE',
              current: { ...baseTicket, version: 2, itPriority: 'Low' },
            }),
          });
        }
        fetchCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...baseTicket, version: fetchCount }),
        });
      });

      render(<StaffTicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />);

      const prioritySelect = await screen.findByLabelText(/IT Priority/i);
      await userEvent.selectOptions(prioritySelect, 'Low');

      const saveBtn = screen.getByRole('button', { name: /Save Properties|Update Ticket/i });
      await userEvent.click(saveBtn);

      // Conflict message is shown
      expect(
        await screen.findByText(/The ticket has been modified by another user|conflict/i)
      ).toBeInTheDocument();

      // Form value is preserved
      expect((prioritySelect as HTMLSelectElement).value).toBe('Low');

      // Reload button works
      const reloadBtn = screen.getByRole('button', { name: /Reload/i });
      await userEvent.click(reloadBtn);

      expect(fetchCount).toBeGreaterThan(1);
    });
  });

  // UI-12: Closed/Cancelled Ticket
  describe('UI-12: Terminal state locking (Closed/Cancelled)', () => {
    it('disables ticket property controls and shows explanation when status is Closed or Cancelled', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/actions')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...baseTicket,
            status: 'Closed',
            allowedTransitions: [],
          }),
        });
      });

      render(<StaffTicketDetail ticketId={baseTicket.id} onBack={vi.fn()} />);

      // Explanation is displayed
      expect(
        await screen.findByText(/This ticket is closed and cannot be modified|locked/i)
      ).toBeInTheDocument();

      // Save button is disabled or hidden
      const saveBtn = screen.queryByRole('button', { name: /Save Properties|Update Ticket/i });
      if (saveBtn) {
        expect(saveBtn).toBeDisabled();
      }
    });
  });
});
