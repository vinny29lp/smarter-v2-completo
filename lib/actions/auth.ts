"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(data: {
  name: string; email: string; password: string;
  role: string; franchiseId?: string; companyId?: string;
}) {
  const hash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: { ...data, password: hash, role: data.role as any },
  });
}

export async function changePassword(userId: string, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({ where: { id: userId }, data: { password: hash } });
}
