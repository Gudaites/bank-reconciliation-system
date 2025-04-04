-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('BANK', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'MATCHED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" "TransactionSource" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "accountingTransactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_date_amount_type_status_idx" ON "Transaction"("date", "amount", "type", "status");

-- CreateIndex
CREATE INDEX "Transaction_source_status_idx" ON "Transaction"("source", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Match_bankTransactionId_key" ON "Match"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_accountingTransactionId_key" ON "Match"("accountingTransactionId");

-- CreateIndex
CREATE INDEX "Match_bankTransactionId_idx" ON "Match"("bankTransactionId");

-- CreateIndex
CREATE INDEX "Match_accountingTransactionId_idx" ON "Match"("accountingTransactionId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_accountingTransactionId_fkey" FOREIGN KEY ("accountingTransactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
