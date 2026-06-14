import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const users = await prisma.user.findMany()
    console.log('users:', users)
  } catch (e) {
    console.error('error:', e)
  }
}
main()
