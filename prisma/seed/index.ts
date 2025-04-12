import { prisma } from '../../src/lib/prisma';


async function main() {
  console.log('Starting database seeding...');

  // Import and run all seeders
  await import('./admin-user');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 