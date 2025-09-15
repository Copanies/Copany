import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDiscussionLabelsByCopanyIdAction,
  createDiscussionLabelAction,
  updateDiscussionLabelAction,
  deleteDiscussionLabelAction,
  getDiscussionLabelsByIdsAction,
} from "@/actions/discussionLabel.actions";
import { DiscussionLabel } from "@/types/database.types";

// Query keys for discussion labels
export const discussionLabelsKeys = {
  all: () => ["discussionLabels"] as const,
  copany: (copanyId: string) => ["discussionLabels", "copany", copanyId] as const,
  byIds: (ids: string[]) => ["discussionLabels", "byIds", ids.sort().join(",")] as const,
};

/**
 * Get discussion labels for a copany
 */
export function useDiscussionLabels(copanyId: string) {
  return useQuery({
    queryKey: discussionLabelsKeys.copany(copanyId),
    queryFn: async () => {
      const result = await getDiscussionLabelsByCopanyIdAction(copanyId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.labels;
    },
    enabled: !!copanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get discussion labels by IDs
 */
export function useDiscussionLabelsByIds(ids: string[]) {
  return useQuery({
    queryKey: discussionLabelsKeys.byIds(ids),
    queryFn: async () => {
      const result = await getDiscussionLabelsByIdsAction(ids);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.labels;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create discussion label mutation
 */
export function useCreateDiscussionLabel(copanyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDiscussionLabelAction,
    onSuccess: (result) => {
      if (result.success && result.label) {
        // Update the copany labels cache
        queryClient.setQueryData(
          discussionLabelsKeys.copany(copanyId),
          (oldData: DiscussionLabel[] | undefined) => {
            return oldData ? [...oldData, result.label] : [result.label];
          }
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: discussionLabelsKeys.copany(copanyId),
        });
      }
    },
  });
}

/**
 * Update discussion label mutation
 */
export function useUpdateDiscussionLabel(copanyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDiscussionLabelAction,
    onSuccess: (result) => {
      if (result.success && result.label) {
        // Update the copany labels cache
        queryClient.setQueryData(
          discussionLabelsKeys.copany(copanyId),
          (oldData: DiscussionLabel[] | undefined) => {
            return oldData
              ? oldData.map((label) =>
                  label.id === result.label.id ? result.label : label
                )
              : [result.label];
          }
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: discussionLabelsKeys.copany(copanyId),
        });
      }
    },
  });
}

/**
 * Delete discussion label mutation
 */
export function useDeleteDiscussionLabel(copanyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDiscussionLabelAction,
    onSuccess: (result, deletedLabelId) => {
      if (result.success) {
        // Update the copany labels cache
        queryClient.setQueryData(
          discussionLabelsKeys.copany(copanyId),
          (oldData: DiscussionLabel[] | undefined) => {
            return oldData
              ? oldData.filter((label) => label.id !== deletedLabelId)
              : [];
          }
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: discussionLabelsKeys.copany(copanyId),
        });
      }
    },
  });
}
