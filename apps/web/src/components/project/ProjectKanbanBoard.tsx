'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
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
  GripVertical,
  Columns3,
} from 'lucide-react';
import { Task, TaskPriority } from '@synca/types';
import { cn } from '@/lib/utils';

interface ProjectKanbanBoardProps {
  columns: string[];
  tasks: Task[];
  onColumnsChange: (nextColumns: string[]) => Promise<void> | void;
  onRenameColumn?: (oldName: string, newName: string) => Promise<void> | void;
  onMoveTask: (id: string, newColumn: string, newOrder: number) => Promise<void>;
  onEditTask: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskToColumn: (column?: string) => void;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
  canManageTask?: (task: Task) => boolean;
}

const COL_PREFIX = 'col::';
const DROP_PREFIX = 'drop::';
const isColId = (id: string) => id.startsWith(COL_PREFIX);
const isDropId = (id: string) => id.startsWith(DROP_PREFIX);
const toColId = (name: string) => `${COL_PREFIX}${name}`;
const toDropId = (name: string) => `${DROP_PREFIX}${name}`;
const fromColId = (id: string) => id.slice(COL_PREFIX.length);
const fromDropId = (id: string) => id.slice(DROP_PREFIX.length);

const PRIORITY_STYLES: Record<TaskPriority, { label: string; className: string }> = {
  High: {
    label: 'High',
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

function getStatusPillStyle(status: string) {
  switch (status) {
    case 'Done':
      return {
        pill: 'bg-[#e6f7f1] dark:bg-emerald-500/15 text-[#006c52] dark:text-emerald-300',
        dot: 'bg-[#006c52] dark:bg-emerald-400',
      };
    case 'In Progress':
      return {
        pill: 'bg-[#eef6ff] dark:bg-sky-500/15 text-sky-700 dark:text-sky-300',
        dot: 'bg-sky-500',
      };
    default:
      return {
        pill: 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-300',
        dot: 'bg-[#6b7280]',
      };
  }
}

function SortableTaskCard({
  task,
  members,
  canManage,
  onEdit,
  onSelect,
  onDelete,
}: {
  task: Task;
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
  } = useSortable({
    id: task._id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskPct =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const isDone = task.status === 'Done';
  const isInProgress = task.status === 'In Progress';
  const priorityInfo = PRIORITY_STYLES[task.priority || 'Medium'];
  const statusStyle = getStatusPillStyle(task.status || 'To Do');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group p-4 rounded-[8px] bg-white dark:bg-[#191c22] border border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#006c52]/40 dark:hover:border-[#79deba]/50 transition-all cursor-grab active:cursor-grabbing touch-none space-y-3 select-none relative overflow-hidden',
        isInProgress && 'border-t-2 border-t-[#66deb4] dark:border-t-[#66deb4]',
        isDragging && 'ring-2 ring-[#66deb4] shadow-xl'
      )}
    >
      {/* Top Row: Independent Status + Priority Pills & Hover Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[10.5px] font-medium',
              statusStyle.pill
            )}
          >
            {isDone ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <span className={cn('size-1.5 rounded-full', statusStyle.dot)} />
            )}
            <span>{task.status || 'To Do'}</span>
          </span>

          <span
            className={cn(
              'px-2 py-0.5 rounded-[10px] text-[10.5px] font-medium tracking-[0.2px]',
              priorityInfo.className
            )}
          >
            {priorityInfo.label}
          </span>
        </div>

        {canManage && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
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
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete task "${task.title}"?`)) {
                  onDelete();
                }
              }}
              className="p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] dark:hover:text-rose-400 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] transition-colors"
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
        <h4
          className={cn(
            'text-[14px] font-semibold leading-[20px] transition-colors line-clamp-2',
            isDone
              ? 'text-[#3e4944]/70 dark:text-zinc-400 line-through'
              : 'text-[#191c1d] dark:text-zinc-100 group-hover:text-[#006c52] dark:group-hover:text-[#79deba]'
          )}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[12px] leading-[17px] text-[#3e4944] dark:text-zinc-400 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Thin mint progress bar when subtasks exist */}
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

function SortableKanbanColumn({
  title,
  tasks,
  members,
  canManageTask,
  onEditTask,
  onSelectTask,
  onDeleteTask,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
}: {
  title: string;
  tasks: Task[];
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
  canManageTask?: (task: Task) => boolean;
  onEditTask: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  onRenameColumn?: (newName: string) => void;
  onDeleteColumn?: () => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  // Outer sortable strictly for horizontal column reordering
  const {
    attributes,
    listeners,
    setNodeRef: setColNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: toColId(title),
    data: { type: 'column', column: title },
  });

  // Dedicated inner droppable strictly for receiving dragged tasks
  const { setNodeRef: setDropNodeRef, isOver: isTaskOver } = useDroppable({
    id: toDropId(title),
    data: { type: 'column-drop', column: title },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const taskIds = tasks.map((t) => t._id);

  const commitRename = () => {
    const trimmed = titleDraft.trim();
    setIsEditingTitle(false);
    if (trimmed && trimmed !== title) {
      onRenameColumn?.(trimmed);
    } else {
      setTitleDraft(title);
    }
  };

  return (
    <div
      ref={setColNodeRef}
      style={style}
      className={cn(
        'group/col flex-1 min-w-[290px] max-w-[350px] max-h-full rounded-[10px] bg-[#fafafa] dark:bg-[#15171b] border flex flex-col transition-colors',
        isTaskOver
          ? 'border-[#006c52] dark:border-[#66deb4] ring-2 ring-[#66deb4]/25'
          : 'border-[#e5e7eb] dark:border-white/[0.08]',
        isDragging && 'ring-2 ring-[#66deb4] shadow-2xl'
      )}
    >
      {/* Column Header with Drag Handle + Click-to-Rename Title */}
      <div className="px-3.5 py-3.5 border-b border-[#e5e7eb] dark:border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            title="Drag to reorder column"
            className="p-0.5 rounded text-[#3e4944]/60 dark:text-zinc-500 hover:text-[#191c1d] dark:hover:text-white cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="size-2 rounded-full bg-[#006c52] dark:bg-[#66deb4] shrink-0" />

          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === 'Escape') {
                  setTitleDraft(title);
                  setIsEditingTitle(false);
                }
              }}
              className="flex-1 min-w-0 h-[26px] px-2 rounded-[6px] bg-white dark:bg-[#1e2127] border border-[#006c52] dark:border-[#66deb4] text-[13.5px] font-semibold text-[#191c1d] dark:text-white focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(title);
                setIsEditingTitle(true);
              }}
              title="Click to rename column"
              className="text-left text-[13.5px] font-semibold text-[#191c1d] dark:text-zinc-100 hover:text-[#006c52] dark:hover:text-[#79deba] truncate cursor-text transition-colors"
            >
              {title}
            </button>
          )}

          <span className="px-2 py-0.5 rounded-[6px] bg-[#e7e8e9] dark:bg-white/[0.08] text-[11px] font-medium text-[#3e4944] dark:text-zinc-400 shrink-0">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {tasks.length === 0 && onDeleteColumn && (
            <button
              type="button"
              onClick={onDeleteColumn}
              title="Remove empty column"
              className="opacity-0 group-hover/col:opacity-100 p-1 rounded-md text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] dark:hover:text-rose-400 hover:bg-[#ffdad6]/50 dark:hover:bg-rose-500/15 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onAddTask}
            title={`Add task to ${title}`}
            className="p-1 rounded-md text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white hover:bg-[#e7e8e9]/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dedicated Task Dropzone + Sortable Task List */}
      <div
        ref={setDropNodeRef}
        className="flex-1 min-h-[160px] p-3 space-y-2.5 overflow-y-auto scrollbar-thin"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
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
        </SortableContext>
      </div>

      {/* Bottom Add Task Bar */}
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
  columns,
  tasks,
  onColumnsChange,
  onRenameColumn,
  onMoveTask,
  onEditTask,
  onSelectTask,
  onDeleteTask,
  onAddTaskToColumn,
  members,
  canManageTask,
}: ProjectKanbanBoardProps) {
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumnName, setActiveColumnName] = useState<string | null>(null);

  const columnIds = useMemo(() => columns.map(toColId), [columns]);

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

  // Separate collision detection for column drags vs task drags so nested SortableContexts never interfere
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const activeType = args.active.data.current?.type;

    if (activeType === 'column') {
      const columnContainers = args.droppableContainers.filter(
        (c) => c.data.current?.type === 'column'
      );
      return closestCorners({ ...args, droppableContainers: columnContainers });
    }

    // Dragging a task: only match other tasks or column task dropzones (never outer column sortable)
    const taskAndDropContainers = args.droppableContainers.filter((c) => {
      const t = c.data.current?.type;
      return t === 'task' || t === 'column-drop';
    });

    const pointerHits = pointerWithin({
      ...args,
      droppableContainers: taskAndDropContainers,
    });

    if (pointerHits.length > 0) {
      // Prefer a direct task hit if pointer is over a task card inside a column dropzone
      const taskHit = pointerHits.find(
        (h) => !isDropId(String(h.id)) && !isColId(String(h.id))
      );
      return taskHit ? [taskHit] : [pointerHits[0]];
    }

    return closestCorners({
      ...args,
      droppableContainers: taskAndDropContainers,
    });
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const activeType = event.active.data.current?.type;
    const activeId = String(event.active.id);
    if (activeType === 'column' || isColId(activeId)) {
      setActiveColumnName(fromColId(activeId));
      setActiveTask(null);
    } else {
      const task = tasks.find((t) => t._id === activeId);
      setActiveTask(task || null);
      setActiveColumnName(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumnName(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Case 1: Reordering columns by dragging column grip handles
    if (active.data.current?.type === 'column' || isColId(activeId)) {
      let targetColName: string | null = null;
      if (isColId(overId)) {
        targetColName = fromColId(overId);
      } else if (isDropId(overId)) {
        targetColName = fromDropId(overId);
      } else {
        const overTask = tasks.find((t) => t._id === overId);
        if (overTask) targetColName = overTask.column || 'Default Column';
      }

      if (!targetColName) return;
      const oldIndex = columns.indexOf(fromColId(activeId));
      const newIndex = columns.indexOf(targetColName);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columns, oldIndex, newIndex);
        await onColumnsChange(reordered);
      }
      return;
    }

    // Case 2: Moving a task between columns or reordering within a column (status is NOT changed)
    const draggedTask = tasks.find((t) => t._id === activeId);
    if (!draggedTask) return;

    const currentColumn = draggedTask.column || 'Default Column';
    let targetColumn = currentColumn;
    let targetOrder = draggedTask.order || 0;

    if (isDropId(overId)) {
      targetColumn = fromDropId(overId);
      const columnTasks = tasks.filter(
        (t) =>
          (t.column || 'Default Column') === targetColumn && t._id !== activeId
      );
      targetOrder = columnTasks.length;
    } else if (isColId(overId)) {
      targetColumn = fromColId(overId);
      const columnTasks = tasks.filter(
        (t) =>
          (t.column || 'Default Column') === targetColumn && t._id !== activeId
      );
      targetOrder = columnTasks.length;
    } else {
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask) {
        targetColumn = overTask.column || 'Default Column';
        targetOrder = overTask.order || 0;
      }
    }

    if (
      currentColumn !== targetColumn ||
      (draggedTask.order || 0) !== targetOrder
    ) {
      await onMoveTask(activeId, targetColumn, targetOrder);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    if (!columns.includes(trimmed)) {
      await onColumnsChange([...columns, trimmed]);
    }
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleDeleteColumn = async (colName: string) => {
    await onColumnsChange(columns.filter((c) => c !== colName));
  };

  // Empty board state when no columns exist yet
  if (columns.length === 0 && !isAddingColumn) {
    return (
      <div className="rounded-[12px] border border-dashed border-[#bdc9c2] dark:border-white/[0.12] bg-[#fafafa] dark:bg-[#15171b] py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
        <div className="size-12 rounded-[14px] bg-[#e6f7f1] dark:bg-[#006c52]/20 border border-[#79deba]/50 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
          <Columns3 className="w-6 h-6" />
        </div>
        <h3 className="font-['Funnel_Display',sans-serif] text-[20px] font-medium text-[#191c1d] dark:text-white">
          Your board has no columns yet
        </h3>
        <p className="text-[13.5px] text-[#3e4944] dark:text-zinc-400 max-w-md">
          Create your own custom columns (like Backlog, Design, Backend) — or add a task directly and we&apos;ll automatically create a <strong>Default Column</strong> for you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsAddingColumn(true)}
            className="h-[40px] px-4 rounded-[8px] bg-[#66deb4] hover:bg-[#52d1a4] text-[#111316] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add a new column</span>
          </button>
          <button
            type="button"
            onClick={() => onAddTaskToColumn(undefined)}
            className="h-[40px] px-4 rounded-[8px] bg-[#191c1d] dark:bg-white text-white dark:text-[#191c1d] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Task</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 flex-1 min-h-0 h-full overflow-x-auto overflow-y-hidden pb-2 pt-1 items-start scrollbar-thin">
          {columns.map((col) => {
            const columnTasks = tasks
              .filter((t) => (t.column || 'Default Column') === col)
              .sort((a, b) => (a.order || 0) - (b.order || 0));

            return (
              <SortableKanbanColumn
                key={col}
                title={col}
                tasks={columnTasks}
                members={members}
                canManageTask={canManageTask}
                onEditTask={onEditTask}
                onSelectTask={onSelectTask}
                onDeleteTask={onDeleteTask}
                onAddTask={() => onAddTaskToColumn(col)}
                onRenameColumn={
                  onRenameColumn
                    ? (newName) => onRenameColumn(col, newName)
                    : undefined
                }
                onDeleteColumn={() => handleDeleteColumn(col)}
              />
            );
          })}

          {/* Add a new column */}
          <div className="shrink-0 w-[260px]">
            {isAddingColumn ? (
              <form
                onSubmit={handleAddColumn}
                className="p-3.5 rounded-[10px] bg-white dark:bg-[#15171b] border border-[#79deba] space-y-2.5"
              >
                <input
                  type="text"
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name (e.g. Design, Backend)"
                  className="w-full h-[36px] px-3 rounded-[6px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4]"
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
                    className="px-3.5 py-1.5 rounded-[6px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Add Column
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
      </SortableContext>

      <DragOverlay>
        {activeTask ? (
          <div className="p-4 rounded-[8px] bg-white dark:bg-[#191c22] border-2 border-[#66deb4] shadow-2xl opacity-95 w-[290px]">
            <h4 className="text-[14px] font-semibold text-[#191c1d] dark:text-zinc-100">
              {activeTask.title}
            </h4>
          </div>
        ) : activeColumnName ? (
          <div className="px-4 py-3 rounded-[10px] bg-white dark:bg-[#15171b] border-2 border-[#66deb4] shadow-2xl w-[280px] flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-[#006c52] dark:text-[#66deb4]" />
            <span className="text-[14px] font-semibold text-[#191c1d] dark:text-white">
              {activeColumnName}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
