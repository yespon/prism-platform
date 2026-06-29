"use client";

import { Trash2Icon, UserPlusIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isTenantAdminRole } from "@/core/permissions/scope";
import type { TenantMemberRole } from "@/core/tenants/api";
import {
  useCurrentTenant,
  useAddTenantMember,
  useRemoveTenantMember,
  useTenantMembers,
  useUpdateTenantMemberRole,
  useUpdateTenantMemberStatus,
} from "@/core/tenants/hooks";

import { SettingsSection } from "./settings-section";

export function TenantGovernanceSettingsPage() {
  const { data: currentTenant } = useCurrentTenant();
  const isTenantAdmin = isTenantAdminRole(currentTenant?.role);
  const { data: members = [], isLoading, error } = useTenantMembers({
    enabled: isTenantAdmin,
  });

  const { mutateAsync: addMember, isPending: adding } = useAddTenantMember();
  const { mutateAsync: updateRole } = useUpdateTenantMemberRole();
  const { mutateAsync: updateStatus } = useUpdateTenantMemberStatus();
  const { mutateAsync: removeMember } = useRemoveTenantMember();

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<TenantMemberRole>("tenant_member");

  const handleAdd = async () => {
    if (!newUserId.trim()) {
      toast.error("请输入要添加的用户 ID");
      return;
    }
    try {
      await addMember({ user_id: newUserId.trim(), role: newRole });
      toast.success("成员已添加");
      setNewUserId("");
      setNewRole("tenant_member");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加成员失败");
    }
  };

  const handleRoleChange = async (userId: string, role: TenantMemberRole) => {
    try {
      await updateRole({ userId, role });
      toast.success("成员角色已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新角色失败");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm(`确认移除成员 ${userId} ?`)) return;
    try {
      await removeMember(userId);
      toast.success("成员已移除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "移除成员失败");
    }
  };

  const handleStatusToggle = async (userId: string, nextStatus: "active" | "inactive") => {
    try {
      await updateStatus({ userId, status: nextStatus });
      toast.success(nextStatus === "active" ? "成员已启用" : "成员已停用");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新成员状态失败");
    }
  };

  return (
    <SettingsSection
      title="工作空间治理"
      description="工作空间管理员可在此管理当前工作空间成员。平台管理员不承担工作空间日常成员运营。"
      action={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          当前角色: {(currentTenant?.role ?? "tenant_member").toUpperCase()}
        </div>
      }
    >
      {!isTenantAdmin ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          仅工作空间管理员可访问该页面。
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_180px_auto]">
            <Input
              placeholder="输入要添加的用户 ID"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              disabled={adding}
            />
            <Select
              value={newRole}
              onValueChange={(value: TenantMemberRole) => setNewRole(value)}
              disabled={adding}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_member">tenant_member</SelectItem>
                <SelectItem value="tenant_admin">tenant_admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => void handleAdd()} disabled={adding || !newUserId.trim()}>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              添加成员
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">成员</th>
                  <th className="px-4 py-2 font-medium">角色</th>
                  <th className="px-4 py-2 font-medium">状态</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      加载中...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      当前工作空间暂无成员
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const label = member.name ?? member.email ?? member.user_id;
                    return (
                      <tr key={member.user_id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">{member.user_id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={member.role === "tenant_admin" ? "tenant_admin" : "tenant_member"}
                            onValueChange={(value: TenantMemberRole) =>
                              void handleRoleChange(member.user_id, value)
                            }
                            disabled={member.status !== "active"}
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tenant_member">tenant_member</SelectItem>
                              <SelectItem value="tenant_admin">tenant_admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              member.status === "active"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }
                          >
                            {member.status === "active" ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void handleStatusToggle(
                                  member.user_id,
                                  member.status === "active" ? "inactive" : "active",
                                )
                              }
                            >
                              {member.status === "active" ? "停用" : "启用"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void handleRemove(member.user_id)}
                            >
                              <Trash2Icon className="mr-1 h-4 w-4" />
                              移除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
