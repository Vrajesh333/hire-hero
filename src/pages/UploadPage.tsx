import { AppLayout } from "@/components/AppLayout";
import { ResumeUploader } from "@/components/ResumeUploader";

export default function UploadPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Upload Resumes</h2>
          <p className="text-muted-foreground">Upload one or more resumes and AI will extract key information automatically.</p>
        </div>
        <ResumeUploader />
      </div>
    </AppLayout>
  );
}
