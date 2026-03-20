import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { useCreateJob } from "@/lib/queries";
import { toast } from "sonner";

export function JobForm({ onSuccess }: { onSuccess?: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [experienceMin, setExperienceMin] = useState("");
  const [experienceMax, setExperienceMax] = useState("");

  const createJob = useCreateJob();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    try {
      await createJob.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim() || null,
        skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : null,
        education: education.trim() || null,
        experience_min: experienceMin ? parseInt(experienceMin) : 0,
        experience_max: experienceMax ? parseInt(experienceMax) : null,
        status: "active",
      });
      toast.success("Job role created!");
      setTitle(""); setDescription(""); setRequirements(""); setSkills(""); setEducation("");
      setExperienceMin(""); setExperienceMax("");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create job");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> New Job Role</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Job Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Developer" />
          </div>
          <div>
            <Label htmlFor="desc">Job Description *</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the role, responsibilities, and what you're looking for..." rows={4} />
          </div>
          <div>
            <Label htmlFor="reqs">Requirements</Label>
            <Textarea id="reqs" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="List key requirements..." rows={3} />
          </div>
          <div>
            <Label htmlFor="skills">Required Skills (comma-separated)</Label>
            <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Node.js" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="edu">Education Level</Label>
              <Input id="edu" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. Bachelor's" />
            </div>
            <div>
              <Label htmlFor="expMin">Min Experience (yrs)</Label>
              <Input id="expMin" type="number" value={experienceMin} onChange={(e) => setExperienceMin(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="expMax">Max Experience (yrs)</Label>
              <Input id="expMax" type="number" value={experienceMax} onChange={(e) => setExperienceMax(e.target.value)} placeholder="10" />
            </div>
          </div>
          <Button type="submit" disabled={createJob.isPending} className="w-full gradient-primary text-primary-foreground">
            {createJob.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Create Job Role"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
