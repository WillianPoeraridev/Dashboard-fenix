import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "marcelo@fenixfibra.com.br";

  // Senha vem do ambiente — nunca hardcoded no repo.
  const senha = process.env.SEED_GERENTE_PASSWORD;
  if (!senha || senha.length < 8) {
    throw new Error(
      "[SEED] SEED_GERENTE_PASSWORD ausente ou fraca (mínimo 8 caracteres). Defina no .env antes de rodar o seed.",
    );
  }

  const passwordHash = await hash(senha, 10);

  // Upsert: cria o gerente ou ressincroniza a senha se ele já existir.
  // (Necessário porque versões antigas do seed gravavam uma senha fixa no banco.)
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      name: "Marcelo",
      email,
      passwordHash,
      role: "GERENTE",
    },
  });
  console.log("Usuário gerente criado/atualizado:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
