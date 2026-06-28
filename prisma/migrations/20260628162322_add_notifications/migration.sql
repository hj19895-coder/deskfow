/*
  Warnings:

  - You are about to drop the column `title` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Priority` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Status` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ticketNumber]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `requesterName` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_priorityId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_statusId_fkey";

-- DropForeignKey
ALTER TABLE "TicketHistory" DROP CONSTRAINT "TicketHistory_userId_fkey";

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "title",
ADD COLUMN     "assignedOn" TIMESTAMP(3),
ADD COLUMN     "clientConfirmationId" TEXT,
ADD COLUMN     "clientNameId" TEXT,
ADD COLUMN     "completedDate" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "estimatedTatHrs" DOUBLE PRECISION,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "isMerged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemId" TEXT,
ADD COLUMN     "levelId" TEXT,
ADD COLUMN     "mergedIntoId" TEXT,
ADD COLUMN     "raisedById" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "reopened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requesterName" TEXT NOT NULL,
ADD COLUMN     "resolvedDate" TIMESTAMP(3),
ADD COLUMN     "responseDueByTime" TIMESTAMP(3),
ADD COLUMN     "rootCauseCategoryId" TEXT,
ADD COLUMN     "seatEffectedId" TEXT,
ADD COLUMN     "severityId" TEXT,
ADD COLUMN     "siteId" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "subcategoryId" TEXT,
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "tat" TIMESTAMP(3),
ADD COLUMN     "ticketNumber" SERIAL NOT NULL,
ADD COLUMN     "ticketTypeId" TEXT;

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Priority";

-- DropTable
DROP TABLE "Status";

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterData" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTablePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "visibleColumns" JSONB NOT NULL,
    "columnWidths" JSONB NOT NULL,
    "columnOrder" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTablePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ticketId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_page_key" ON "RolePermission"("roleId", "page");

-- CreateIndex
CREATE INDEX "MasterData_type_isActive_idx" ON "MasterData"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MasterData_type_value_key" ON "MasterData"("type", "value");

-- CreateIndex
CREATE INDEX "UserTablePreference_pageKey_idx" ON "UserTablePreference"("pageKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserTablePreference_userId_pageKey_key" ON "UserTablePreference"("userId", "pageKey");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTablePreference" ADD CONSTRAINT "UserTablePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "MasterData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_severityId_fkey" FOREIGN KEY ("severityId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_clientNameId_fkey" FOREIGN KEY ("clientNameId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "MasterData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_rootCauseCategoryId_fkey" FOREIGN KEY ("rootCauseCategoryId") REFERENCES "MasterData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
