'use client';

import { useContext } from 'react';
import { WorkspaceContext, WorkspaceContextType } from '@/context/WorkspaceContext';

/**
 * Access the active workspace state and workspace actions across the application.
 * Must be used within a WorkspaceProvider.
 */
export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a <WorkspaceProvider>');
  }
  return context;
}
