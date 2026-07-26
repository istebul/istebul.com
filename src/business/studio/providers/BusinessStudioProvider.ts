import type {
  BusinessStudioProject,
  BusinessStudioProjectType,
} from "../models/BusinessStudioProject";

export interface CreateStudioProjectInput {
  businessId: string;
  userId: string;
  title: string;
  type: BusinessStudioProjectType;
  templateId?: string;
}

export interface BusinessStudioProvider {
  listProjects(businessId: string): Promise<BusinessStudioProject[]>;
  createProject(
    input: CreateStudioProjectInput,
  ): Promise<BusinessStudioProject>;
}
