import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// The four names are: Account and Access, Hardware, Software, Network.
// Requirement: running the seed twice must NOT create duplicates.
// Hint: prisma.category.upsert({ where:{name}, update:{}, create:{name} }).
async function main() {
  const prisma = getPrisma();
  // TODO(Issue 3): upsert each category so the seed is idempotent.
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network"
  ];

  console.log("Start seeding categories...");

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name: name },
      update: {}, 
      create: { name: name } 
    });
    console.log(`Upserted category: ${name}`);
  }

  const requesters = [
    { email: 'jennifer.a@example.com', name: 'Jennifer Anderson', isActive: true },
    { email: 'michael.b@example.com', name: 'Michael Brown', isActive: true },
    { email: 'sarah.j@example.com', name: 'Sarah Johnson', isActive: true },
    { email: 'david.l@example.com', name: 'David Lee', isActive: true },
    { email: 'inactive.user@example.com', name: 'Inactive User', isActive: false },
  ];

  for (const req of requesters) {
    await prisma.developmentRequester.upsert({
      where: { email: req.email },
      update: {},
      create: req,
    });
  }
  console.log('Development Requesters seeded.');
  
  const relatedSystems = [
    { name: 'Email', isActive: true },
    { name: 'Campus Wi-Fi', isActive: true },
    { name: 'VPN', isActive: true },
    { name: 'LEB2 App', isActive: true },
    { name: 'Grade Submission App', isActive: true },
    { name: 'Printer', isActive: true },
    { name: 'Corporate Laptop', isActive: true },
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: {}, 
      create: sys,
    });
  }
  console.log('Related Systems seeded.');

  console.log("Seeding finished.");
}



main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
