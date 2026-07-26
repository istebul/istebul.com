import type {
  BusinessStudioProject,
  BusinessStudioProjectStatus,
  BusinessStudioProjectType,
} from "../../models/BusinessStudioProject";
import type {
  BusinessStudioProvider,
  CreateStudioProjectInput,
} from "../BusinessStudioProvider";

type ProjectRow = {
  id: string;
  business_id: string;
  title: string;
  project_type: BusinessStudioProjectType;
  template_id: string | null;
  status: BusinessStudioProjectStatus;
  created_at: string;
  updated_at: string;
};

type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

interface SupabaseQueryBuilder<T> {
  select(columns: string): SupabaseQueryBuilder<T>;
  eq(column: string, value: string): SupabaseQueryBuilder<T>;
  order(
    column: string,
    options: { ascending: boolean },
  ): Promise<QueryResult<T[]>>;
  insert(values: Record<string, unknown>): {
    select(columns: string): {
      single(): Promise<QueryResult<T>>;
    };
  };
}

export interface SupabaseStudioClient {
  from<T>(table: string): SupabaseQueryBuilder<T>;
}

function mapProject(row: ProjectRow): BusinessStudioProject {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    type: row.project_type,
    templateId: row.template_id ?? undefined,
    status: row.status,
    sourceFileNames: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseBusinessStudioProvider
  implements BusinessStudioProvider
{
  constructor(private readonly client: SupabaseStudioClient) {}

  async listProjects(
    businessId: string,
  ): Promise<BusinessStudioProject[]> {
    const { data, error } = await this.client
      .from<ProjectRow>("business_projects")
      .select("*")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapProject);
  }

  async createProject(
    input: CreateStudioProjectInput,
  ): Promise<BusinessStudioProject> {
    const { data, error } = await this.client
      .from<ProjectRow>("business_projects")
      .insert({
        business_id: input.businessId,
        created_by: input.userId,
        title: input.title.trim(),
        project_type: input.type,
        template_id: input.templateId ?? null,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Business projesi oluşturulamadı.");
    }

    return mapProject(data);
  }
}
