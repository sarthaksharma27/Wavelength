-- CreateTable
CREATE TABLE "GuestToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestToken_token_key" ON "GuestToken"("token");
