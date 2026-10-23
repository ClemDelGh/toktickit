import { getPrisma } from "../../src/prisma";

export const ACTIVE_STATUSES = [
  "New",
  "Open",
  "InProgress",
  "WaitingForRequester",
  "Reopened",
] as const;

export const TERMINAL_STATUSES = ["Closed", "Cancelled"] as const;

export async function getRequesterDashboardOracle(userId: number, now = new Date()) {
  const prisma = getPrisma();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const openCount = await prisma.ticket.count({
    where: {
      requesterId: userId,
      status: { in: [...ACTIVE_STATUSES] },
    },
  });

  const waitingForYouCount = await prisma.ticket.count({
    where: {
      requesterId: userId,
      status: "WaitingForRequester",
    },
  });

  const resolvedCount = await prisma.ticket.count({
    where: {
      requesterId: userId,
      status: "Resolved",
    },
  });

  const closedCount = await prisma.ticket.count({
    where: {
      requesterId: userId,
      status: "Closed",
    },
  });

  const recentTickets = await prisma.ticket.findMany({
    where: { requesterId: userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const attentionTickets = await prisma.ticket.findMany({
    where: {
      requesterId: userId,
      status: "WaitingForRequester",
    },
    orderBy: { updatedAt: "asc" },
    take: 5,
  });

  const recentlyResolved = await prisma.ticket.findMany({
    where: {
      requesterId: userId,
      status: "Resolved",
      resolvedAt: { gte: sevenDaysAgo },
    },
    orderBy: { resolvedAt: "desc" },
    take: 5,
  });

  return {
    open: openCount,
    waitingForYou: waitingForYouCount,
    resolved: resolvedCount,
    closed: closedCount,
    recentTickets,
    attentionTickets,
    recentlyResolved,
  };
}

export async function getStaffDashboardOracle(userId: number, isAdmin = false) {
  const prisma = getPrisma();

  const unassigned = await prisma.ticket.count({
    where: {
      ticketOwnerId: null,
      status: { in: [...ACTIVE_STATUSES] },
    },
  });

  const myAssigned = await prisma.ticket.count({
    where: {
      ticketOwnerId: userId,
      status: { in: [...ACTIVE_STATUSES] },
    },
  });

  const allStatuses = [
    "New",
    "Open",
    "InProgress",
    "WaitingForRequester",
    "Resolved",
    "Closed",
    "Reopened",
    "Cancelled",
  ] as const;

  const byStatus: Record<string, number> = {};
  for (const s of allStatuses) {
    byStatus[s] = await prisma.ticket.count({ where: { status: s } });
  }

  const byItPriority = {
    High: await prisma.ticket.count({
      where: {
        itPriority: "High",
        status: { in: [...ACTIVE_STATUSES] },
      },
    }),
    Medium: await prisma.ticket.count({
      where: {
        itPriority: "Medium",
        status: { in: [...ACTIVE_STATUSES] },
      },
    }),
    Low: await prisma.ticket.count({
      where: {
        itPriority: "Low",
        status: { in: [...ACTIVE_STATUSES] },
      },
    }),
  };

  const awaitingReview = await prisma.ticket.count({
    where: {
      requesterResolvedIndicatedAt: { not: null },
      status: { in: [...ACTIVE_STATUSES] },
    },
  });

  const myOpenFollowUps = await prisma.actionTaken.count({
    where: {
      performedById: userId,
      followUpRequired: true,
      followUpCompletedAt: null,
      ticket: {
        status: { notIn: [...TERMINAL_STATUSES] },
      },
    },
  });

  const myRecentActions = await prisma.actionTaken.findMany({
    where: { performedById: userId },
    orderBy: { actionDateTime: "desc" },
    take: 5,
  });

  const myRecentTickets = await prisma.ticket.findMany({
    where: { ticketOwnerId: userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const urgentTickets = await prisma.ticket.findMany({
    where: {
      itPriority: "High",
      status: { in: [...ACTIVE_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  let userCounts: any = undefined;
  if (isAdmin) {
    const active = await prisma.user.count({ where: { isActive: true } });
    const inactive = await prisma.user.count({ where: { isActive: false } });
    const requester = await prisma.user.count({ where: { role: "Requester" } });
    const staff = await prisma.user.count({ where: { role: "ITStaff" } });
    const admin = await prisma.user.count({ where: { role: "Administrator" } });
    userCounts = {
      active,
      inactive,
      byRole: {
        Requester: requester,
        ITStaff: staff,
        Administrator: admin,
      },
    };
  }

  return {
    unassigned,
    myAssigned,
    byStatus,
    byItPriority,
    awaitingReview,
    myOpenFollowUps,
    myRecentTickets,
    urgentTickets,
    myRecentActions,
    ...(userCounts ? { userCounts } : {}),
  };
}

