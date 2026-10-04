/*
  Warnings:

  - You are about to drop the column `currentStatus` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the `DevelopmentRequester` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Requester', 'ITStaff', 'Administrator');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('New', 'Open', 'InProgress', 'WaitingForRequester', 'Resolved', 'Closed', 'Reopened', 'Cancelled');

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "currentStatus",
ADD COLUMN     "itPriority" TEXT,
ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'New',
ADD COLUMN     "ticketOwnerId" INTEGER;

-- DropTable
DROP TABLE "DevelopmentRequester";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Requester',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketOwnerId_fkey" FOREIGN KEY ("ticketOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
