import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth-utils";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@meeplix.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "Administrador";

  console.log("🌱 Iniciando seed do banco de dados...");

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("✅ Usuário admin já existe:", adminEmail);
  } else {
    const passwordHash = await hashPassword(adminPassword);

    const admin = await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
      },
    });

    console.log("✅ Usuário admin criado com sucesso!");
    console.log(`   E-mail: ${admin.email}`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   ID: ${admin.id}`);
    console.log("");
  }

  const existingConfig = await prisma.siteConfig.findFirst();
  if (!existingConfig) {
    await prisma.siteConfig.create({
      data: {
        hideDesigners: true,
        hidePublishers: false,
        hideArtists: false,
        hideTags: false,
      },
    });
    console.log("✅ Configurações de exibição padrão criadas.");
  } else {
    console.log("ℹ️  Configurações de exibição já existem.");
  }

  console.log("");
  console.log("⚠️  IMPORTANTE: Altere a senha padrão no primeiro login!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });