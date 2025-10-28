"use client";

import { useState, useMemo } from "react";
import { IssueLevel } from "@/types/database.types";
import { useCreateHistoryIssues } from "@/hooks/issues";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import { useContributors } from "@/hooks/contributors";
import Button from "@/components/commons/Button";
import IssueLevelSelector from "@/components/issue/IssueLevelSelector";
import IssueAssigneeSelector from "@/components/issue/IssueAssigneeSelector";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface HistoryIssueRow {
  id: string;
  title: string;
  level: IssueLevel;
  closedAt: string; // ISO date string
  assignee: string | null;
}

interface HistoryIssueCreateModalProps {
  copanyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HistoryIssueCreateModal({
  copanyId,
  isOpen,
  onClose,
  onSuccess,
}: HistoryIssueCreateModalProps) {
  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const { data: contributors = [] } = useContributors(copanyId);

  // Calculate default date (Copany creation date - 1 day)
  const defaultDate = useMemo(() => {
    if (!copany?.created_at) return new Date();
    const copanyDate = new Date(copany.created_at);
    const dayBefore = new Date(copanyDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    return dayBefore;
  }, [copany?.created_at]);

  // Calculate max date (Copany creation date)
  const maxDate = useMemo(() => {
    if (!copany?.created_at) return new Date();
    return new Date(copany.created_at);
  }, [copany?.created_at]);

  const [rows, setRows] = useState<HistoryIssueRow[]>([
    {
      id: "1",
      title: "",
      level: IssueLevel.level_C,
      closedAt: defaultDate.toISOString().split("T")[0],
      assignee: currentUser?.id || null,
    },
  ]);

  const createHistoryIssues = useCreateHistoryIssues(copanyId);

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([
      ...rows,
      {
        id: newId,
        title: "",
        level: IssueLevel.level_C,
        closedAt: defaultDate.toISOString().split("T")[0],
        assignee: currentUser?.id || null,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const updateRow = (
    id: string,
    field: keyof HistoryIssueRow,
    value: string | IssueLevel | null
  ) => {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((row) => row.title.trim() !== "");

    if (validRows.length === 0) {
      return;
    }

    try {
      await createHistoryIssues.mutateAsync(
        validRows.map((row) => ({
          title: row.title.trim(),
          level: row.level,
          closedAt: new Date(row.closedAt).toISOString(),
          assignee: row.assignee,
        }))
      );
      onSuccess();
    } catch (error) {
      console.error("Failed to create history issues:", error);
    }
  };

  const isValid = rows.some((row) => row.title.trim() !== "");

  if (!isOpen) return null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Add History Issues
        </h2>
      </div>
      {/* Desktop Header - Hidden on mobile */}
      <div className="hidden md:grid grid-cols-[1fr_5rem_10rem_10rem_2.25rem] gap-3 items-center mb-3 w-full text-base">
        <div className="">Issue Title</div>
        <div className="">Level</div>
        <div className="">Completion Date</div>
        <div className="">Assignee</div>
        <div />
      </div>

      <div className="space-y-3 mb-6">
        {rows.map((row, _index) => (
          <div key={row.id} className="space-y-3">
            {/* Desktop Layout */}
            <div className="hidden md:grid grid-cols-[1fr_5rem_10rem_10rem_2.25rem] gap-3 items-center w-full">
              {/* Title */}
              <input
                type="text"
                placeholder="Enter issue title"
                value={row.title}
                onChange={(e) => updateRow(row.id, "title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Level */}
              <div className="flex px-3 h-[42px] items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                <IssueLevelSelector
                  issueId={row.id}
                  initialLevel={row.level}
                  showText={false}
                  onLevelChange={(_, newLevel) =>
                    updateRow(row.id, "level", newLevel)
                  }
                  readOnly={false}
                  disableServerUpdate={true}
                />
              </div>

              {/* Completion Date */}
              <input
                type="date"
                value={row.closedAt}
                onChange={(e) => updateRow(row.id, "closedAt", e.target.value)}
                max={maxDate.toISOString().split("T")[0]}
                className="w-full px-3 h-[42px] items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Assignee */}
              <div className="flex px-3 h-[42px] items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                <IssueAssigneeSelector
                  issueId={row.id}
                  initialAssignee={row.assignee}
                  currentUser={currentUser}
                  contributors={contributors}
                  showText={true}
                  disableServerUpdate={true}
                  readOnly={false}
                  copanyId={copanyId}
                  onAssigneeChange={(_, newAssignee) => {
                    updateRow(row.id, "assignee", newAssignee);
                  }}
                />
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                shape="square"
                onClick={() => removeRow(row.id)}
                className="justify-self-end"
                disabled={rows.length <= 1}
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  placeholder="Enter issue title"
                  value={row.title}
                  onChange={(e) => updateRow(row.id, "title", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Level and Completion Date Row */}
              <div className="grid grid-cols-[5rem_1fr] gap-3 w-full">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Level
                  </label>
                  <div className="flex px-3 h-[42px] items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                    <IssueLevelSelector
                      issueId={row.id}
                      initialLevel={row.level}
                      showText={false}
                      onLevelChange={(_, newLevel) =>
                        updateRow(row.id, "level", newLevel)
                      }
                      readOnly={false}
                      disableServerUpdate={true}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    value={row.closedAt}
                    onChange={(e) =>
                      updateRow(row.id, "closedAt", e.target.value)
                    }
                    max={maxDate.toISOString().split("T")[0]}
                    className="w-full px-3 h-[42px] items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignee
                </label>
                <div className="flex flex-row gap-3 items-center w-full">
                  <div className="w-full flex px-3 h-[42px] items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                    <IssueAssigneeSelector
                      issueId={row.id}
                      initialAssignee={row.assignee}
                      currentUser={currentUser}
                      contributors={contributors}
                      showText={true}
                      disableServerUpdate={true}
                      readOnly={false}
                      copanyId={copanyId}
                      onAssigneeChange={(_, newAssignee) => {
                        updateRow(row.id, "assignee", newAssignee);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="square"
                    onClick={() => removeRow(row.id)}
                    className="justify-self-end"
                    disabled={rows.length <= 1}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <Button
          variant="secondary"
          size="md"
          onClick={addRow}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Add Row
        </Button>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={createHistoryIssues.isPending}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || createHistoryIssues.isPending}
          className="flex items-center gap-2"
        >
          {createHistoryIssues.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            "Create"
          )}
        </Button>
      </div>
    </div>
  );
}
