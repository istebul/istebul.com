export type BusinessStudioProjectType =
  | "report"
  | "presentation"
  | "analysis";

export type BusinessStudioProjectStatus =
  | "draft"
  | "processing"
  | "completed"
  | "failed";

export interface BusinessStudioProject {
  id: string;
  businessId: string;
  title: string;
  type: BusinessStudioProjectType;
  templateId?: string;
  status: BusinessStudioProjectStatus;
  sourceFileNames: string[];
  createdAt: string;
  updatedAt: string;
}
