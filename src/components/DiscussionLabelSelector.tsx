"use client";

import { useState } from "react";
import { DiscussionLabel } from "@/types/database.types";
import {
  useDiscussionLabels,
  useCreateDiscussionLabel,
  useUpdateDiscussionLabel,
  useDeleteDiscussionLabel,
} from "@/hooks/discussionLabels";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import Dropdown from "@/components/commons/Dropdown";
import Modal from "@/components/commons/Modal";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

interface DiscussionLabelSelectorProps {
  copanyId: string;
  selectedLabelIds: string[];
  onLabelChange?: (selectedLabelIds: string[]) => void;
  showBackground?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}

export default function DiscussionLabelSelector({
  copanyId,
  selectedLabelIds,
  onLabelChange,
  showBackground = false,
  readOnly = false,
  placeholder = "Select labels...",
}: DiscussionLabelSelectorProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState<DiscussionLabel | null>(
    null
  );
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6B7280");
  const [newLabelDescription, setNewLabelDescription] = useState("");

  const { data: labels = [], isLoading } = useDiscussionLabels(copanyId);
  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const createLabelMutation = useCreateDiscussionLabel(copanyId);
  const updateLabelMutation = useUpdateDiscussionLabel(copanyId);
  const deleteLabelMutation = useDeleteDiscussionLabel(copanyId);

  // Check if current user is copany owner
  const isCopanyOwner =
    currentUser && copany && currentUser.id === copany.created_by;

  const selectedLabels = labels.filter((label) =>
    selectedLabelIds.includes(label.id)
  );

  const handleLabelToggle = (labelId: string) => {
    if (readOnly) return;

    const newSelectedIds = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];

    onLabelChange?.(newSelectedIds);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    try {
      const result = await createLabelMutation.mutateAsync({
        copany_id: copanyId,
        name: newLabelName.trim(),
        color: newLabelColor,
        description: newLabelDescription.trim() || undefined,
      });

      if (result.success && result.label) {
        // Automatically select the newly created label
        onLabelChange?.([...selectedLabelIds, result.label.id]);
        closeCreateModal();
      }
    } catch (error) {
      console.error("Failed to create label:", error);
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel || !newLabelName.trim()) return;

    try {
      await updateLabelMutation.mutateAsync({
        ...editingLabel,
        name: newLabelName.trim(),
        color: newLabelColor,
        description: newLabelDescription.trim() || null,
      });

      closeEditModal();
    } catch (error) {
      console.error("Failed to update label:", error);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (readOnly || !isCopanyOwner) return;

    try {
      await deleteLabelMutation.mutateAsync(labelId);
      // Remove from selected labels if it was selected
      if (selectedLabelIds.includes(labelId)) {
        onLabelChange?.(selectedLabelIds.filter((id) => id !== labelId));
      }
      // Close edit modal if deleting the currently editing label
      if (editingLabel?.id === labelId) {
        closeEditModal();
      }
    } catch (error) {
      console.error("Failed to delete label:", error);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewLabelName("");
    setNewLabelColor("#6B7280");
    setNewLabelDescription("");
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingLabel(null);
    setNewLabelName("");
    setNewLabelColor("#6B7280");
    setNewLabelDescription("");
  };

  const startEditingLabel = (label: DiscussionLabel) => {
    setEditingLabel(label);
    setNewLabelName(label.name);
    setNewLabelColor(label.color);
    setNewLabelDescription(label.description || "");
    setShowEditModal(true);
  };

  const startCreatingLabel = () => {
    setNewLabelName("");
    setNewLabelColor("#6B7280");
    setNewLabelDescription("");
    setShowCreateModal(true);
  };

  const renderLabelChip = (label: DiscussionLabel, isSelected: boolean) => (
    <div
      key={label.id}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-opacity-20 border-opacity-50"
          : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
      }`}
      style={{
        backgroundColor: isSelected ? `${label.color}20` : undefined,
        borderColor: isSelected ? label.color : undefined,
        color: isSelected ? label.color : undefined,
      }}
      onClick={() => handleLabelToggle(label.id)}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      <span>{label.name}</span>
      {!readOnly && isSelected && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLabelToggle(label.id); // Remove from selection
          }}
          className="p-0.5 hover:bg-red-500 hover:bg-opacity-20 rounded text-red-500 cursor-pointer ml-1"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              handleLabelToggle(label.id);
            }
          }}
        >
          <TrashIcon className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  const renderSelectedLabels = () => {
    if (selectedLabels.length === 0) {
      return (
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          {placeholder}
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selectedLabels.map((label) => renderLabelChip(label, true))}
      </div>
    );
  };

  const dropdownOptions = labels.map((label, index) => ({
    value: index, // Use index as number value
    label: (
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            <span>{label.name}</span>
          </div>
          {label.description && (
            <span className="text-xs text-gray-500 ml-5">
              {label.description}
            </span>
          )}
        </div>
        {isCopanyOwner && !readOnly && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              startEditingLabel(label);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer ml-2"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                startEditingLabel(label);
              }
            }}
          >
            <PencilIcon className="w-4 h-4" />
          </div>
        )}
      </div>
    ),
    disabled: readOnly,
  }));

  // Add "Create new label" option
  if (!readOnly) {
    dropdownOptions.push({
      value: labels.length, // Use labels.length as the "create new" value
      label: (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <PlusIcon className="w-4 h-4" />
          <span>Create new label</span>
        </div>
      ),
      disabled: false,
    });
  }

  const handleDropdownSelect = (value: number) => {
    if (value === labels.length) {
      // This is the "create new" option
      startCreatingLabel();
    } else {
      // Toggle the label at the given index
      const label = labels[value];
      if (label) {
        handleLabelToggle(label.id);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
    );
  }

  return (
    <div className="space-y-3">
      <Dropdown
        size="lg"
        trigger={renderSelectedLabels()}
        options={dropdownOptions}
        selectedValue={null} // Multi-select, so no single value
        onSelect={handleDropdownSelect}
        showBackground={showBackground}
        disabled={readOnly}
      />

      {/* Create Label Modal */}
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} size="md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Create New Label
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Label Name
              </label>
              <input
                type="text"
                placeholder="Enter label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="#6B7280"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter description"
                value={newLabelDescription}
                onChange={(e) => setNewLabelDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim() || createLabelMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLabelMutation.isPending ? "Creating..." : "Create Label"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Label Modal */}
      <Modal isOpen={showEditModal} onClose={closeEditModal} size="md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Edit Label
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Label Name
              </label>
              <input
                type="text"
                placeholder="Enter label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="#6B7280"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter description"
                value={newLabelDescription}
                onChange={(e) => setNewLabelDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() =>
                  editingLabel && handleDeleteLabel(editingLabel.id)
                }
                disabled={deleteLabelMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLabelMutation.isPending ? "Deleting..." : "Delete Label"}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateLabel}
                  disabled={
                    !newLabelName.trim() || updateLabelMutation.isPending
                  }
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateLabelMutation.isPending
                    ? "Updating..."
                    : "Update Label"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
