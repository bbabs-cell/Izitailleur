-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT', 'DELIVERY', 'URGENT_ORDER', 'DELAY', 'DEBT', 'STOCK', 'TASK', 'ISSUE');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedEntity" TEXT,
    "relatedEntityId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_workshopId_read_idx" ON "Notification"("workshopId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_workshopId_type_relatedEntityId_key" ON "Notification"("workshopId", "type", "relatedEntityId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
