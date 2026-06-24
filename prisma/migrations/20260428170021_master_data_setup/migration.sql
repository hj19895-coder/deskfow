-- CreateTable
CREATE TABLE "TicketHistory" (
"id" text NOT NULL,
	"ticketId" text NOT NULL,
	"userId" text NOT NULL,
	"field" text NOT NULL,
	"oldValue" text,
	"newValue" text NOT NULL,
	"createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketHistory_ticketId_createdAt_idx" ON "TicketHistory"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketHistory_userId_idx" ON "TicketHistory"("userId");

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;

