-- CreateEnum
CREATE TYPE "FabricMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('BAD_MEASUREMENT', 'INSUFFICIENT_FABRIC', 'DEFECTIVE_FABRIC', 'BAD_CUT', 'ALTERATION', 'DELAY', 'CUSTOMER_ABSENT', 'MODEL_CHANGE', 'MACHINE_BREAKDOWN', 'APPRENTICE_LATE', 'SUPPLIER_LATE', 'PAYMENT', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "fabricId" TEXT,
ADD COLUMN     "fabricQuantity" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fabric" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "color" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'm',
    "purchasePrice" INTEGER,
    "supplierId" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Fabric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricMovement" (
    "id" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "type" "FabricMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FabricMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopIssue" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "IssueCategory" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "orderId" TEXT,
    "assignedToId" TEXT,
    "photoUrl" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "solution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WorkshopIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_workshopId_idx" ON "Supplier"("workshopId");

-- CreateIndex
CREATE INDEX "Fabric_workshopId_idx" ON "Fabric"("workshopId");

-- CreateIndex
CREATE INDEX "FabricMovement_fabricId_idx" ON "FabricMovement"("fabricId");

-- CreateIndex
CREATE INDEX "WorkshopIssue_workshopId_idx" ON "WorkshopIssue"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopIssue_workshopId_status_idx" ON "WorkshopIssue"("workshopId", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fabric" ADD CONSTRAINT "Fabric_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fabric" ADD CONSTRAINT "Fabric_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricMovement" ADD CONSTRAINT "FabricMovement_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopIssue" ADD CONSTRAINT "WorkshopIssue_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopIssue" ADD CONSTRAINT "WorkshopIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopIssue" ADD CONSTRAINT "WorkshopIssue_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
