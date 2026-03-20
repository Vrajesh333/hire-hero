import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCandidates, useDeleteAllCandidates, useDeleteCandidates } from "@/lib/queries";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { Checkbox } from "@/components/ui/checkbox";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (!error || typeof error !== "object") {
    return "Failed to upload resumes";
  }

  const e = error as {
    message?: string;
    name?: string;
    context?: {
      json?: () => Promise<any>;
      text?: () => Promise<string>;
      status?: number;
    };
  };

  // Supabase Functions errors include a response-like context with server payload.
  if (e.context) {
    try {
      if (typeof e.context.json === "function") {
        const payload = await e.context.json();
        const details = payload?.error || payload?.message;
        if (typeof details === "string" && details.trim()) return details;
      }
    } catch {
      // Ignore JSON parsing errors and try text fallback.
    }

    try {
      if (typeof e.context.text === "function") {
        const raw = await e.context.text();
        if (raw?.trim()) return raw;
      }
    } catch {
      // Ignore text parsing errors and continue fallback chain.
    }

    if (e.context.status === 429) return "Rate limited by AI service. Please try again shortly.";
    if (e.context.status === 402) return "AI credits exhausted. Please add credits and retry.";
  }

  if (e.message?.includes("non-2xx")) {
    return "Upload failed in Edge Function. Check function logs and required secrets (LOVABLE_API_KEY, SUPABASE_SERVICE_ROLE_KEY).";
  }

  return e.message || "Failed to upload resumes";
}

function isEdgeFunctionTransportError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const e = error as { name?: string; message?: string };
  const msg = (e.message || "").toLowerCase();

  return (
    e.name === "FunctionsFetchError" ||
    msg.includes("failed to send a request to the edge function") ||
    msg.includes("failed to fetch") ||
    msg.includes("network")
  );
}

function getFunctionStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { context?: { status?: number } };
  return typeof e.context?.status === "number" ? e.context.status : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function invokeParseResumeWithRetry(filename: string, content: string) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.functions.invoke("parse-resume", {
      body: { filename, content },
    });

    if (!error) return;

    const status = getFunctionStatusCode(error);
    const message = await getFunctionErrorMessage(error);
    const lower = message.toLowerCase();
    const canRetry =
      attempt < maxAttempts &&
      (status === 429 || status === 500 || lower.includes("parseable") || lower.includes("ai error"));

    if (canRetry) {
      await sleep(1200 * attempt);
      continue;
    }

    throw error;
  }
}

function inferCandidateName(filename: string, text: string): string | null {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 2 && line.length < 80);

  if (firstLine) {
    return firstLine.replace(/\s+/g, " ").trim();
  }

  const base = filename.replace(/\.[^.]+$/, "");
  const pretty = base
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return pretty || null;
}

function inferEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || null;
}

function inferPhone(text: string): string | null {
  const compact = text.replace(/\s+/g, " ");
  const match = compact.match(/(\+?\d[\d\s().-]{8,}\d)/);
  return match?.[0]?.trim() || null;
}

function inferSkills(text: string): string[] {
  const knownSkills = [
    "javascript",
    "typescript",
    "react",
    "node",
    "python",
    "java",
    "sql",
    "aws",
    "docker",
    "kubernetes",
    "graphql",
    "git",
  ];

  const lower = text.toLowerCase();
  return knownSkills.filter((skill) => lower.includes(skill));
}

async function saveCandidateFallback(filename: string, text: string) {
  const payload = {
    name: inferCandidateName(filename, text),
    email: inferEmail(text),
    phone: inferPhone(text),
    skills: inferSkills(text),
    resume_filename: filename,
    raw_text: text,
    ai_summary: null,
  };

  const { error } = await supabase.from("candidates").insert(payload);
  if (error) throw error;
}

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

async function extractPdfText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;

  const chunks: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    let previousY: number | null = null;
    const lineParts: string[] = [];

    for (const item of content.items as Array<{ str?: string; transform?: number[]; hasEOL?: boolean }>) {
      const text = (item.str || "").trim();
      if (!text) continue;

      const y = Array.isArray(item.transform) ? item.transform[5] : null;
      const movedToNewLine =
        previousY !== null && y !== null && Math.abs(y - previousY) > 2;

      if (lineParts.length === 0 || movedToNewLine || item.hasEOL) {
        lineParts.push(text);
      } else {
        lineParts[lineParts.length - 1] = `${lineParts[lineParts.length - 1]} ${text}`;
      }

      previousY = y;
    }

    const pageText = lineParts
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (pageText) {
      chunks.push(pageText);
    }
  }

  return chunks.join("\n\n").trim();
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.replace(/\s+/g, " ").trim();
}

async function extractTextFromResume(file: File): Promise<string> {
  const ext = getFileExtension(file.name);

  if (ext === "pdf") {
    return extractPdfText(file);
  }

  if (ext === "docx") {
    return extractDocxText(file);
  }

  return (await file.text()).trim();
}

export function ResumeUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const qc = useQueryClient();
  const { data: candidates } = useCandidates();
  const deleteCandidates = useDeleteCandidates();
  const deleteAllCandidates = useDeleteAllCandidates();

  const candidateList = candidates ?? [];
  const allSelected = useMemo(
    () => candidateList.length > 0 && selectedCandidateIds.length === candidateList.length,
    [candidateList.length, selectedCandidateIds.length],
  );

  useEffect(() => {
    const validIds = new Set(candidateList.map((c) => c.id));
    setSelectedCandidateIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [candidateList]);

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

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((candidateId) => candidateId !== id) : [...prev, id],
    );
  };

  const toggleSelectAllCandidates = () => {
    if (allSelected) {
      setSelectedCandidateIds([]);
      return;
    }

    setSelectedCandidateIds(candidateList.map((candidate) => candidate.id));
  };

  const handleDeleteSelected = async () => {
    if (selectedCandidateIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedCandidateIds.length} selected resume(s)? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteCandidates.mutateAsync(selectedCandidateIds);
      toast.success(`${selectedCandidateIds.length} resume(s) deleted.`);
      setSelectedCandidateIds([]);
    } catch (error) {
      const msg = await getFunctionErrorMessage(error);
      toast.error(`Failed to delete selected resumes: ${msg}`);
    }
  };

  const handleDeleteAll = async () => {
    if (candidateList.length === 0) return;

    const confirmed = window.confirm(
      `Delete all ${candidateList.length} uploaded resume(s)? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteAllCandidates.mutateAsync();
      toast.success("All resumes deleted from database.");
      setSelectedCandidateIds([]);
    } catch (error) {
      const msg = await getFunctionErrorMessage(error);
      toast.error(`Failed to delete all resumes: ${msg}`);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    const failures: string[] = [];

    try {
      for (const file of files) {
        let extractedText = "";
        try {
          extractedText = await extractTextFromResume(file);
          if (!extractedText.trim()) {
            throw new Error("Could not extract readable text from this file.");
          }

          await invokeParseResumeWithRetry(file.name, extractedText);
          successCount++;
        } catch (err) {
          const msg = await getFunctionErrorMessage(err);
          failures.push(`${file.name}: ${msg}`);
        }
      }

      if (successCount > 0) {
        qc.invalidateQueries({ queryKey: ["candidates"] });
        toast.success(`${successCount} resume(s) uploaded and parsed successfully.`);
      }

      if (failures.length > 0) {
        const first = failures[0];
        const extra = failures.length > 1 ? ` (+${failures.length - 1} more)` : "";
        toast.error(`Upload failed for ${failures.length} file(s). ${first}${extra}`);
      }

      if (successCount > 0) {
        setFiles([]);
      }
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Manage Uploaded Resumes</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {candidateList.length} resume(s) currently stored in database
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={
                  selectedCandidateIds.length === 0 ||
                  deleteCandidates.isPending ||
                  deleteAllCandidates.isPending
                }
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                disabled={
                  candidateList.length === 0 || deleteCandidates.isPending || deleteAllCandidates.isPending
                }
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAllCandidates} />
            <span>Select all</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-auto">
            {candidateList.map((candidate) => {
              const label = candidate.resume_filename || candidate.name || "Untitled Resume";
              const isSelected = selectedCandidateIds.includes(candidate.id);

              return (
                <div key={candidate.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                    />
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-3">
                    {new Date(candidate.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}

            {candidateList.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No uploaded resumes found in database.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
