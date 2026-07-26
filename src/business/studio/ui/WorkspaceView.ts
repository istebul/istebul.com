export interface WorkspaceAction {
  id: string;
  title: string;
  description: string;
}

export const WORKSPACE_ACTIONS: WorkspaceAction[] = [
  {
    id: "new-report",
    title: "Yeni Rapor",
    description: "AI ile profesyonel rapor oluştur."
  },
  {
    id: "new-presentation",
    title: "Yeni Sunum",
    description: "PowerPoint sunumu hazırla."
  },
  {
    id: "analyze-file",
    title: "Dosya Analizi",
    description: "Excel, PDF veya CSV yükle."
  },
  {
    id: "templates",
    title: "Hazır Şablonlar",
    description: "Kurumsal rapor şablonlarını kullan."
  }
];

export function WorkspaceView() {
  return WORKSPACE_ACTIONS;
}
