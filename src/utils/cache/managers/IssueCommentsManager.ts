import { IssueComment } from "@/types/database.types";
import { issueCommentsCache } from "../instances";
import { GenericDataManager, DataItemOperations } from "../GenericDataManager";

/**
 * Issue comments data validator
 */
function validateIssueComments(comments: IssueComment[]): IssueComment[] {
  return comments.filter((comment) => {
    // Basic validation
    if (!comment.id || !comment.content || !comment.issue_id || !comment.created_by) {
      console.warn(`[IssueCommentsManager] ⚠️ Invalid comment record:`, comment);
      return false;
    }
    return true;
  });
}

/**
 * Issue comments single data item operations definition
 */
const issueCommentItemOperations: DataItemOperations<
  IssueComment[],
  IssueComment
> = {
  findItem: (comments: IssueComment[], commentId: string) => {
    return comments.find((comment) => String(comment.id) === String(commentId)) || null;
  },

  updateItem: (
    comments: IssueComment[],
    commentId: string,
    updatedComment: IssueComment
  ) => {
    const index = comments.findIndex((comment) => comment.id === updatedComment.id);
    if (index !== -1) {
      const newComments = [...comments];
      newComments[index] = updatedComment;
      return newComments;
    }
    return comments;
  },

  addItem: (comments: IssueComment[], newComment: IssueComment) => {
    // Check if already exists, avoid duplicates
    const exists = comments.some((comment) => comment.id === newComment.id);
    if (exists) {
      return comments;
    }
    return [...comments, newComment]; // Add to end (chronological order)
  },

  removeItem: (comments: IssueComment[], commentId: string) => {
    return comments.filter((comment) => String(comment.id) !== String(commentId));
  },
};

/**
 * Internal Issue comments data manager implementation
 */
class IssueCommentsDataManager extends GenericDataManager<
  IssueComment[],
  IssueComment
> {
  constructor(
    onDataUpdated?: (key: string, data: IssueComment[]) => void
  ) {
    super(
      {
        cacheManager: issueCommentsCache,
        managerName: "IssueCommentsManager",
        validator: validateIssueComments,
        enableStaleCache: true, // Comments data may need fallback processing
        onDataUpdated, // Configure data update callback
      },
      issueCommentItemOperations
    );
  }

  protected getDataInfo(data: IssueComment[]): string {
    return `${data.length} comments`;
  }
}

export class IssueCommentsManager {
  private dataManager: IssueCommentsDataManager;

  constructor(
    onDataUpdated?: (key: string, data: IssueComment[]) => void
  ) {
    this.dataManager = new IssueCommentsDataManager(onDataUpdated);
  }

  /**
   * Get comments list for specified issue, prioritize cache
   */
  async getComments(
    issueId: string,
    fetchFn: () => Promise<IssueComment[]>
  ): Promise<IssueComment[]> {
    return this.dataManager.getData(issueId, fetchFn);
  }

  /**
   * Get single comment (find from cached comments list)
   */
  getComment(issueId: string, commentId: string): IssueComment | null {
    return this.dataManager.findItem(issueId, commentId);
  }

  /**
   * Update single comment in cache
   */
  setComment(issueId: string, comment: IssueComment): void {
    this.dataManager.updateItem(issueId, String(comment.id), comment);
  }

  /**
   * Update single comment in cache (alias method, maintain compatibility)
   */
  updateComment(issueId: string, updatedComment: IssueComment): void {
    this.dataManager.updateItem(
      issueId,
      String(updatedComment.id),
      updatedComment
    );
  }

  /**
   * Add new comment to cache
   */
  addComment(issueId: string, comment: IssueComment): void {
    this.dataManager.addItem(issueId, comment);
  }

  /**
   * Remove comment from cache
   */
  removeComment(issueId: string, commentId: string): void {
    this.dataManager.removeItem(issueId, commentId);
  }

  /**
   * Manually set comments cache
   */
  setComments(issueId: string, comments: IssueComment[]): void {
    this.dataManager.setData(issueId, comments);
  }

  /**
   * Clear comments cache for specific issue
   */
  clearComments(issueId: string): void {
    this.dataManager.clearCache(issueId);
  }
}

// Default instance (no callback, for simple operations)
export const issueCommentsManager = new IssueCommentsManager(); 