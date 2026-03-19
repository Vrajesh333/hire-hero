import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function ResumeUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || f.type === "text/plain" || f.name.endsWith(".pdf") || f.name.endsWith(".docx") || f.name.endsWith(".txt")
    );
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const text = await file.text();
        const { data, error } = await supabase.functions.invoke("parse-resume", {
          body: { filename: file.name, content: text },
        });
        if (error) throw error;
      }
      toast.success(`${files.length} resume(s) uploaded and parsed successfully!`);
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload resumes");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="font-heading font-semibold text-lg mb-1">Drop resumes here</p>
          <p className="text-sm text-muted-foreground mb-4">Supports PDF, DOCX, TXT — multiple files allowed</p>
          <label>
            <input type="file" className="hidden" multiple accept=".pdf,.docx,.txt" onChange={handleFileInput} />
            <Button variant="outline" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{files.length} file(s) selected</p>
          <div className="space-y-1.5 max-h-48 overflow-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full gradient-primary text-primary-foreground">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : `Upload & Parse ${files.length} Resume(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
