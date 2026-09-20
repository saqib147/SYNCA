'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Edit2,
  Clock,
} from 'lucide-react';
import { Task, TaskPriority } from '@synca/types';
import { cn } from '@/lib/utils';

interface ProjectKanbanBoardProps {
  tasks: Task[];
  onMoveTask: (id: string, newStatus: string, newOrder: number) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskToColumn: (status: string) => void;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
}

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

// Task Card
function SortableTaskCard({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: () => void;
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

  const priorityColors = {
    High: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    Medium: 'bg-[#d8f870]/15 text-zinc-900 dark:text-[#d8f870] border-[#d8f870]/30',
    Low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group p-4 rounded-2xl bg-white dark:bg-[#141822] border border-zinc-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-white/[0.18] transition-all cursor-grab active:cursor-grabbing space-y-3 select-none relative overflow-hidden',
        isDragging && 'ring-2 ring-[#d8f870] shadow-xl'
      )}
    >
      {/* Top row: Priority & Actions */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
            priorityColors[task.priority || 'Medium']
          )}
        >
          {task.priority || 'Medium'}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title & Desc */}
      <div onClick={onEdit} className="cursor-pointer space-y-1">
        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#2ecc8f] transition-colors line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Bottom meta row */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/[0.06] text-[11px] text-zinc-400 dark:text-zinc-500">
        {/* Checklist counter */}
        {totalSubtasks > 0 ? (
          <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
            <CheckSquare className="w-3.5 h-3.5 text-[#2ecc8f]" />
            <span>
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Due Date & Assignees */}
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <div className="flex items-center gap-1 font-medium text-[10px]">
              <Calendar className="w-3 h-3 text-zinc-400" />
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1.5 overflow-hidden">
              {task.assignees.slice(0, 3).map((uid, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-zinc-900 bg-zinc-200 dark:bg-zinc-700 text-[9px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0"
                >
                  {uid.slice(-2).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Kanban Column
function KanbanColumn({
  title,
  tasks,
  onEditTask,
  onDeleteTask,
  onAddTask,
}: {
  title: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
}) {
  const taskIds = tasks.map((t) => t._id);

  const getColumnDotColor = (col: string) => {
    switch (col) {
      case 'To Do':
        return 'bg-amber-400';
      case 'In Progress':
        return 'bg-[#d8f870]';
      case 'Done':
        return 'bg-emerald-400';
      default:
        return 'bg-indigo-400';
    }
  };

  return (
    <div className="flex-1 min-w-[280px] sm:min-w-[320px] max-w-[380px] bg-zinc-100/70 dark:bg-[#10141e]/50 dark:backdrop-blur-xl rounded-3xl p-4 border border-zinc-200/80 dark:border-white/[0.08] shadow-sm flex flex-col space-y-3.5 transition-colors">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', getColumnDotColor(title))} />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            {title}
          </h3>
          <span className="px-2 py-0.2 rounded-full bg-zinc-200 dark:bg-white/[0.08] text-[10px] font-bold text-zinc-600 dark:text-zinc-400 font-mono">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onAddTask}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task Cards Sortable Container */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] pr-1 scrollbar-none min-h-[140px]">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task._id)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed border-zinc-200 dark:border-white/[0.06] rounded-2xl flex flex-col items-center justify-center space-y-1">
              <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">No tasks in this column</p>
              <button
                type="button"
                onClick={onAddTask}
                className="text-xs font-semibold text-[#2ecc8f] hover:underline"
              >
                + Add task
              </button>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Quick Add Button */}
      <button
        type="button"
        onClick={onAddTask}
        className="w-full py-2 px-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.1] hover:border-[#2ecc8f] dark:hover:border-[#2ecc8f] text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center gap-1.5 transition-colors"
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
  onDeleteTask,
  onAddTaskToColumn,
}: ProjectKanbanBoardProps) {
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Set up sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // allows clicking without accidental drag
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

    // Check if dropped over a column directly or over another task
    let targetStatus = draggedTask.status;
    let targetOrder = draggedTask.order || 0;

    if (columns.includes(overId)) {
      targetStatus = overId;
      const columnTasks = tasks.filter((t) => t.status === targetStatus && t._id !== activeId);
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start scrollbar-none">
        {columns.map((col) => {
          const columnTasks = tasks
            .filter((t) => t.status === col)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          return (
            <KanbanColumn
              key={col}
              title={col}
              tasks={columnTasks}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onAddTask={() => onAddTaskToColumn(col)}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#141822] border-2 border-[#d8f870] shadow-2xl opacity-90 w-[300px]">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {activeTask.title}
            </h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
