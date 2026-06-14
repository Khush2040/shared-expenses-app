import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const usersToCreate = ['Aisha', 'Rohan', 'Priya', 'Meera', 'Sam', 'Dev']
  
  const createdUsers = []
  for (const name of usersToCreate) {
    const u = await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name, email: `${name.toLowerCase()}@example.com` }
    })
    createdUsers.push(u)
  }

  const group = await prisma.group.create({
    data: { name: 'Flatmates', defaultCurrency: 'INR' }
  })

  // Meera left at end of March (2026-03-31)
  // Sam joined mid-April (2026-04-15)
  // Others joined at start (2026-02-01)
  const memberData = [
    { name: 'Aisha', joinedAt: new Date('2026-02-01') },
    { name: 'Rohan', joinedAt: new Date('2026-02-01') },
    { name: 'Priya', joinedAt: new Date('2026-02-01') },
    { name: 'Meera', joinedAt: new Date('2026-02-01'), leftAt: new Date('2026-03-31') },
    { name: 'Sam', joinedAt: new Date('2026-04-08') }, // Sam's first expense is Apr 8
    { name: 'Dev', joinedAt: new Date('2026-02-08'), leftAt: new Date('2026-03-15') }, // Dev visited a few times
  ]

  for (const m of memberData) {
    const user = createdUsers.find(u => u.name === m.name)
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: user!.id,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt
      }
    })
  }

  console.log('Seed data created. Group ID:', group.id)
}

main().catch(console.error)
