import { PrismaClient } from "@prisma/client";
import { ensureBootstrapOwnersSeeded } from "../src/lib/bootstrap-owner-account";

const prisma = new PrismaClient();

async function main() {
  await ensureBootstrapOwnersSeeded(prisma);
}

main()
  .catch((e) => {
    console.error("[seed]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
