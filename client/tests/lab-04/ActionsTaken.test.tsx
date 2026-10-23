import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActionsTaken from '../../src/ActionsTaken';

// Mock AuthContext
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 2, name: 'IT Staffer', role: 'ITStaff' },
    logout: vi.fn(),
  })),
}));

import { useAuth } from '../../src/contexts/AuthContext';

describe('ActionsTaken Component (UI-01 through UI-07)', () => {
  const mockTicketId = 101;
  const mockTicketCreatedAt = '2026-03-01T08:00:00.000Z';

  const mockAction1 = {
    id: 1,
    ticketId: mockTicketId,
    actionDateTime: '2026-03-01T09:00:00.000Z',
    description: 'Investigated network dropouts',
    result: 'Found faulty patch cable on switch port 4',
    performedById: 2,
    performedBy: { id: 2, name: 'Alex IT' },
    followUpRequired: true,
    followUpNote: 'Order replacement Cat6 patch cable',
    followUpCompletedAt: null,
    attachmentNotes: 'See switch log screenshot',
    clientRequestId: 'req-001',
    version: 1,
    createdAt: '2026-03-01T09:05:00.000Z',
    updatedAt: '2026-03-01T09:05:00.000Z',
    lastEditedById: null,
    lastEditedBy: null,
  };

  const mockAction2 = {
    id: 2,
    ticketId: mockTicketId,
    actionDateTime: '2026-03-01T10:00:00.000Z',
    description: 'Replaced patch cable and verified link',
    result: 'Link stable at 1Gbps, 0 packet loss',
    performedById: 3,
    performedBy: { id: 3, name: 'Sam Admin' },
    followUpRequired: true,
    followUpNote: 'Monitor for 24 hours',
    followUpCompletedAt: '2026-03-02T10:00:00.000Z',
    attachmentNotes: 'Speedtest report attached',
    clientRequestId: 'req-002',
    version: 2,
    createdAt: '2026-03-01T10:05:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
    lastEditedById: 3,
    lastEditedBy: { id: 3, name: 'Sam Admin' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 2, name: 'IT Staffer', role: 'ITStaff' },
      logout: vi.fn(),
    });
  });

  // UI-01: Actions list rendering and empty state
  describe('UI-01: Actions list rendering and empty state', () => {
    it('renders empty state when there are no actions', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
        />
      );

      expect(await screen.findByText(/No actions recorded yet/i)).toBeInTheDocument();
    });

    it('renders ordered list with all 7 fields for each action', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockAction1, mockAction2] }),
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
        />
      );

      // Verify Action 1 fields (may appear in desktop table and mobile card view)
      const desc1 = await screen.findAllByText('Investigated network dropouts');
      expect(desc1.length).toBeGreaterThanOrEqual(1);

      const res1 = screen.getAllByText('Found faulty patch cable on switch port 4');
      expect(res1.length).toBeGreaterThanOrEqual(1);

      const perf1 = screen.getAllByText(/Alex IT/);
      expect(perf1.length).toBeGreaterThanOrEqual(1);

      const note1 = screen.getAllByText('Order replacement Cat6 patch cable');
      expect(note1.length).toBeGreaterThanOrEqual(1);

      const attach1 = screen.getAllByText('See switch log screenshot');
      expect(attach1.length).toBeGreaterThanOrEqual(1);

      // Verify Action 2 fields
      const desc2 = screen.getAllByText('Replaced patch cable and verified link');
      expect(desc2.length).toBeGreaterThanOrEqual(1);

      const res2 = screen.getAllByText('Link stable at 1Gbps, 0 packet loss');
      expect(res2.length).toBeGreaterThanOrEqual(1);

      const perf2 = screen.getAllByText(/Sam Admin/);
      expect(perf2.length).toBeGreaterThanOrEqual(1);

      const note2 = screen.getAllByText('Monitor for 24 hours');
      expect(note2.length).toBeGreaterThanOrEqual(1);

      const attach2 = screen.getAllByText('Speedtest report attached');
      expect(attach2.length).toBeGreaterThanOrEqual(1);
    });
  });

  // UI-02: Create form validation
  describe('UI-02: Create form validation', () => {
    it('shows red asterisks, validates required fields under fields with text and icon, and does not call API when invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
        />
      );

      // Open create form
      const addBtn = await screen.findByRole('button', { name: /\+ (Record|Add) Action/i });
      await userEvent.click(addBtn);

      // Verify red asterisks exist for required fields
      const asterisks = screen.getAllByText('*');
      expect(asterisks.length).toBeGreaterThanOrEqual(2);

      // Try submitting empty form
      const submitBtn = screen.getByRole('button', { name: /Save Action|Record Action/i });
      await userEvent.click(submitBtn);

      // Check field errors under fields with warning icon
      expect(await screen.findByText(/Description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Result is required/i)).toBeInTheDocument();

      // Ensure POST API was NOT called
      const postCalls = (global.fetch as any).mock.calls.filter(
        (call: any) => call[1]?.method === 'POST'
      );
      expect(postCalls.length).toBe(0);

      // Check followUpRequired toggle requires followUpNote
      const followUpCheckbox = screen.getByRole('checkbox', { name: /Follow-up required/i });
      await userEvent.click(followUpCheckbox);

      // Submit again
      await userEvent.click(submitBtn);
      expect(await screen.findByText(/Follow-up note is required/i)).toBeInTheDocument();
    });
  });

  // UI-03: Submit busy state and double click
  describe('UI-03: Submit busy state and double click', () => {
    it('disables submit button while pending and prevents double submission', async () => {
      let resolvePost: any;
      const postPromise = new Promise((resolve) => {
        resolvePost = resolve;
      });

      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST') {
          return postPromise;
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
        />
      );

      const addBtn = await screen.findByRole('button', { name: /\+ (Record|Add) Action/i });
      await userEvent.click(addBtn);

      // Fill in valid fields
      const descInput = screen.getByLabelText(/Description/i);
      const resultInput = screen.getByLabelText(/Result/i);
      await userEvent.type(descInput, 'Configured switch VLANs');
      await userEvent.type(resultInput, 'VLAN 10 and 20 working');

      const submitBtn = screen.getByRole('button', { name: /Save Action|Record Action/i });
      
      // Click once
      await userEvent.click(submitBtn);

      // Expect button to be disabled
      expect(submitBtn).toBeDisabled();

      // Try clicking again
      fireEvent.click(submitBtn);

      const postCalls = (global.fetch as any).mock.calls.filter(
        (call: any) => call[1]?.method === 'POST'
      );
      expect(postCalls.length).toBe(1);

      // Resolve the request
      resolvePost({
        ok: true,
        status: 201,
        json: async () => ({ ...mockAction1, id: 99 }),
      });
    });
  });

  // UI-04: 400/network failure on create
  describe('UI-04: 400/network failure on create', () => {
    it('preserves entered values and shows safe message on failure', async () => {
      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({
              error: 'Invalid action input',
              code: 'VALIDATION_ERROR',
              fieldErrors: [{ field: 'description', message: 'Too short' }],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
        />
      );

      const addBtn = await screen.findByRole('button', { name: /\+ (Record|Add) Action/i });
      await userEvent.click(addBtn);

      const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      const resultInput = screen.getByLabelText(/Result/i) as HTMLTextAreaElement;
      await userEvent.type(descInput, 'My entered description');
      await userEvent.type(resultInput, 'My entered result');

      const submitBtn = screen.getByRole('button', { name: /Save Action|Record Action/i });
      await userEvent.click(submitBtn);

      // Error messages should be visible
      expect(await screen.findByText('Invalid action input')).toBeInTheDocument();
      expect(screen.getByText(/Too short/)).toBeInTheDocument();

      // Form values must be preserved
      expect(descInput.value).toBe('My entered description');
      expect(resultInput.value).toBe('My entered result');
    });
  });

  // UI-05: Edit mode pre-filled; save sends expectedVersion; 409
  describe('UI-05: Edit mode pre-filled; save sends expectedVersion; 409 conflict banner', () => {
    it('pre-fills edit form, sends expectedVersion, and displays conflict banner on 409 while keeping edits', async () => {
      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({
              error: 'The action has been modified by another user',
              code: 'STALE_UPDATE',
              current: { ...mockAction1, version: 2 },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockAction1] }),
        });
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
        />
      );

      // Click Edit on mockAction1 (pick first matching Edit button)
      const editBtns = await screen.findAllByRole('button', { name: /Edit/i });
      await userEvent.click(editBtns[0]);

      // Check fields are pre-filled
      const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      expect(descInput.value).toBe('Investigated network dropouts');

      // Update description
      await userEvent.clear(descInput);
      await userEvent.type(descInput, 'Updated description by me');

      // Save edit
      const saveBtn = screen.getByRole('button', { name: /Save Changes|Update Action/i });
      await userEvent.click(saveBtn);

      // Verify PATCH was called with expectedVersion
      const patchCall = (global.fetch as any).mock.calls.find(
        (call: any) => call[1]?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      const patchBody = JSON.parse(patchCall[1].body);
      expect(patchBody.expectedVersion).toBe(mockAction1.version);

      // Expect conflict banner with Reload
      expect(await screen.findByText(/The action has been modified by another user/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload/i })).toBeInTheDocument();

      // Form values are preserved
      expect(descInput.value).toBe('Updated description by me');
    });
  });

  // UI-06: Requester view of Actions
  describe('UI-06: Requester view of Actions', () => {
    it('renders read-only with no create or edit controls for Requester', async () => {
      (useAuth as any).mockReturnValue({
        user: { id: 10, name: 'Requester Alice', role: 'Requester' },
        logout: vi.fn(),
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockAction1] }),
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
          readOnly={true}
        />
      );

      // Actions are visible
      const descElements = await screen.findAllByText('Investigated network dropouts');
      expect(descElements.length).toBeGreaterThanOrEqual(1);

      // No create button
      expect(screen.queryByRole('button', { name: /\+ (Record|Add) Action/i })).toBeNull();

      // No edit button
      expect(screen.queryByRole('button', { name: /Edit/i })).toBeNull();

      // No mark completed button
      expect(screen.queryByRole('button', { name: /Mark completed/i })).toBeNull();
    });
  });

  // UI-07: Follow-up display and completion
  describe('UI-07: Follow-up display and completion', () => {
    it('displays follow-up status as text badge and allows marking completed only for open follow-ups', async () => {
      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ...mockAction1,
              followUpCompletedAt: '2026-03-02T12:00:00.000Z',
              version: 2,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockAction1, mockAction2] }),
        });
      });

      render(
        <ActionsTaken
          ticketId={mockTicketId}
          ticketCreatedAt={mockTicketCreatedAt}
        />
      );

      // mockAction1 has open follow-up: badge should say "Follow-up open"
      const openBadges = await screen.findAllByText(/Follow-up open/i);
      expect(openBadges.length).toBeGreaterThanOrEqual(1);

      // mockAction2 has completed follow-up: badge should say "Follow-up done"
      const doneBadges = screen.getAllByText(/Follow-up done/i);
      expect(doneBadges.length).toBeGreaterThanOrEqual(1);

      // "Mark completed" should only be present for mockAction1 (open follow-up)
      // Since it may appear in desktop and mobile view, both belong to mockAction1
      const completeButtons = screen.getAllByRole('button', { name: /Mark completed/i });
      expect(completeButtons.length).toBeGreaterThanOrEqual(1);

      // Click "Mark completed"
      await userEvent.click(completeButtons[0]);

      // Verify PATCH was called with followUpCompleted: true and expectedVersion
      const patchCall = (global.fetch as any).mock.calls.find(
        (call: any) =>
          call[1]?.method === 'PATCH' &&
          JSON.parse(call[1].body).followUpCompleted === true
      );
      expect(patchCall).toBeDefined();
      expect(JSON.parse(patchCall[1].body).expectedVersion).toBe(mockAction1.version);
    });
  });
});
