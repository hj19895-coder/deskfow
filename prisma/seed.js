// prisma/seed.js
// Run with: npx prisma db seed
// package.json: "prisma": { "seed": "node prisma/seed.js" }

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_DATA = [
  // STATUS
  { type: "STATUS", value: "Open" },
  { type: "STATUS", value: "In Progress" },
  { type: "STATUS", value: "Resolved" },
  { type: "STATUS", value: "Closed" },

  // SOURCE
  { type: "SOURCE", value: "Call" },
  { type: "SOURCE", value: "Email" },
  { type: "SOURCE", value: "WhatsApp" },
  { type: "SOURCE", value: "Verbal" },
  { type: "SOURCE", value: "Portal" },

  // LEVEL
  { type: "LEVEL", value: "L1" },
  { type: "LEVEL", value: "L2" },
  { type: "LEVEL", value: "L3" },

  // GROUP
  { type: "GROUP", value: "Development Team" },
  { type: "GROUP", value: "Support Team" },

  // SEVERITY
  { type: "SEVERITY", value: "Critical" },
  { type: "SEVERITY", value: "High" },
  { type: "SEVERITY", value: "Moderate" },
  { type: "SEVERITY", value: "Low" },

  // RAISED_BY
  { type: "RAISED_BY", value: "Self" },
  { type: "RAISED_BY", value: "Manager" },
  { type: "RAISED_BY", value: "Client" },
  { type: "RAISED_BY", value: "System" },

  // SITE
  { type: "SITE", value: "Headquarters" },
  { type: "SITE", value: "Branch Office - North" },
  { type: "SITE", value: "Branch Office - South" },
  { type: "SITE", value: "Remote Site" },

  // TICKET_TYPE
  { type: "TICKET_TYPE", value: "Incident" },
  { type: "TICKET_TYPE", value: "Service Request" },
  { type: "TICKET_TYPE", value: "Problem" },
  { type: "TICKET_TYPE", value: "Change" },

  // CLIENT_NAME
  { type: "CLIENT_NAME", value: "Internal" },
  { type: "CLIENT_NAME", value: "Acme Corp" },
  { type: "CLIENT_NAME", value: "Globex Inc" },
  { type: "CLIENT_NAME", value: "Soylent Corp" },

  // PRIORITY
  { type: "PRIORITY", value: "P1 - Critical" },
  { type: "PRIORITY", value: "P2 - High" },
  { type: "PRIORITY", value: "P3 - Normal" },

  // CATEGORY
  { type: "CATEGORY", value: "Hardware" },
  { type: "CATEGORY", value: "Software" },
  { type: "CATEGORY", value: "Network" },
  { type: "CATEGORY", value: "Access / Permissions" },

  // SUBCATEGORY
  { type: "SUBCATEGORY", value: "Desktop Issue" },
  { type: "SUBCATEGORY", value: "Laptop Issue" },
  { type: "SUBCATEGORY", value: "Server Issue" },
  { type: "SUBCATEGORY", value: "Printer Issue" },
  { type: "SUBCATEGORY", value: "VPN Issue" },

  // ITEM
  { type: "ITEM", value: "Monitor" },
  { type: "ITEM", value: "Keyboard" },
  { type: "ITEM", value: "Mouse" },
  { type: "ITEM", value: "Headset" },
  { type: "ITEM", value: "Docking Station" },

  // ROOT_CAUSE_CATEGORY
  { type: "ROOT_CAUSE_CATEGORY", value: "User Error" },
  { type: "ROOT_CAUSE_CATEGORY", value: "Configuration Issue" },
  { type: "ROOT_CAUSE_CATEGORY", value: "Software Bug" },
  { type: "ROOT_CAUSE_CATEGORY", value: "Hardware Failure" },
  { type: "ROOT_CAUSE_CATEGORY", value: "Third Party" },

  // SEAT_EFFECTED
  { type: "SEAT_EFFECTED", value: "Seat 1" },
  { type: "SEAT_EFFECTED", value: "Seat 2" },

  // CLIENT_CONFIRMATION
  { type: "CLIENT_CONFIRMATION", value: "Yes" },
  { type: "CLIENT_CONFIRMATION", value: "No" },

  // DEPARTMENT
  { type: "DEPARTMENT", value: "IT" },
  { type: "DEPARTMENT", value: "HR" },
  { type: "DEPARTMENT", value: "Operations" },
];

async function main() {
  console.log("🚀 Seeding database...");

  // 1. Seed MasterData
  console.log("📊 Seeding MasterData...");
  for (const entry of SEED_DATA) {
    await prisma.masterData.upsert({
      where:  { type_value: { type: entry.type, value: entry.value } },
      update: { isActive: true },
      create: { ...entry, isActive: true },
    });
  }
  console.log(`✅ Seeded ${SEED_DATA.length} MasterData entries.`);

// 2. Seed Roles
  console.log("👑 Seeding Roles...");
  const rolesData = [
    { name: "SUPER_ADMIN" },
    { name: "ADMIN" },
    { name: "AGENT" },
    { name: "USER" },
  ];
  for (const roleData of rolesData) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
  }
console.log("✅ Seeded 4 roles: SUPER_ADMIN, ADMIN, AGENT, USER");

  // 3. Seed default Super Admin (if not exists)
  console.log("🔑 Checking/Creating default Super Admin...");
  const superAdminEmail = "admin@servicedesk.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingAdmin) {
    const superAdminRole = await prisma.role.findUnique({
      where: { name: "SUPER_ADMIN" },
    });
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash("admin123", 10);

    await prisma.user.create({
      data: {
        name: "Super Admin",
        email: superAdminEmail,
        password: hashedPassword,
        roleId: superAdminRole.id,
      },
    });
    console.log(`✅ Created default Super Admin: ${superAdminEmail} / admin123`);
  } else {
    console.log(`ℹ️  Super Admin already exists: ${superAdminEmail}`);
  }

  console.log("🎉 Database seeding complete!");
  console.log("💡 Login: admin@servicedesk.com / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  const superAdminRole = await prisma.role.upsert({
  where: { name: 'SUPER_ADMIN' },
  update: {},
  create: {
    name: 'SUPER_ADMIN',
    description: 'Full system access',
    isSystem: true,
    permissions: {
      create: ['dashboard','tickets','users','master-data','reports'].map(page => ({
        page, canView: true, canCreate: true, canEdit: true, canDelete: true,
      })),
    },
  },
});

