export type AnnouncementReadState = {
  read_at?: string | null;
  dismissed_at?: string | null;
  is_read?: boolean;
  is_dismissed?: boolean;
};

export type AnnouncementItem = {
  id: number;
  title: string;
  content: string;
  type: string;
  severity: "info" | "warning" | "critical" | string;
  scope: string;
  target_roles: string[];
  target_tenant_ids: string[];
  publish_at: string;
  expire_at: string;
  pinned_until?: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  read_state?: AnnouncementReadState | null;
};

export type AnnouncementListResponse = {
  items?: AnnouncementItem[];
};

export type AnnouncementActionResponse = {
  status: string;
};

export type CreateAnnouncementInput = {
  title: string;
  content: string;
  type: string;
  severity: string;
  scope: string;
  target_roles: string[];
  target_tenant_ids: string[];
  publish_at: string;
  expire_at: string;
  pinned_until?: string | null;
  status: string;
};

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export type AdminTenantTarget = {
  id: string;
  name: string;
};
