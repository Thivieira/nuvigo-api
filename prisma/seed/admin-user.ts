
import bcrypt from 'bcrypt';
import { prisma } from '../../src/lib/prisma';

async function main() {
  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@nuvigo.com' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping creation');
    return;
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nuvigo.com',
      password: hashedPassword,
      name: 'Admin User',
      emailVerified: true, // Admin email is pre-verified
    },
  });

  console.log(`Admin user created with ID: ${adminUser.id}`);

  // Set the role to ADMIN using a direct SQL query
  await prisma.$executeRaw`
    UPDATE "User" 
    SET role = 'ADMIN' 
    WHERE id = ${adminUser.id}
  `;

  console.log('Admin role set successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 