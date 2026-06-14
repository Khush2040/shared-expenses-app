'use server';

import { prisma } from '@/lib/prisma';
import { processCsvImport } from '@/lib/importer';

export async function uploadCsvAction(formData: FormData) {
  const file = formData.get('file') as File;
  const groupId = formData.get('groupId') as string;
  const userId = formData.get('userId') as string;

  if (!file || !groupId || !userId) {
    throw new Error('Missing file, groupId, or userId');
  }

  const csvContent = await file.text();
  const jobId = await processCsvImport(csvContent, groupId, userId);
  return jobId;
}

export async function getImportJob(jobId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      anomalies: {
        orderBy: { rowIndex: 'asc' }
      }
    }
  });
  return job;
}

export async function getGroups() {
  return await prisma.group.findMany();
}

export async function getUsers() {
  return await prisma.user.findMany();
}

// Function to resolve an anomaly
export async function resolveAnomaly(anomalyId: string, action: 'APPROVE' | 'REJECT', editedRowData?: string) {
  if (action === 'REJECT') {
    return await prisma.importAnomaly.update({
      where: { id: anomalyId },
      data: { resolutionStatus: 'REJECTED' }
    });
  }

  return await prisma.importAnomaly.update({
    where: { id: anomalyId },
    data: {
      resolutionStatus: 'APPROVED',
      ...(editedRowData && { rowData: editedRowData })
    }
  });
}

import { processRowIntoExpense } from '@/lib/expenseCalculator';

export async function commitImportJob(jobId: string, importerUserId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { anomalies: true }
  });

  if (!job) throw new Error('Job not found');

  const approved = job.anomalies.filter(a => a.resolutionStatus === 'APPROVED' || a.issueType === 'NONE');

  for (const anomaly of approved) {
    if (anomaly.resolutionStatus === 'REJECTED') continue;
    const rowData = JSON.parse(anomaly.rowData);
    await processRowIntoExpense(rowData, job.groupId, importerUserId);
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETED' }
  });

  return true;
}

