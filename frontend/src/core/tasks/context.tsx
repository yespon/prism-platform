import {
  createContext,
  useCallback,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { Subtask } from "./types";

export interface SubtaskContextValue {
  tasks: Record<string, Subtask>;
  setTasks: Dispatch<SetStateAction<Record<string, Subtask>>>;
}

export const SubtaskContext = createContext<SubtaskContextValue>({
  tasks: {},
  setTasks: () => {
    /* noop */
  },
});

export function SubtasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Record<string, Subtask>>({});
  return (
    <SubtaskContext.Provider value={{ tasks, setTasks }}>
      {children}
    </SubtaskContext.Provider>
  );
}

export function useSubtaskContext() {
  const context = useContext(SubtaskContext);
  if (context === undefined) {
    throw new Error(
      "useSubtaskContext must be used within a SubtaskContext.Provider",
    );
  }
  return context;
}

export function useSubtask(id: string) {
  const { tasks } = useSubtaskContext();
  return tasks[id];
}

export function useUpdateSubtask() {
  const { setTasks } = useSubtaskContext();
  const updateSubtask = useCallback(
    (task: Partial<Subtask> & { id: string }) => {
      setTasks((prevTasks) => {
        const currentTask = prevTasks[task.id];

        // Skip state updates when this patch does not change any field.
        const patchKeys = Object.keys(task) as Array<keyof Subtask | "id">;
        const unchanged =
          currentTask !== undefined &&
          patchKeys.every((key) => {
            if (key === "id") {
              return true;
            }
            return Object.is(currentTask[key], task[key]);
          });

        if (unchanged) {
          return prevTasks;
        }

        const nextTask = { ...currentTask, ...task } as Subtask;
        return {
          ...prevTasks,
          [task.id]: nextTask,
        };
      });
    },
    [setTasks],
  );
  return updateSubtask;
}
