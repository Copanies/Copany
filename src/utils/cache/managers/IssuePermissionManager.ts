import type { Copany, IssueWithAssignee, AssigneeUser } from "@/types/database.types";
import { currentUserManager } from "./CurrentUserManager";
import { copanyManager } from "./CopanyManager";
import { getCopanyByIdAction } from "@/actions/copany.actions";

interface PermissionContext {
  userId: string | null;
  copanyOwnerId: string | null;
}

export class IssuePermissionManager {
  private contextByCopany = new Map<string, PermissionContext>();

  async getContext(copanyId: string): Promise<PermissionContext> {
    const cached = this.contextByCopany.get(copanyId);
    if (cached) return cached;

    const [user, copany] = await Promise.all([
      currentUserManager.getCurrentUser().catch(() => null),
      copanyManager.getCopany(copanyId, async () => {
        const result = await getCopanyByIdAction(copanyId);
        if (!result) throw new Error("Copany not found");
        return result as Copany;
      }).catch(() => null),
    ]);

    const ctx: PermissionContext = {
      userId: user?.id || null,
      copanyOwnerId: copany?.created_by || null,
    };
    this.contextByCopany.set(copanyId, ctx);
    return ctx;
  }

  async canEditIssue(copanyId: string, issue: IssueWithAssignee): Promise<boolean> {
    const ctx = await this.getContext(copanyId);
    const uid = ctx.userId;
    const ownerId = ctx.copanyOwnerId;
    if (!uid) return false;
    const isCreator = !!(issue.created_by && String(issue.created_by) === String(uid));
    const isAssignee = !!(issue.assignee && String(issue.assignee) === String(uid));
    const isOwner = !!(ownerId && String(ownerId) === String(uid));
    return isCreator || isAssignee || isOwner;
  }

  clear(copanyId?: string) {
    if (copanyId) this.contextByCopany.delete(copanyId);
    else this.contextByCopany.clear();
  }
}

export const issuePermissionManager = new IssuePermissionManager();


