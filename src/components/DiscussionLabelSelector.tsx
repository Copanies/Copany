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
import {
  PlusIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Button from "./commons/Button";

interface DiscussionLabelSelectorProps {
  copanyId: string;
  selectedLabelIds: string[];
  onLabelChange?: (selectedLabelIds: string[]) => void;
  showBackground?: boolean;
  readOnly?: boolean;
}

export default function DiscussionLabelSelector({
  copanyId,
  selectedLabelIds,
  onLabelChange,
  showBackground = false,
  readOnly = false,
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

    // Only add label if not already selected (no toggling off by clicking the label)
    if (!selectedLabelIds.includes(labelId)) {
      const newSelectedIds = [...selectedLabelIds, labelId];
      onLabelChange?.(newSelectedIds);
    }
  };

  const handleLabelRemove = (labelId: string) => {
    if (readOnly) return;

    // Find the label to check if it's "Begin idea"
    const labelToRemove = labels.find((label) => label.id === labelId);
    if (labelToRemove && labelToRemove.name === "Begin idea") {
      // Prevent removal of "Begin idea" label
      return;
    }

    const newSelectedIds = selectedLabelIds.filter((id) => id !== labelId);
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
        handleLabelRemove(labelId);
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
    console.log("startCreatingLabel called");
    setNewLabelName("");
    setNewLabelColor("#6B7280");
    setNewLabelDescription("");
    setShowCreateModal(true);
  };

  const renderLabelChip = (label: DiscussionLabel, isSelected: boolean) => {
    const isBeginIdea = label.name === "Begin idea";

    return (
      <div
        key={label.id}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${
          isSelected
            ? "text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        style={{
          backgroundColor: isSelected ? label.color : undefined,
        }}
        onClick={() => handleLabelToggle(label.id)}
      >
        <span>{label.name}</span>
        {!readOnly && isSelected && !isBeginIdea && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleLabelRemove(label.id); // Remove from selection
            }}
            className="p-0.5 hover:bg-white/20 dark:hover:bg-black/20 rounded text-white cursor-pointer ml-1"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                handleLabelRemove(label.id);
              }
            }}
          >
            <XMarkIcon className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  };

  const renderSelectedLabels = () => {
    if (selectedLabels.length === 0) {
      return (
        <span className="text-gray-700 dark:text-gray-300 text-base bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1">
          Add label
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selectedLabels.map((label) => renderLabelChip(label, true))}
      </div>
    );
  };

  const dropdownOptions = labels
    .filter((label) => label.name !== "Begin idea") // Filter out "Begin idea" from dropdown options
    .map((label, index) => ({
      value: index, // Use index as number value
      label: (
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                <span>{label.name}</span>
              </div>
            </div>
            {label.description && (
              <span className="text-xs text-gray-700 dark:text-gray-300">
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
              <PencilSquareIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      ),
      disabled: readOnly,
    }));

  // Get filtered labels for dropdown (excluding "Begin idea")
  const filteredLabels = labels.filter((label) => label.name !== "Begin idea");

  // Add "Create new label" option
  if (isCopanyOwner && !readOnly) {
    dropdownOptions.push({
      value: filteredLabels.length, // Use filteredLabels.length as the "create new" value
      label: (
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md px-0 py-1 cursor-pointer">
          <PlusIcon className="w-4 h-4" />
          <span>Create new label</span>
        </div>
      ),
      disabled: false,
    });
  }

  const handleDropdownSelect = (value: number) => {
    console.log(
      "handleDropdownSelect called with value:",
      value,
      "filteredLabels.length:",
      filteredLabels.length
    );
    if (value === filteredLabels.length) {
      // This is the "create new" option
      console.log("Calling startCreatingLabel");
      startCreatingLabel();
    } else {
      // Toggle the label at the given index from filtered labels
      const label = filteredLabels[value];
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
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} size="sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Create New Label
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Label Name
              </label>
              <input
                type="text"
                placeholder="Enter label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-8 h-9 text-sm rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="#6B7280"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter description"
                value={newLabelDescription}
                onChange={(e) => setNewLabelDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim() || createLabelMutation.isPending}
              >
                {createLabelMutation.isPending ? "Creating..." : "Create Label"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Label Modal */}
      <Modal isOpen={showEditModal} onClose={closeEditModal} size="sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Edit Label
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Label Name
              </label>
              <input
                type="text"
                placeholder="Enter label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-8 h-8 text-sm rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="#6B7280"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter description"
                value={newLabelDescription}
                onChange={(e) => setNewLabelDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="danger"
                onClick={() =>
                  editingLabel && handleDeleteLabel(editingLabel.id)
                }
                disabled={deleteLabelMutation.isPending}
              >
                {deleteLabelMutation.isPending ? "Deleting..." : "Delete Label"}
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpdateLabel}
                  disabled={
                    !newLabelName.trim() || updateLabelMutation.isPending
                  }
                >
                  {updateLabelMutation.isPending
                    ? "Updating..."
                    : "Update Label"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
