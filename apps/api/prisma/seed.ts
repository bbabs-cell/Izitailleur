import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Le seed de démonstration ne doit jamais être exécuté en production");
  }

  const workshop = await prisma.workshop.create({
    data: { name: "Atelier Démo Dakar" },
  });

  const passwordHash = await argon2.hash("demo12345");

  await prisma.user.createMany({
    data: [
      { workshopId: workshop.id, fullName: "Mamadou Diallo", phone: "+221700000001", passwordHash, role: "OWNER" },
      { workshopId: workshop.id, fullName: "Ibrahima Sow", phone: "+221700000002", passwordHash, role: "TAILOR" },
      { workshopId: workshop.id, fullName: "Fatou Ndiaye", phone: "+221700000003", passwordHash, role: "APPRENTICE" },
      { workshopId: workshop.id, fullName: "Aïssata Bâ", phone: "+221700000004", passwordHash, role: "MANAGER" },
    ],
  });

  console.log("Données de démonstration créées pour", workshop.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
