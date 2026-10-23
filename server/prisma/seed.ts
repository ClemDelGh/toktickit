import { getPrisma } from "../src/prisma";
import { Role, TicketStatus } from "@prisma/client";
import bcrypt from "bcrypt";

async function main() {
  const prisma = getPrisma();

  // 1. Création des catégories
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network"
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // 2. Création des utilisateurs
  const defaultHash = await bcrypt.hash("password", 12);

  const users: Array<{
    email: string;
    name: string;
    isActive: boolean;
    role: Role;
    passwordHash: string;
    mustChangePassword: boolean;
  }> = [
    { email: "jennifer.a@example.com", name: "Jennifer Anderson", isActive: true, role: Role.Requester, passwordHash: defaultHash, mustChangePassword: false },
    { email: "michael.b@example.com", name: "Michael Brown", isActive: true, role: Role.Requester, passwordHash: defaultHash, mustChangePassword: false },
    { email: "sarah.j@example.com", name: "Sarah Johnson", isActive: true, role: Role.Requester, passwordHash: defaultHash, mustChangePassword: false },
    { email: "david.l@example.com", name: "David Lee", isActive: true, role: Role.Requester, passwordHash: defaultHash, mustChangePassword: false },
    { email: "inactive.user@example.com", name: "Inactive User", isActive: false, role: Role.Requester, passwordHash: defaultHash, mustChangePassword: false },
    { email: "staff@example.com", name: "Staff User", isActive: true, role: Role.ITStaff, passwordHash: defaultHash, mustChangePassword: false },
    { email: "it1@example.com", name: "IT Staff One", isActive: true, role: Role.ITStaff, passwordHash: defaultHash, mustChangePassword: false },
    { email: "it2@example.com", name: "IT Staff Two", isActive: true, role: Role.ITStaff, passwordHash: defaultHash, mustChangePassword: false },
    { email: "it3@example.com", name: "IT Staff Three", isActive: true, role: Role.ITStaff, passwordHash: defaultHash, mustChangePassword: false },
    { email: "it.inactive@example.com", name: "Inactive IT", isActive: false, role: Role.ITStaff, passwordHash: defaultHash, mustChangePassword: false },
    { email: "admin@example.com", name: "System Admin", isActive: true, role: Role.Administrator, passwordHash: defaultHash, mustChangePassword: false }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword
      },
      create: {
        ...user,
        role: user.role
      }
    });
  }

  // 3. Création des systèmes associés
  const relatedSystems = [
    { name: "Email", isActive: true },
    { name: "Campus Wi-Fi", isActive: true },
    { name: "VPN", isActive: true },
    { name: "LEB2 App", isActive: true },
    { name: "Grade Submission App", isActive: true },
    { name: "Printer", isActive: true },
    { name: "Corporate Laptop", isActive: true }
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: {},
      create: sys
    });
  }

  // 4. Lab 3 tickets (TKT-001, TKT-002)
  const jennifer = await prisma.user.findUnique({ where: { email: "jennifer.a@example.com" } });
  const networkCategory = await prisma.category.findUnique({ where: { name: "Network" } });
  const wifiSystem = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });

  if (jennifer && networkCategory && wifiSystem) {
    await prisma.ticket.upsert({
      where: { ticketNumber: 'TKT-001' },
      update: {
        itPriority: 'High'
      },
      create: {
        ticketNumber: 'TKT-001',
        summary: 'Cannot connect to Wi-Fi in the library',
        description: 'My laptop keeps dropping the connection.',
        requestedPriority: 'High',
        itPriority: 'High',
        status: 'New',
        requesterId: jennifer.id,
        categoryId: networkCategory.id,
        relatedSystemId: wifiSystem.id,
      }
    });

    await prisma.ticket.upsert({
      where: { ticketNumber: 'TKT-002' },
      update: {
        itPriority: 'Medium'
      },
      create: {
        ticketNumber: 'TKT-002',
        summary: 'VPN access issue',
        description: 'Getting error 403 when trying to log into the VPN.',
        requestedPriority: 'Medium',
        itPriority: 'Medium',
        status: 'Open',
        requesterId: jennifer.id,
        categoryId: networkCategory.id,
        relatedSystemId: wifiSystem.id,
      }
    });
  }

  // 5. Lab 4 Seed: 16 Tickets (TKT-2026-9001 ... 9016) per §7.4
  const usersList = await prisma.user.findMany();
  const userByEmail = new Map(usersList.map((u) => [u.email, u]));

  const michael = userByEmail.get("michael.b@example.com")!;
  const sarah = userByEmail.get("sarah.j@example.com")!;
  const it1 = userByEmail.get("it1@example.com")!;
  const it2 = userByEmail.get("it2@example.com")!;
  const it3 = userByEmail.get("it3@example.com")!;

  const categoriesList = await prisma.category.findMany();
  const catByName = new Map(categoriesList.map((c) => [c.name, c]));

  const catAccount = catByName.get("Account and Access")!;
  const catHardware = catByName.get("Hardware")!;
  const catSoftware = catByName.get("Software")!;
  const catNetwork = catByName.get("Network")!;

  const systemsList = await prisma.relatedSystem.findMany();
  const sysByName = new Map(systemsList.map((s) => [s.name, s]));

  const sysEmail = sysByName.get("Email")!;
  const sysWifi = sysByName.get("Campus Wi-Fi")!;
  const sysVpn = sysByName.get("VPN")!;
  const sysLeb2 = sysByName.get("LEB2 App")!;
  const sysGrade = sysByName.get("Grade Submission App")!;
  const sysPrinter = sysByName.get("Printer")!;
  const sysLaptop = sysByName.get("Corporate Laptop")!;

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  interface ActionSeedData {
    clientRequestId: string;
    actionDateTime: Date;
    description: string;
    result: string;
    performedById: number;
    followUpRequired: boolean;
    followUpNote?: string | null;
    followUpCompletedAt?: Date | null;
    attachmentNotes?: string | null;
  }

  interface TicketSeedData {
    ticketNumber: string;
    summary: string;
    description: string;
    requestedPriority: string;
    itPriority: string;
    status: TicketStatus;
    requesterId: number;
    ticketOwnerId: number | null;
    categoryId: number;
    relatedSystemId: number;
    resolutionSummary?: string | null;
    resolvedAt?: Date | null;
    closedAt?: Date | null;
    requesterResolvedIndicatedAt?: Date | null;
    actions: ActionSeedData[];
    publicComment?: { text: string; authorId: number } | null;
    internalNote?: { text: string; authorId: number } | null;
  }

  const ticketsDataset: TicketSeedData[] = [
    // 9001: Jennifer, New, High/High, — , 0
    {
      ticketNumber: "TKT-2026-9001",
      summary: "Cannot access core database server",
      description: "Connection timed out when querying central DB.",
      requestedPriority: "High",
      itPriority: "High",
      status: "New",
      requesterId: jennifer!.id,
      ticketOwnerId: null,
      categoryId: catNetwork.id,
      relatedSystemId: sysVpn.id,
      actions: []
    },
    // 9002: Jennifer, Open, Medium/Medium, it1, 1
    {
      ticketNumber: "TKT-2026-9002",
      summary: "Slow email synchronization",
      description: "Outlook client takes 10+ minutes to fetch new messages.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "Open",
      requesterId: jennifer!.id,
      ticketOwnerId: it1.id,
      categoryId: catSoftware.id,
      relatedSystemId: sysEmail.id,
      actions: [
        {
          clientRequestId: "seed-9002-1",
          actionDateTime: hoursAgo(5),
          description: "Re-indexed local mailbox database",
          result: "Sync time reduced to 2 minutes, monitoring",
          performedById: it1.id,
          followUpRequired: false
        }
      ]
    },
    // 9003: Jennifer, In Progress, High/High, it1, 3 (one open follow-up by it2; public comment + internal note)
    {
      ticketNumber: "TKT-2026-9003",
      summary: "Frequent blue screen crashes on workstation",
      description: "Laptop crashes randomly with BSOD during video conferences.",
      requestedPriority: "High",
      itPriority: "High",
      status: "InProgress",
      requesterId: jennifer!.id,
      ticketOwnerId: it1.id,
      categoryId: catHardware.id,
      relatedSystemId: sysLaptop.id,
      actions: [
        {
          clientRequestId: "seed-9003-1",
          actionDateTime: hoursAgo(10),
          description: "Analyzed Windows Minidump logs",
          result: "Identified faulty memory address in ntoskrnl.exe",
          performedById: it1.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9003-2",
          actionDateTime: hoursAgo(6),
          description: "Hardware memory diagnostic on slot 2",
          result: "Errors detected at 8GB boundary",
          performedById: it2.id,
          followUpRequired: true,
          followUpNote: "Replace RAM module and verify with MemTest86",
          followUpCompletedAt: null
        },
        {
          clientRequestId: "seed-9003-3",
          actionDateTime: hoursAgo(2),
          description: "Requisitioned 16GB DDR4 module from stock",
          result: "Part available in IT storage room",
          performedById: it1.id,
          followUpRequired: false
        }
      ],
      publicComment: {
        text: "Thank you for looking into this, I have a major presentation tomorrow morning.",
        authorId: jennifer!.id
      },
      internalNote: {
        text: "RMA ticket opened with Dell support as backup plan.",
        authorId: it1.id
      }
    },
    // 9004: Jennifer, Waiting for Requester, Medium/Medium, it2, 2
    {
      ticketNumber: "TKT-2026-9004",
      summary: "Password reset request for LEB2 portal",
      description: "Locked out after typing incorrect password multiple times.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "WaitingForRequester",
      requesterId: jennifer!.id,
      ticketOwnerId: it2.id,
      categoryId: catAccount.id,
      relatedSystemId: sysLeb2.id,
      actions: [
        {
          clientRequestId: "seed-9004-1",
          actionDateTime: hoursAgo(12),
          description: "Generated temporary one-time password",
          result: "OTP generated in authentication service",
          performedById: it2.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9004-2",
          actionDateTime: hoursAgo(4),
          description: "Sent secure SMS with temporary access code",
          result: "SMS delivered, awaiting user login to reset",
          performedById: it2.id,
          followUpRequired: false
        }
      ]
    },
    // 9005: Jennifer, Resolved, Low/Low, it1, 2 (`resolvedAt` = now - 2d, summary)
    {
      ticketNumber: "TKT-2026-9005",
      summary: "Ethernet wall jack not responding in Office 302",
      description: "No link light when connecting patch cable.",
      requestedPriority: "Low",
      itPriority: "Low",
      status: "Resolved",
      requesterId: jennifer!.id,
      ticketOwnerId: it1.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysWifi.id,
      resolutionSummary: "Replaced faulty patch cable and verified port on switch.",
      resolvedAt: daysAgo(2),
      actions: [
        {
          clientRequestId: "seed-9005-1",
          actionDateTime: daysAgo(3),
          description: "Tested wall jack with cable certifier",
          result: "Continuity failure on pin 3 and pin 6",
          performedById: it1.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9005-2",
          actionDateTime: daysAgo(2),
          description: "Re-punched keystone jack and swapped patch cord",
          result: "Gigabit link established, 0 packet loss",
          performedById: it1.id,
          followUpRequired: false
        }
      ]
    },
    // 9006: Jennifer, Closed, Low/Low, it2, 1 (`resolvedAt` = now - 21d, `closedAt` = now - 20d)
    {
      ticketNumber: "TKT-2026-9006",
      summary: "Department printer printing blank pages",
      description: "Paper passes through but no toner is applied.",
      requestedPriority: "Low",
      itPriority: "Low",
      status: "Closed",
      requesterId: jennifer!.id,
      ticketOwnerId: it2.id,
      categoryId: catHardware.id,
      relatedSystemId: sysPrinter.id,
      resolutionSummary: "Replaced depleted black toner cartridge and cleaned drum.",
      resolvedAt: daysAgo(21),
      closedAt: daysAgo(20),
      actions: [
        {
          clientRequestId: "seed-9006-1",
          actionDateTime: daysAgo(22),
          description: "Installed genuine HP toner cartridge",
          result: "Test print crisp and fully legible",
          performedById: it2.id,
          followUpRequired: false
        }
      ]
    },
    // 9007: Michael, New, Medium/Medium, — , 0
    {
      ticketNumber: "TKT-2026-9007",
      summary: "Requesting second external monitor",
      description: "Need dual display setup for data entry tasks.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "New",
      requesterId: michael.id,
      ticketOwnerId: null,
      categoryId: catHardware.id,
      relatedSystemId: sysLaptop.id,
      actions: []
    },
    // 9008: Michael, Open, High/High, it3, 1 (`requesterResolvedIndicatedAt` set; internal note)
    {
      ticketNumber: "TKT-2026-9008",
      summary: "VPN authentication certificate error",
      description: "Client reports 'Certificate revoked or expired' when connecting.",
      requestedPriority: "High",
      itPriority: "High",
      status: "Open",
      requesterId: michael.id,
      ticketOwnerId: it3.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysVpn.id,
      requesterResolvedIndicatedAt: daysAgo(1),
      actions: [
        {
          clientRequestId: "seed-9008-1",
          actionDateTime: hoursAgo(8),
          description: "Generated new client certificate in PKI portal",
          result: "Installed .pfx profile on user laptop",
          performedById: it3.id,
          followUpRequired: false
        }
      ],
      internalNote: {
        text: "User indicated resolution via advisory button, will review and resolve.",
        authorId: it3.id
      }
    },
    // 9009: Michael, In Progress, Medium/Low, it2, 2 (one action by it1 - not owner)
    {
      ticketNumber: "TKT-2026-9009",
      summary: "Intermittent Wi-Fi disconnections in Lecture Hall B",
      description: "Loses connection every 20-30 minutes during lectures.",
      requestedPriority: "Medium",
      itPriority: "Low",
      status: "InProgress",
      requesterId: michael.id,
      ticketOwnerId: it2.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysWifi.id,
      actions: [
        {
          clientRequestId: "seed-9009-1",
          actionDateTime: hoursAgo(14),
          description: "Inspected AP logs for Lecture Hall B",
          result: "AP channel saturation detected at peak hours",
          performedById: it1.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9009-2",
          actionDateTime: hoursAgo(3),
          description: "Changed AP transmit power and enabled 5GHz band steering",
          result: "Client distribution rebalanced, monitoring",
          performedById: it2.id,
          followUpRequired: false
        }
      ]
    },
    // 9010: Michael, Reopened, Medium/Medium, it1, 2
    {
      ticketNumber: "TKT-2026-9010",
      summary: "Email attachment size restriction issue",
      description: "Still unable to send 15MB PDF attachments after policy update.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "Reopened",
      requesterId: michael.id,
      ticketOwnerId: it1.id,
      categoryId: catSoftware.id,
      relatedSystemId: sysEmail.id,
      actions: [
        {
          clientRequestId: "seed-9010-1",
          actionDateTime: daysAgo(4),
          description: "Updated transport rule limits in Exchange admin",
          result: "Global max send limit set to 25MB",
          performedById: it1.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9010-2",
          actionDateTime: hoursAgo(6),
          description: "Investigated client-side Outlook limit override",
          result: "Found local registry key restricting message size to 10MB",
          performedById: it1.id,
          followUpRequired: false
        }
      ]
    },
    // 9011: Michael, Cancelled, Low/Low, it3, 0
    {
      ticketNumber: "TKT-2026-9011",
      summary: "Duplicate request for wireless presenter",
      description: "Already received device from department inventory.",
      requestedPriority: "Low",
      itPriority: "Low",
      status: "Cancelled",
      requesterId: michael.id,
      ticketOwnerId: it3.id,
      categoryId: catHardware.id,
      relatedSystemId: sysLaptop.id,
      actions: []
    },
    // 9012: Sarah, Open, Low/Low, — , 0 (open but unassigned)
    {
      ticketNumber: "TKT-2026-9012",
      summary: "Inquiry about grade submission deadline extensions",
      description: "Where to request system unlock for late semester grades.",
      requestedPriority: "Low",
      itPriority: "Low",
      status: "Open",
      requesterId: sarah.id,
      ticketOwnerId: null,
      categoryId: catAccount.id,
      relatedSystemId: sysGrade.id,
      actions: []
    },
    // 9013: Sarah, Resolved, Medium/Medium, it3, 1 (`resolvedAt` = now - 10d, outside 7-day window)
    {
      ticketNumber: "TKT-2026-9013",
      summary: "Grade Submission portal SSL certificate warning",
      description: "Browser displays 'Not Secure' when accessing grading page.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "Resolved",
      requesterId: sarah.id,
      ticketOwnerId: it3.id,
      categoryId: catSoftware.id,
      relatedSystemId: sysGrade.id,
      resolutionSummary: "Renewed Let's Encrypt wildcard certificate and reloaded Nginx.",
      resolvedAt: daysAgo(10),
      actions: [
        {
          clientRequestId: "seed-9013-1",
          actionDateTime: daysAgo(11),
          description: "Renewed certificate via certbot automation",
          result: "Valid certificate installed, SSL Labs rating A+",
          performedById: it3.id,
          followUpRequired: false
        }
      ]
    },
    // 9014: Sarah, Waiting for Requester, High/High, it1, 1 (follow-up completed)
    {
      ticketNumber: "TKT-2026-9014",
      summary: "Unable to authorize grade submission with hardware key",
      description: "FIDO2 security key not detected on grading kiosk.",
      requestedPriority: "High",
      itPriority: "High",
      status: "WaitingForRequester",
      requesterId: sarah.id,
      ticketOwnerId: it1.id,
      categoryId: catHardware.id,
      relatedSystemId: sysGrade.id,
      actions: [
        {
          clientRequestId: "seed-9014-1",
          actionDateTime: hoursAgo(10),
          description: "Updated WebAuthn browser drivers and firmware",
          result: "Hardware key recognized by system",
          performedById: it1.id,
          followUpRequired: true,
          followUpNote: "Verify user can sign test grade packet",
          followUpCompletedAt: hoursAgo(1)
        }
      ]
    },
    // 9015: Sarah, In Progress, Medium/Medium, it2, 4 (one open follow-up performed by it1)
    {
      ticketNumber: "TKT-2026-9015",
      summary: "LEB2 application crashing during quiz creation",
      description: "Uncaught JavaScript error when adding multiple-choice options.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "InProgress",
      requesterId: sarah.id,
      ticketOwnerId: it2.id,
      categoryId: catSoftware.id,
      relatedSystemId: sysLeb2.id,
      actions: [
        {
          clientRequestId: "seed-9015-1",
          actionDateTime: daysAgo(2),
          description: "Reproduced crash in staging sandbox",
          result: "Identified null pointer in question builder form",
          performedById: it2.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9015-2",
          actionDateTime: daysAgo(1),
          description: "Coordinated with vendor dev team for patch",
          result: "Vendor supplied hotfix build v2.4.1-patch1",
          performedById: it1.id,
          followUpRequired: true,
          followUpNote: "Deploy hotfix build to production cluster during maintenance window",
          followUpCompletedAt: null
        },
        {
          clientRequestId: "seed-9015-3",
          actionDateTime: hoursAgo(8),
          description: "Applied patch in test environment",
          result: "Automated regression tests passed",
          performedById: it2.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9015-4",
          actionDateTime: hoursAgo(2),
          description: "Checked user account logs",
          result: "Ready for deployment tonight at 23:00",
          performedById: it2.id,
          followUpRequired: false
        }
      ]
    },
    // 9016: Sarah, Closed, Medium/Medium, it1, 2
    {
      ticketNumber: "TKT-2026-9016",
      summary: "Grade Submission PDF export formatting broken",
      description: "Columns overflowing page margins in final semester export.",
      requestedPriority: "Medium",
      itPriority: "Medium",
      status: "Closed",
      requesterId: sarah.id,
      ticketOwnerId: it1.id,
      categoryId: catSoftware.id,
      relatedSystemId: sysGrade.id,
      resolutionSummary: "Adjusted PDF render stylesheet to landscape orientation.",
      resolvedAt: daysAgo(5),
      closedAt: daysAgo(4),
      actions: [
        {
          clientRequestId: "seed-9016-1",
          actionDateTime: daysAgo(6),
          description: "Modified CSS print media query in reporting engine",
          result: "Page width fits standard A4 landscape",
          performedById: it1.id,
          followUpRequired: false
        },
        {
          clientRequestId: "seed-9016-2",
          actionDateTime: daysAgo(5),
          description: "Exported sample class of 120 students",
          result: "Formatting verified clean and approved by registrar",
          performedById: it1.id,
          followUpRequired: false
        }
      ]
    }
  ];

  for (const t of ticketsDataset) {
    const { actions, publicComment, internalNote, ...ticketFields } = t;

    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: ticketFields.ticketNumber },
      update: {
        summary: ticketFields.summary,
        description: ticketFields.description,
        requestedPriority: ticketFields.requestedPriority,
        itPriority: ticketFields.itPriority,
        status: ticketFields.status,
        requesterId: ticketFields.requesterId,
        ticketOwnerId: ticketFields.ticketOwnerId,
        categoryId: ticketFields.categoryId,
        relatedSystemId: ticketFields.relatedSystemId,
        resolutionSummary: ticketFields.resolutionSummary ?? null,
        resolvedAt: ticketFields.resolvedAt ?? null,
        closedAt: ticketFields.closedAt ?? null,
        requesterResolvedIndicatedAt: ticketFields.requesterResolvedIndicatedAt ?? null
      },
      create: {
        ...ticketFields,
        resolutionSummary: ticketFields.resolutionSummary ?? null,
        resolvedAt: ticketFields.resolvedAt ?? null,
        closedAt: ticketFields.closedAt ?? null,
        requesterResolvedIndicatedAt: ticketFields.requesterResolvedIndicatedAt ?? null
      }
    });

    // Upsert Actions Taken
    for (const action of actions) {
      await prisma.actionTaken.upsert({
        where: {
          performedById_clientRequestId: {
            performedById: action.performedById,
            clientRequestId: action.clientRequestId
          }
        },
        update: {
          ticketId: ticket.id,
          actionDateTime: action.actionDateTime,
          description: action.description,
          result: action.result,
          followUpRequired: action.followUpRequired,
          followUpNote: action.followUpNote ?? null,
          followUpCompletedAt: action.followUpCompletedAt ?? null,
          attachmentNotes: action.attachmentNotes ?? null
        },
        create: {
          ticketId: ticket.id,
          actionDateTime: action.actionDateTime,
          description: action.description,
          result: action.result,
          performedById: action.performedById,
          followUpRequired: action.followUpRequired,
          followUpNote: action.followUpNote ?? null,
          followUpCompletedAt: action.followUpCompletedAt ?? null,
          attachmentNotes: action.attachmentNotes ?? null,
          clientRequestId: action.clientRequestId
        }
      });
    }

    // Public comment (only when none exists)
    if (publicComment) {
      const existingComments = await prisma.publicComment.count({ where: { ticketId: ticket.id } });
      if (existingComments === 0) {
        await prisma.publicComment.create({
          data: {
            ticketId: ticket.id,
            authorId: publicComment.authorId,
            text: publicComment.text
          }
        });
      }
    }

    // Internal note (only when none exists)
    if (internalNote) {
      const existingNotes = await prisma.internalNote.count({ where: { ticketId: ticket.id } });
      if (existingNotes === 0) {
        await prisma.internalNote.create({
          data: {
            ticketId: ticket.id,
            authorId: internalNote.authorId,
            text: internalNote.text
          }
        });
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });