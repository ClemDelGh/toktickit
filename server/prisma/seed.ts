import { getPrisma } from "../src/prisma.js";
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

  const users = [
    { email: "jennifer.a@example.com", name: "Jennifer Anderson", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "michael.b@example.com", name: "Michael Brown", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "sarah.j@example.com", name: "Sarah Johnson", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "david.l@example.com", name: "David Lee", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "inactive.user@example.com", name: "Inactive User", isActive: false, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "staff@example.com", name: "Staff User", isActive: true, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it1@example.com", name: "IT Staff One", isActive: true, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it2@example.com", name: "IT Staff Two", isActive: true, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it3@example.com", name: "IT Staff Three", isActive: true, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it.inactive@example.com", name: "Inactive IT", isActive: false, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "admin@example.com", name: "System Admin", isActive: true, role: "Administrator", passwordHash: defaultHash, mustChangePassword: true }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash: user.passwordHash,
        role: user.role as any, // "as any" pour s'assurer que Prisma accepte l'Enum
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword
      },
      create: {
        ...user,
        role: user.role as any
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

  // 4. NOUVEAU : Création de faux tickets pour la file d'attente (IT Staff Queue)
  const requester = await prisma.user.findUnique({ where: { email: "jennifer.a@example.com" } });
  const category = await prisma.category.findUnique({ where: { name: "Network" } });
  const system = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });

  if (requester && category && system) {
    await prisma.ticket.upsert({
      where: { ticketNumber: 'TKT-001' },
      update: {},
      create: {
        ticketNumber: 'TKT-001',
        summary: 'Cannot connect to Wi-Fi in the library',
        description: 'My laptop keeps dropping the connection.',
        requestedPriority: 'High',
        status: 'New',
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      }
    });

    await prisma.ticket.upsert({
      where: { ticketNumber: 'TKT-002' },
      update: {},
      create: {
        ticketNumber: 'TKT-002',
        summary: 'VPN access issue',
        description: 'Getting error 403 when trying to log into the VPN.',
        requestedPriority: 'Medium',
        status: 'Open',
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      }
    });
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