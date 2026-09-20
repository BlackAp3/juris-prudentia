import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function main() {
  const course = await prisma.course.upsert({
    where: { code: "LAW 2101" },
    update: { title: "Criminal Law I", academicYear: 2, semester: 1, status: "PUBLISHED" },
    create: { code: "LAW 2101", title: "Criminal Law I", academicYear: 2, semester: 1, status: "PUBLISHED" },
  });

  for (const [position, title] of [
    "Introduction to Criminal Law",
    "Elements of a Crime: Actus Reus & Mens Rea",
    "Homicide: Murder and Manslaughter",
    "Inchoate Offences",
    "Defences",
    "Participation and Complicity",
    "Sentencing Principles",
  ].entries()) {
    await prisma.topic.upsert({
      where: { courseId_position: { courseId: course.id, position: position + 1 } },
      update: { title },
      create: { courseId: course.id, title, position: position + 1 },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? "Juris Prudentia Administrator";
  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { fullName: adminName, role: UserRole.SUPER_ADMIN, isActive: true },
      create: { fullName: adminName, email: adminEmail, passwordHash: hashPassword(adminPassword), role: UserRole.SUPER_ADMIN },
    });
    console.log(`Seeded administrator: ${adminEmail}`);
  } else {
    console.log("Skipped administrator seed; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
