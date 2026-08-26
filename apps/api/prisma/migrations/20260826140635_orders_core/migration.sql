-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PENDING', 'CUTTING', 'SEWING', 'FITTING', 'ALTERATION', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('FITTING', 'DELIVERY', 'PICKUP', 'PAYMENT', 'TASK', 'OTHER');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementProfile" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MeasurementProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "measurementProfileId" TEXT,
    "modelName" TEXT NOT NULL,
    "fabricDescription" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "instructions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusChange" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderImage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTask" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "type" "AppointmentType" NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_workshopId_idx" ON "Customer"("workshopId");

-- CreateIndex
CREATE INDEX "Customer_workshopId_phone_idx" ON "Customer"("workshopId", "phone");

-- CreateIndex
CREATE INDEX "MeasurementProfile_customerId_idx" ON "MeasurementProfile"("customerId");

-- CreateIndex
CREATE INDEX "MeasurementProfile_workshopId_idx" ON "MeasurementProfile"("workshopId");

-- CreateIndex
CREATE INDEX "Measurement_profileId_idx" ON "Measurement"("profileId");

-- CreateIndex
CREATE INDEX "Order_workshopId_idx" ON "Order"("workshopId");

-- CreateIndex
CREATE INDEX "Order_workshopId_status_idx" ON "Order"("workshopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_workshopId_reference_key" ON "Order"("workshopId", "reference");

-- CreateIndex
CREATE INDEX "OrderStatusChange_orderId_idx" ON "OrderStatusChange"("orderId");

-- CreateIndex
CREATE INDEX "OrderImage_orderId_idx" ON "OrderImage"("orderId");

-- CreateIndex
CREATE INDEX "OrderTask_orderId_idx" ON "OrderTask"("orderId");

-- CreateIndex
CREATE INDEX "OrderTask_assignedToId_idx" ON "OrderTask"("assignedToId");

-- CreateIndex
CREATE INDEX "Appointment_workshopId_startAt_idx" ON "Appointment"("workshopId", "startAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementProfile" ADD CONSTRAINT "MeasurementProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MeasurementProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_measurementProfileId_fkey" FOREIGN KEY ("measurementProfileId") REFERENCES "MeasurementProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusChange" ADD CONSTRAINT "OrderStatusChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderImage" ADD CONSTRAINT "OrderImage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTask" ADD CONSTRAINT "OrderTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTask" ADD CONSTRAINT "OrderTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
