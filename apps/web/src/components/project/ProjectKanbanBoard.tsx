'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Calendar,
  CheckSquare,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { Task, TaskPriority } from '@synca/types';
import { cn } from '@/lib/utils';

interface ProjectKanbanBoardProps {
  tasks: Task[];
  onMoveTask: (id: string, newStatus: string, newOrder: number) => Promise<void>;
  onEditTask: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskToColumn: (status: string) => void;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
  canManageTask?: (task: Task) => boolean;
}

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

const PRIORITY_STYLES: Record<TaskPriority, { label: string; className: string }> = {
  High: {
    label: 'High Priority',
    className:
      'bg-[#ffdad6] dark:bg-rose-500/15 text-[#93000a] dark:text-rose-300',
  },
  Medium: {
    label: 'Medium',
    className:
      'bg-[#ddec6b] dark:bg-[#d8f870]/20 text-[#606a00] dark:text-[#d8f870]',
  },
  Low: {
    label: 'Low',
    className:
      'bg-[#e6f7f1] dark:bg-emerald-500/15 text-[#006c52] dark:text-emerald-300',
  },
};

function SortableTaskCard({
  task,
  columnTitle,
  members,
  canManage,
  onEdit,
  onSelect,
  onDelete,
}: {
  task: Task;
  columnTitle: string;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
  canManage: boolean;
  onEdit: () => void;
  onSelect?: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskPct =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const isDone = columnTitle === 'Done' || task.status === 'Done';
  const isInProgress = columnTitle === 'In Progress' || task.status === 'In Progress';
  const priorityInfo = PRIORITY_STYLES[task.priority || 'Medium'];

  // Match Figma 93:3149: Done cards are clean & compact
  if (isDone) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => (onSelect ? onSelect() : onEdit())}
        className={cn(
          'group p-3.5 rounded-[8px] bg-white dark:bg-[#191c22] border border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#79deba] transition-all cursor-grab active:cursor-grabbing select-none',
          isDragging && 'ring-2 ring-[#79deba] shadow-lg'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[13.5px] font-medium text-[#191c1d] dark:text-zinc-200 line-clamp-2">
            {task.title}
          </h4>
          {canManage && (
            <div
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded text-[#3e4944] hover:text-[#191c1d] dark:text-zinc-400 dark:hover:text-white hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08]"
                title="Edit task"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete task "${task.title}"?`)) {
                    onDelete();
                  }
                }}
                className="p-1 rounded text-[#3e4944] hover:text-[#ba1a1a] dark:text-zinc-400 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08]"
                title="Delete task"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#3e4944] dark:text-zinc-400">
          <span className="inline-flex items-center gap-1 text-[#006c52] dark:text-[#79deba]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 2).map((uid, idx) => {
                const member = members?.find((m) => m.userId === uid);
                const label = member?.name || member?.email || uid;
                return (
                  <div
                    key={idx}
                    title={label}
                    className="size-5 rounded-full ring-2 ring-white dark:ring-[#191c22] bg-[#e7e8e9] dark:bg-zinc-700 text-[9px] font-semibold text-[#191c1d] dark:text-zinc-100 flex items-center justify-center overflow-hidden"
                  >
                    {member?.imageUrl ? (
                      <img src={member.imageUrl} alt={label} className="size-full object-cover" />
                    ) : (
                      label.slice(0, 2).toUpperCase()
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group p-4 rounded-[8px] bg-white dark:bg-[#191c22] border border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#006c52]/40 dark:hover:border-[#79deba]/50 transition-all cursor-grab active:cursor-grabbing space-y-3 select-none relative overflow-hidden',
        isInProgress && 'border-t-2 border-t-[#66deb4] dark:border-t-[#66deb4]',
        isDragging && 'ring-2 ring-[#66deb4] shadow-xl'
      )}
    >
      {/* Top Row: Priority Pill & Hover Actions */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'px-2.5 py-0.5 rounded-[10px] text-[11px] font-medium tracking-[0.2px]',
            priorityInfo.className
          )}
        >
          {priorityInfo.label}
        </span>

        {canManage && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] transition-colors"
              title="Edit task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete task "${task.title}"?`)) {
                  onDelete();
                }
              }}
              className="p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Title & Optional Description */}
      <div
        onClick={() => (onSelect ? onSelect() : onEdit())}
        className="cursor-pointer space-y-1"
      >
        <h4 className="text-[14px] font-semibold leading-[20px] text-[#191c1d] dark:text-zinc-100 group-hover:text-[#006c52] dark:group-hover:text-[#79deba] transition-colors line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[12px] leading-[17px] text-[#3e4944] dark:text-zinc-400 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Thin mint progress bar when subtasks exist (Figma 93:3149) */}
      {totalSubtasks > 0 && (
        <div className="h-[4px] w-full rounded-full bg-[#e1e3e4] dark:bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#66deb4] transition-all duration-300"
            style={{ width: `${subtaskPct}%` }}
          />
        </div>
      )}

      {/* Footer Meta Row */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-[#3e4944] dark:text-zinc-400">
        <div className="flex items-center gap-2.5">
          {totalSubtasks > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-[#006c52] dark:text-[#79deba]">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
          )}
          {task.dueDate && (
            <span className="inline-flex items-center gap-1 text-[#3e4944] dark:text-zinc-400">
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
          )}
        </div>

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((uid, idx) => {
              const member = members?.find((m) => m.userId === uid);
              const label = member?.name || member?.email || uid;
              const initials = member?.name
                ? member.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : label.slice(0, 2).toUpperCase();
              return (
                <div
                  key={idx}
                  title={member?.name || member?.email || 'Member'}
                  className="size-6 rounded-full ring-2 ring-white dark:ring-[#191c22] bg-[#e7e8e9] dark:bg-zinc-700 text-[10px] font-semibold text-[#191c1d] dark:text-zinc-100 flex items-center justify-center shrink-0 overflow-hidden"
                >
                  {member?.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={label}
                      className="size-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  tasks,
  members,
  canManageTask,
  onEditTask,
  onSelectTask,
  onDeleteTask,
  onAddTask,
}: {
  title: string;
  tasks: Task[];
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
  canManageTask?: (task: Task) => boolean;
  onEditTask: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: title });
  const taskIds = tasks.map((t) => t._id);

  const getColumnDotColor = (col: string) => {
    switch (col) {
      case 'To Do':
        return 'bg-[#6b7280]';
      case 'In Progress':
        return 'bg-[#006c52] dark:bg-[#66deb4]';
      case 'Done':
        return 'bg-[#79deba]';
      default:
        return 'bg-[#ddec6b]';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[290px] max-w-[350px] rounded-[10px] bg-[#fafafa] dark:bg-[#15171b] border flex flex-col transition-colors',
        isOver
          ? 'border-[#006c52] dark:border-[#66deb4] ring-2 ring-[#66deb4]/25'
          : 'border-[#e5e7eb] dark:border-white/[0.08]'
      )}
    >
      {/* Column Header */}
      <div className="px-4 py-3.5 border-b border-[#e5e7eb] dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', getColumnDotColor(title))} />
          <h3 className="text-[13.5px] font-semibold text-[#191c1d] dark:text-zinc-100">
            {title}
          </h3>
          <span className="px-2 py-0.5 rounded-[6px] bg-[#e7e8e9] dark:bg-white/[0.08] text-[11px] font-medium text-[#3e4944] dark:text-zinc-400">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onAddTask}
          title={`Add task to ${title}`}
          className="p-1 rounded-md text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white hover:bg-[#e7e8e9]/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task Cards Sortable Container */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-330px)] min-h-[260px] scrollbar-thin">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
              columnTitle={title}
              members={members}
              canManage={canManageTask ? canManageTask(task) : true}
              onEdit={() => onEditTask(task)}
              onSelect={() => onSelectTask?.(task)}
              onDelete={() => onDeleteTask(task._id)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="py-10 text-center rounded-[8px] border border-dashed border-[#bdc9c2] dark:border-white/[0.08] flex flex-col items-center justify-center gap-1.5">
              <p className="text-[12px] text-[#3e4944] dark:text-zinc-500">
                No tasks in {title}
              </p>
              <button
                type="button"
                onClick={onAddTask}
                className="text-[12px] font-medium text-[#006c52] dark:text-[#79deba] hover:underline cursor-pointer"
              >
                + Add task
              </button>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Bottom Add Task Bar (Figma 93:3149) */}
      <button
        type="button"
        onClick={onAddTask}
        className="w-full py-2.5 px-4 border-t border-[#e5e7eb] dark:border-white/[0.06] text-[12.5px] font-medium text-[#3e4944] dark:text-zinc-400 hover:text-[#006c52] dark:hover:text-[#79deba] hover:bg-white dark:hover:bg-white/[0.03] rounded-b-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Task</span>
      </button>
    </div>
  );
}

export function ProjectKanbanBoard({
  tasks,
  onMoveTask,
  onEditTask,
  onSelectTask,
  onDeleteTask,
  onAddTaskToColumn,
  members,
  canManageTask,
}: ProjectKanbanBoardProps) {
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Combine default columns + any task statuses already in DB + user-added columns
  const columns = useMemo(() => {
    const set = new Set<string>(DEFAULT_COLUMNS);
    tasks.forEach((t) => {
      if (t.status) set.add(t.status);
    });
    customColumns.forEach((c) => set.add(c));
    return Array.from(set);
  }, [tasks, customColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const draggedTask = tasks.find((t) => t._id === activeId);
    if (!draggedTask) return;

    let targetStatus = draggedTask.status;
    let targetOrder = draggedTask.order || 0;

    if (columns.includes(overId)) {
      targetStatus = overId;
      const columnTasks = tasks.filter(
        (t) => t.status === targetStatus && t._id !== activeId
      );
      targetOrder = columnTasks.length;
    } else {
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        targetOrder = overTask.order || 0;
      }
    }

    if (draggedTask.status !== targetStatus || draggedTask.order !== targetOrder) {
      await onMoveTask(activeId, targetStatus, targetOrder);
    }
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    if (!columns.includes(trimmed)) {
      setCustomColumns((prev) => [...prev, trimmed]);
    }
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start scrollbar-thin">
        {columns.map((col) => {
          const columnTasks = tasks
            .filter((t) => t.status === col)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          return (
            <KanbanColumn
              key={col}
              title={col}
              tasks={columnTasks}
              members={members}
              canManageTask={canManageTask}
              onEditTask={onEditTask}
              onSelectTask={onSelectTask}
              onDeleteTask={onDeleteTask}
              onAddTask={() => onAddTaskToColumn(col)}
            />
          );
        })}

        {/* Add a new column (Figma 93:3149 mint pill button) */}
        <div className="shrink-0 w-[250px]">
          {isAddingColumn ? (
            <form
              onSubmit={handleAddColumn}
              className="p-3 rounded-[10px] bg-white dark:bg-[#15171b] border border-[#79deba] space-y-2.5"
            >
              <input
                type="text"
                autoFocus
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name (e.g. In Review)"
                className="w-full h-[36px] px-3 rounded-[6px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnName('');
                  }}
                  className="p-1.5 rounded text-[#3e4944] hover:bg-[#f3f3f3] dark:text-zinc-400 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={!newColumnName.trim()}
                  className="px-3 py-1.5 rounded-[6px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="w-full h-[46px] px-4 rounded-[10px] bg-[#66deb4] hover:bg-[#52d1a4] text-[#111316] text-[13.5px] font-medium flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Add a new column</span>
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="p-4 rounded-[8px] bg-white dark:bg-[#191c22] border-2 border-[#66deb4] shadow-2xl opacity-95 w-[290px]">
            <h4 className="text-[14px] font-semibold text-[#191c1d] dark:text-zinc-100">
              {activeTask.title}
            </h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
