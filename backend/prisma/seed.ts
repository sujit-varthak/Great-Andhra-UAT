import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { randomUUID, randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@greatandhra.com';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const inviteToken = randomBytes(32).toString('hex');
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'GreatAndhra Admin',
        role: Role.ADMIN,
        status: UserStatus.INVITED,
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('Seeded admin invite:');
    console.log(`  email: ${adminEmail}`);
    console.log(`  invite token: ${inviteToken}`);
    console.log('  complete signup via POST /auth/accept-invite');
  } else {
    console.log(`Admin user ${adminEmail} already exists, skipping.`);
  }

  const categories = [
    { name: 'Politics', slug: 'politics' },
    { name: 'Movies', slug: 'movies' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Business', slug: 'business' },
    { name: 'Technology', slug: 'technology' },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { id: randomUUID(), ...c },
    });
  }

  const tags = ['breaking', 'exclusive', 'analysis', 'review'];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { slug: name },
      update: {},
      create: { id: randomUUID(), name, slug: name },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
