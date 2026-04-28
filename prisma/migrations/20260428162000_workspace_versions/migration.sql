-- Workspace history snapshots for admin restore.
CREATE TABLE "WorkspaceVersion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'autosave',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceVersion_userId_createdAt_idx" ON "WorkspaceVersion"("userId", "createdAt");

ALTER TABLE "WorkspaceVersion"
ADD CONSTRAINT "WorkspaceVersion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

