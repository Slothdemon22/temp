-- AlterTable
ALTER TABLE "books" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "books_isDeleted_idx" ON "books"("isDeleted");
