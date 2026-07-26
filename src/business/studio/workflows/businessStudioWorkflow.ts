export type BusinessStudioWorkflowStep =
  | "select-type"
  | "select-template"
  | "upload-files"
  | "configure"
  | "generate"
  | "review"
  | "export";

export const BUSINESS_STUDIO_WORKFLOW: BusinessStudioWorkflowStep[] = [
  "select-type",
  "select-template",
  "upload-files",
  "configure",
  "generate",
  "review",
  "export",
];
