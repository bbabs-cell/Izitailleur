-- CreateTable
CREATE TABLE "GarmentModel" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "referenceImageUrl" TEXT,
    "basePrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GarmentModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GarmentModel_workshopId_idx" ON "GarmentModel"("workshopId");

-- AddForeignKey
ALTER TABLE "GarmentModel" ADD CONSTRAINT "GarmentModel_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
