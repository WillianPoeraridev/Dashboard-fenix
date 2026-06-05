import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "marcelo@fenixfibra.com.br";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Usuário gerente já existe:", email);
    return;
  }

  const passwordHash = await hash("fenix2025", 10);
  await prisma.user.create({
    data: {
      name: "Marcelo",
      email,
      passwordHash,
      role: "GERENTE",
    },
  });
  console.log("Usuário gerente criado:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());