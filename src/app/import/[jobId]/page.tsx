import { getImportJob } from '@/app/actions';
import AnomalyResolver from './AnomalyResolver';

export default async function ImportJobPage({ params }: { params: { jobId: string } }) {
  const job = await getImportJob(params.jobId);

  if (!job) {
    return <div>Job not found</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="header-title">Import Anomaly Review</h2>
        <span className="badge badge-warning">Status: {job.status}</span>
      </div>
      
      <p className="text-secondary mb-8">
        Review the detected anomalies below. You can approve the proposed resolutions, edit the data manually, or reject the row entirely to exclude it from the import.
      </p>

      <AnomalyResolver initialAnomalies={job.anomalies} jobId={job.id} />
    </div>
  );
}
