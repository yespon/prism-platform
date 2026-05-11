export interface Skill {
  name: string;
  description: string;
  category: string;
  license: string | null;
  enabled: boolean;
  bound_tools?: string[];
  prompt_template?: string | null;
  strategy?: string | null;
  instructions?: string | null;
}


export interface AvailableSkillResponse extends Skill {
  scope: string; // "global" | "tenant"
  source: string; // Skill source classification
  managed_by_current_user: boolean; // Whether current user can manage this skill
  effective_permissions: string[]; // ["read", "write", "delete", "share", ...]
}

export interface AvailableSkillsListResponse {
  skills: AvailableSkillResponse[];
}
