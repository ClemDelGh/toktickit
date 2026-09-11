import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

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

  const defaultHash = "$2a$12$R9h/cIPz0gi.URNNX3rubedAK0ReQxNxyWIVJhPtP1w.x.Zk2vRjK";

  const users = [
    { email: "jennifer.a@example.com", name: "Jennifer Anderson", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "michael.b@example.com", name: "Michael Brown", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "sarah.j@example.com", name: "Sarah Johnson", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "david.l@example.com", name: "David Lee", isActive: true, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "inactive.user@example.com", name: "Inactive User", isActive: false, role: "Requester", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it1@example.com", name: "IT Staff One", isActive: true, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it2@example.com", name: "IT Staff Two", isActive: true, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it3@example.com", name: "IT Staff Three", isActive: true, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "it.inactive@example.com", name: "Inactive IT", isActive: false, role: "ITStaff", passwordHash: defaultHash, mustChangePassword: true },
    { email: "admin@example.com", name: "System Admin", isActive: true, role: "Administrator", passwordHash: defaultHash, mustChangePassword: true }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user
    });
  }

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });