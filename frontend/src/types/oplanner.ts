export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskTag {
  id: string;
  label: string;
  color: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  code: string; // e.g. "OOG-12"
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: TaskTag[];
  dueDate: string | null;
  position: number; // Floating point for fractional indexing
  description: string;
  subtasks: TaskSubtask[];
  createdAt: string;
  updatedAt: string;
}

export type DocBlockType = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'paragraph' 
  | 'checklist' 
  | 'code' 
  | 'callout' 
  | 'task_mention';

export interface DocBlock {
  id: string;
  type: DocBlockType;
  content: string;
  checked?: boolean;
  language?: string;
  taskId?: string;
  calloutType?: 'info' | 'warning' | 'tip';
}

export interface OplannerProject {
  id: string;
  version: string;
  name: string;
  description: string;
  updatedAt: string;
  tasks: TaskItem[];
  docs: DocBlock[];
}

export type OplannerView = 'board' | 'table' | 'docs';

export interface OplannerFilterState {
  search: string;
  priority: TaskPriority | 'all';
  status: TaskStatus | 'all';
  tag: string | 'all';
  sortBy: 'position' | 'priority' | 'dueDate' | 'title' | 'status';
  sortOrder: 'asc' | 'desc';
}
