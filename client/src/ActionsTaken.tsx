import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

export interface ActionTaken {
  id: number;
  ticketId: number;
  actionDateTime: string;
  description: string;
  result: string;
  performedById: number;
  performedBy: { id: number; name: string };
  followUpRequired: boolean;
  followUpNote: string | null;
  followUpCompletedAt: string | null;
  attachmentNotes: string | null;
  clientRequestId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastEditedById?: number | null;
  lastEditedBy?: { id: number; name: string } | null;
}

export interface ActionsTakenProps {
  ticketId: number;
  ticketCreatedAt?: string;
  ticketStatus?: string;
  readOnly?: boolean;
  onActionSaved?: () => void;
}

interface ActionFormState {
  actionDateTime: string;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

interface FieldErrors {
  actionDateTime?: string;
  description?: string;
  result?: string;
  followUpNote?: string;
  attachmentNotes?: string;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export default function ActionsTaken({
  ticketId,
  ticketCreatedAt,
  ticketStatus,
  readOnly = false,
  onActionSaved,
}: ActionsTakenProps) {
  let user: any = null;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch {
    user = null;
  }
  const isRequester = readOnly || user?.role === 'Requester';
  const isTerminal = ticketStatus === 'Closed' || ticketStatus === 'Cancelled';

  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form mode: 'none' | 'create' | 'edit'
  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingAction, setEditingAction] = useState<ActionTaken | null>(null);

  // Form fields
  const [formData, setFormData] = useState<ActionFormState>({
    actionDateTime: toLocalDatetimeString(new Date()),
    description: '',
    result: '',
    followUpRequired: false,
    followUpNote: '',
    attachmentNotes: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [clientRequestId, setClientRequestId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const fetchActions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/actions`, {
        credentials: 'include',
      });
      if (!res || !res.ok) {
        throw new Error('Failed to load actions taken');
      }
      const data = await res.json();
      setActions(data?.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading actions taken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchActions();
    }
  }, [ticketId]);

  const openCreateForm = () => {
    setFormData({
      actionDateTime: toLocalDatetimeString(new Date()),
      description: '',
      result: '',
      followUpRequired: false,
      followUpNote: '',
      attachmentNotes: '',
    });
    setFieldErrors({});
    setFormError(null);
    setConflictError(null);
    setClientRequestId(
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    );
    setEditingAction(null);
    setFormMode('create');
  };

  const openEditForm = (action: ActionTaken) => {
    const actionDate = new Date(action.actionDateTime);
    setFormData({
      actionDateTime: !isNaN(actionDate.getTime())
        ? toLocalDatetimeString(actionDate)
        : '',
      description: action.description,
      result: action.result,
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote || '',
      attachmentNotes: action.attachmentNotes || '',
    });
    setFieldErrors({});
    setFormError(null);
    setConflictError(null);
    setEditingAction(action);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode('none');
    setEditingAction(null);
    setFieldErrors({});
    setFormError(null);
    setConflictError(null);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!formData.actionDateTime.trim()) {
      errors.actionDateTime = 'Action date/time is required';
    } else {
      const date = new Date(formData.actionDateTime);
      if (isNaN(date.getTime())) {
        errors.actionDateTime = 'Invalid date format';
      } else {
        const fiveMinutesFuture = Date.now() + 5 * 60 * 1000;
        if (date.getTime() > fiveMinutesFuture) {
          errors.actionDateTime = 'Action date/time cannot be more than 5 minutes in the future';
        }
        if (ticketCreatedAt) {
          const tCreated = new Date(ticketCreatedAt);
          if (!isNaN(tCreated.getTime()) && date.getTime() < tCreated.getTime()) {
            errors.actionDateTime = 'Action date/time cannot be before ticket creation';
          }
        }
      }
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters';
    }

    if (!formData.result.trim()) {
      errors.result = 'Result is required';
    } else if (formData.result.trim().length > 1000) {
      errors.result = 'Result cannot exceed 1000 characters';
    }

    if (formData.followUpRequired) {
      if (!formData.followUpNote.trim()) {
        errors.followUpNote = 'Follow-up note is required when follow-up is needed';
      } else if (formData.followUpNote.trim().length > 1000) {
        errors.followUpNote = 'Follow-up note cannot exceed 1000 characters';
      }
    }

    if (formData.attachmentNotes && formData.attachmentNotes.trim().length > 500) {
      errors.attachmentNotes = 'Attachment notes cannot exceed 500 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setConflictError(null);

    const payload: any = {
      actionDateTime: new Date(formData.actionDateTime).toISOString(),
      description: formData.description.trim(),
      result: formData.result.trim(),
      followUpRequired: formData.followUpRequired,
      followUpNote: formData.followUpRequired ? formData.followUpNote.trim() : null,
      attachmentNotes: formData.attachmentNotes.trim() ? formData.attachmentNotes.trim() : null,
    };

    try {
      if (formMode === 'create') {
        payload.clientRequestId = clientRequestId;
        const res = await fetch(`/api/staff/tickets/${ticketId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
            const mapped: FieldErrors = {};
            for (const err of data.fieldErrors) {
              (mapped as any)[err.field] = err.message;
            }
            setFieldErrors(mapped);
          }
          throw new Error(data.error || 'Failed to record action');
        }

        closeForm();
        await fetchActions();
        onActionSaved?.();
      } else if (formMode === 'edit' && editingAction) {
        payload.expectedVersion = editingAction.version;
        const res = await fetch(`/api/staff/tickets/${ticketId}/actions/${editingAction.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.status === 409) {
          setConflictError(data.error || 'The action has been modified by another user. Reload to view the latest version.');
          return;
        }

        if (!res.ok) {
          if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
            const mapped: FieldErrors = {};
            for (const err of data.fieldErrors) {
              (mapped as any)[err.field] = err.message;
            }
            setFieldErrors(mapped);
          }
          throw new Error(data.error || 'Failed to update action');
        }

        closeForm();
        await fetchActions();
        onActionSaved?.();
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkFollowUpCompleted = async (action: ActionTaken) => {
    if (completingId !== null) return;
    setCompletingId(action.id);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          expectedVersion: action.version,
          followUpCompleted: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to mark follow-up as completed');
        return;
      }

      await fetchActions();
      onActionSaved?.();
    } catch (err: any) {
      alert(err.message || 'Failed to mark follow-up as completed');
    } finally {
      setCompletingId(null);
    }
  };

  const handleReloadConflict = async () => {
    setConflictError(null);
    await fetchActions();
    closeForm();
  };

  return (
    <div className="card shadow-sm mt-4 mb-4 border-0">
      <div
        className="card-header text-white d-flex justify-content-between align-items-center py-2 px-3"
        style={{ backgroundColor: '#006B3C' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold fs-6">Actions Taken</span>
          <span className="badge bg-light text-dark rounded-pill">
            {actions.length}
          </span>
        </div>
        {!isRequester && !isTerminal && formMode === 'none' && (
          <button
            type="button"
            className="btn btn-sm btn-light fw-bold text-success"
            onClick={openCreateForm}
          >
            + Record Action
          </button>
        )}
      </div>

      <div className="card-body p-3">
        {/* Terminal state lock explanation */}
        {isTerminal && !isRequester && (
          <div className="alert alert-secondary py-2 px-3 small mb-3">
            🔒 This ticket is {ticketStatus?.toLowerCase()} and locked. Actions Taken cannot be added or modified.
          </div>
        )}

        {/* Create / Edit Form */}
        {formMode !== 'none' && !isRequester && (
          <div className="card mb-4 border border-success bg-white shadow-sm">
            <div
              className="card-header py-2 px-3 text-white d-flex justify-content-between align-items-center"
              style={{ backgroundColor: '#0B7A46' }}
            >
              <h6 className="mb-0 fw-bold">
                {formMode === 'create' ? 'Record New Action Taken' : `Edit Action #${editingAction?.id}`}
              </h6>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={closeForm}
              />
            </div>
            <div className="card-body p-3">
              {conflictError && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <strong>⚠️ Conflict:</strong> {conflictError}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleReloadConflict}
                  >
                    Reload
                  </button>
                </div>
              )}

              {formError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-3">
                  {/* Action Date/Time */}
                  <div className="col-md-6">
                    <label htmlFor="actionDateTime" className="form-label small fw-bold">
                      Action Date/Time <span className="text-danger">*</span>
                    </label>
                    <input
                      id="actionDateTime"
                      type="datetime-local"
                      className={`form-control form-control-sm ${fieldErrors.actionDateTime ? 'is-invalid' : ''}`}
                      value={formData.actionDateTime}
                      onChange={(e) =>
                        setFormData({ ...formData, actionDateTime: e.target.value })
                      }
                      required
                    />
                    {fieldErrors.actionDateTime && (
                      <div className="text-danger small mt-1">
                        ⚠️ {fieldErrors.actionDateTime}
                      </div>
                    )}
                  </div>

                  {/* Attachment Notes */}
                  <div className="col-md-6">
                    <label htmlFor="attachmentNotes" className="form-label small fw-bold">
                      Attachment Notes <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <input
                      id="attachmentNotes"
                      type="text"
                      className={`form-control form-control-sm ${fieldErrors.attachmentNotes ? 'is-invalid' : ''}`}
                      placeholder="e.g. See switch log screenshot"
                      value={formData.attachmentNotes}
                      maxLength={500}
                      onChange={(e) =>
                        setFormData({ ...formData, attachmentNotes: e.target.value })
                      }
                    />
                    {fieldErrors.attachmentNotes && (
                      <div className="text-danger small mt-1">
                        ⚠️ {fieldErrors.attachmentNotes}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <label htmlFor="description" className="form-label small fw-bold">
                      Action Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      className={`form-control form-control-sm ${fieldErrors.description ? 'is-invalid' : ''}`}
                      placeholder="Describe the action performed..."
                      value={formData.description}
                      maxLength={2000}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required
                    />
                    {fieldErrors.description && (
                      <div className="text-danger small mt-1">
                        ⚠️ {fieldErrors.description}
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  <div className="col-12">
                    <label htmlFor="result" className="form-label small fw-bold">
                      Result <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="result"
                      rows={2}
                      className={`form-control form-control-sm ${fieldErrors.result ? 'is-invalid' : ''}`}
                      placeholder="Describe the outcome or findings..."
                      value={formData.result}
                      maxLength={1000}
                      onChange={(e) =>
                        setFormData({ ...formData, result: e.target.value })
                      }
                      required
                    />
                    {fieldErrors.result && (
                      <div className="text-danger small mt-1">
                        ⚠️ {fieldErrors.result}
                      </div>
                    )}
                  </div>

                  {/* Follow-up Required Checkbox */}
                  <div className="col-12">
                    <div className="form-check">
                      <input
                        id="followUpRequired"
                        type="checkbox"
                        className="form-check-input"
                        checked={formData.followUpRequired}
                        onChange={(e) =>
                          setFormData({ ...formData, followUpRequired: e.target.checked })
                        }
                      />
                      <label htmlFor="followUpRequired" className="form-check-label small fw-bold">
                        Follow-up required?
                      </label>
                    </div>
                  </div>

                  {/* Follow-up Note */}
                  {formData.followUpRequired && (
                    <div className="col-12 ps-4 border-start border-3 border-warning">
                      <label htmlFor="followUpNote" className="form-label small fw-bold">
                        Follow-up Note <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="followUpNote"
                        rows={2}
                        className={`form-control form-control-sm ${fieldErrors.followUpNote ? 'is-invalid' : ''}`}
                        placeholder="What follow-up work is required?"
                        value={formData.followUpNote}
                        maxLength={1000}
                        onChange={(e) =>
                          setFormData({ ...formData, followUpNote: e.target.value })
                        }
                        required
                      />
                      {fieldErrors.followUpNote && (
                        <div className="text-danger small mt-1">
                          ⚠️ {fieldErrors.followUpNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={closeForm}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-success fw-bold"
                    style={{ backgroundColor: '#006B3C', borderColor: '#006B3C' }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : formMode === 'create'
                      ? 'Record Action'
                      : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-success spinner-border-sm me-2" role="status" />
            <span className="text-muted small">Loading actions taken...</span>
          </div>
        )}

        {/* Global error */}
        {error && !loading && (
          <div className="alert alert-danger py-2 px-3 small">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && actions.length === 0 && (
          <div className="text-center py-4 text-muted small bg-light rounded border border-dashed">
            No actions recorded yet.
          </div>
        )}

        {/* Actions List */}
        {!loading && actions.length > 0 && (
          <div>
            {/* Desktop Table View (>= 992px) */}
            <div className="table-responsive d-none d-lg-block">
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th style={{ width: '15%' }}>Date/Time</th>
                    <th style={{ width: '25%' }}>Description</th>
                    <th style={{ width: '20%' }}>Result</th>
                    <th style={{ width: '12%' }}>Performed By</th>
                    <th style={{ width: '12%' }}>Follow-Up</th>
                    <th style={{ width: '16%' }}>Notes / Attachments</th>
                    {!isRequester && !isTerminal && <th style={{ width: '10%' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="small">
                  {actions.map((action) => {
                    const hasOpenFollowUp =
                      action.followUpRequired && !action.followUpCompletedAt;
                    const hasDoneFollowUp =
                      action.followUpRequired && !!action.followUpCompletedAt;

                    return (
                      <tr key={action.id}>
                        <td>
                          <div className="fw-semibold">
                            {new Date(action.actionDateTime).toLocaleString()}
                          </div>
                          {action.version > 1 && (
                            <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                              v{action.version}
                            </span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>{action.description}</td>
                        <td style={{ whiteSpace: 'pre-wrap' }}>{action.result}</td>
                        <td>
                          <span className="fw-semibold text-secondary">
                            {action.performedBy?.name || 'Unknown'}
                          </span>
                          {action.lastEditedBy && (
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              (edited by {action.lastEditedBy.name})
                            </div>
                          )}
                        </td>
                        <td>
                          {hasOpenFollowUp && (
                            <div>
                              <span className="badge bg-warning text-dark mb-1">
                                Follow-up open
                              </span>
                              {action.followUpNote && (
                                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                  {action.followUpNote}
                                </div>
                              )}
                            </div>
                          )}
                          {hasDoneFollowUp && (
                            <div>
                              <span className="badge bg-success mb-1">
                                Follow-up done
                              </span>
                              {action.followUpNote && (
                                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                  {action.followUpNote}
                                </div>
                              )}
                            </div>
                          )}
                          {!action.followUpRequired && (
                            <span className="badge bg-light text-muted border">
                              No follow-up
                            </span>
                          )}
                        </td>
                        <td>
                          {action.attachmentNotes ? (
                            <span className="text-muted">{action.attachmentNotes}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        {!isRequester && !isTerminal && (
                          <td>
                            <div className="d-flex flex-column gap-1">
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-primary py-0 px-1"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => openEditForm(action)}
                              >
                                Edit
                              </button>
                              {hasOpenFollowUp && (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-success py-0 px-1"
                                  style={{ fontSize: '0.75rem' }}
                                  disabled={completingId === action.id}
                                  onClick={() => handleMarkFollowUpCompleted(action)}
                                >
                                  {completingId === action.id ? 'Saving...' : 'Mark completed'}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View (< 992px) */}
            <div className="d-lg-none d-flex flex-column gap-3">
              {actions.map((action) => {
                const hasOpenFollowUp =
                  action.followUpRequired && !action.followUpCompletedAt;
                const hasDoneFollowUp =
                  action.followUpRequired && !!action.followUpCompletedAt;

                return (
                  <div key={action.id} className="card border bg-white shadow-sm">
                    <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-bold small me-2">
                          {new Date(action.actionDateTime).toLocaleString()}
                        </span>
                        {action.version > 1 && (
                          <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                            v{action.version}
                          </span>
                        )}
                      </div>
                      <span className="badge bg-secondary">
                        {action.performedBy?.name || 'Unknown'}
                      </span>
                    </div>

                    <div className="card-body p-3 small">
                      <div className="mb-2">
                        <strong className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                          Description:
                        </strong>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{action.description}</div>
                      </div>

                      <div className="mb-2">
                        <strong className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                          Result:
                        </strong>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{action.result}</div>
                      </div>

                      <div className="mb-2">
                        <strong className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                          Follow-Up:
                        </strong>
                        {hasOpenFollowUp && (
                          <div>
                            <span className="badge bg-warning text-dark me-2">
                              Follow-up open
                            </span>
                            <span className="text-muted">{action.followUpNote}</span>
                          </div>
                        )}
                        {hasDoneFollowUp && (
                          <div>
                            <span className="badge bg-success me-2">
                              Follow-up done
                            </span>
                            <span className="text-muted">{action.followUpNote}</span>
                          </div>
                        )}
                        {!action.followUpRequired && (
                          <span className="badge bg-light text-muted border">
                            No follow-up
                          </span>
                        )}
                      </div>

                      {action.attachmentNotes && (
                        <div className="mb-2">
                          <strong className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                            Attachment Notes:
                          </strong>
                          <span className="text-muted">{action.attachmentNotes}</span>
                        </div>
                      )}

                      {action.lastEditedBy && (
                        <div className="text-muted mb-2" style={{ fontSize: '0.7rem' }}>
                          Last edited by {action.lastEditedBy.name}
                        </div>
                      )}

                      {!isRequester && !isTerminal && (
                        <div className="d-flex gap-2 mt-3 pt-2 border-top">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEditForm(action)}
                          >
                            Edit
                          </button>
                          {hasOpenFollowUp && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={completingId === action.id}
                              onClick={() => handleMarkFollowUpCompleted(action)}
                            >
                              {completingId === action.id ? 'Saving...' : 'Mark completed'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
