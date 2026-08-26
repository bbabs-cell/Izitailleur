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

  const [owner, tailor] = await Promise.all([
    prisma.user.create({
      data: { workshopId: workshop.id, fullName: "Mamadou Diallo", phone: "+221700000001", passwordHash, role: "OWNER" },
    }),
    prisma.user.create({
      data: { workshopId: workshop.id, fullName: "Ibrahima Sow", phone: "+221700000002", passwordHash, role: "TAILOR" },
    }),
  ]);
  await prisma.user.createMany({
    data: [
      { workshopId: workshop.id, fullName: "Fatou Ndiaye", phone: "+221700000003", passwordHash, role: "APPRENTICE" },
      { workshopId: workshop.id, fullName: "Aïssata Bâ", phone: "+221700000004", passwordHash, role: "MANAGER" },
    ],
  });

  const customer = await prisma.customer.create({
    data: {
      workshopId: workshop.id,
      firstName: "Mamadou",
      lastName: "Client",
      phone: "+221709999999",
      notes: "Préfère les tissus Bazin",
    },
  });

  const profile = await prisma.measurementProfile.create({
    data: { workshopId: workshop.id, customerId: customer.id, label: "Boubou standard" },
  });
  await prisma.measurement.create({
    data: { profileId: profile.id, values: { poitrine: 104, taille: 92, epaule: 48 } },
  });

  for (let i = 248; i <= 250; i++) {
    await prisma.workshop.update({
      where: { id: workshop.id },
      data: { orderSequence: { increment: 1 } },
    });
    const order = await prisma.order.create({
      data: {
        workshopId: workshop.id,
        reference: String(i).padStart(4, "0"),
        customerId: customer.id,
        measurementProfileId: profile.id,
        modelName: "Boubou homme",
        fabricDescription: "Bazin bleu",
        price: 25000,
        deposit: 10000,
        dueDate: new Date(Date.now() + (i - 247) * 5 * 86400000),
        assignedToId: tailor.id,
        instructions: "Faire le col selon le modèle. Ajouter une poche intérieure.",
        status: "NEW",
      },
    });
    await prisma.orderStatusChange.create({
      data: { orderId: order.id, fromStatus: null, toStatus: "NEW" },
    });
    await prisma.orderTask.create({
      data: { orderId: order.id, title: "Vérifier les manches", assignedToId: tailor.id },
    });
  }

  await prisma.appointment.create({
    data: {
      workshopId: workshop.id,
      customerId: customer.id,
      type: "FITTING",
      title: "Essayage boubou #0248",
      startAt: new Date(Date.now() + 2 * 86400000),
    },
  });

  const supplier = await prisma.supplier.create({
    data: { workshopId: workshop.id, name: "Tissus Sandaga", phone: "+221701112233" },
  });
  await prisma.fabric.create({
    data: {
      workshopId: workshop.id,
      name: "Bazin bleu",
      color: "Bleu",
      quantity: 8,
      unit: "m",
      supplierId: supplier.id,
      location: "Étagère A",
    },
  });
  await prisma.fabric.create({
    data: { workshopId: workshop.id, name: "Wax rouge", color: "Rouge", quantity: 2, unit: "m" },
  });

  await prisma.workshopIssue.create({
    data: {
      workshopId: workshop.id,
      title: "Machine à coudre 2 en panne",
      category: "MACHINE_BREAKDOWN",
      priority: "URGENT",
      description: "Ne démarre plus depuis ce matin",
      assignedToId: tailor.id,
    },
  });

  console.log("Données de démonstration créées pour", workshop.name, "— propriétaire :", owner.phone);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
