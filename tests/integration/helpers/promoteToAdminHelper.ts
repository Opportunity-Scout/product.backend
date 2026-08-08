import { PrismaClient } from '@prisma/client';

export async function promoteToAdmin(verificationClient: PrismaClient, userId: string): Promise<void> {
  await verificationClient.user.update({ where: { id: userId }, data: { role: 'admin' } });
}
