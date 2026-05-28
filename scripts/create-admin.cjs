#!/usr/bin/env node
// SmartTicket Bus - Create Admin User (standalone, no TypeScript needed)
// Runs at container startup to ensure admin account exists
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const db = new PrismaClient();

  try {
    const email = process.env.ADMIN_EMAIL || 'admin@smartticket.bus';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'Super Administrateur';
    const phone = process.env.ADMIN_PHONE || '+221 77 123 00 00';

    // Check if admin already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`✅ Admin user "${email}" already exists - skipping`);
      return;
    }

    // Hash password and create
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'SUPERADMIN',
        isActive: true,
        phone,
      },
    });

    console.log(`✅ Admin user created: ${admin.email} (${admin.name})`);
  } catch (err) {
    console.error('❌ Failed to create admin user:', err.message);
    // Non-blocking — don't crash the container
  } finally {
    await db.$disconnect();
  }
}

createAdmin();
