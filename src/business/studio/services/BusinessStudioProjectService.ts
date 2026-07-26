import type {
  BusinessStudioProject,
  BusinessStudioProjectType,
} from "../models/BusinessStudioProject";

export interface CreateBusinessStudioProjectInput {
  businessId: string;
  title: string;
  type: BusinessStudioProjectType;
  templateId?: string;
  sourceFileNames?: string[];
}

export class BusinessStudioProjectService {
  create(
    input: CreateBusinessStudioProjectInput,
  ): BusinessStudioProject {
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      title: input.title.trim(),
      type: input.type,
      templateId: input.templateId,
      status: "draft",
      sourceFileNames: input.sourceFileNames ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }
}
