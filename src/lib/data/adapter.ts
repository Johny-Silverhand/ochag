import type { Snapshot } from "../domain/types";
import { loadOpsSnapshot, loadSampleOpsSnapshot, resetOpsSnapshot, saveOpsSnapshot } from "@/lib/data/ops";

export interface DataAdapter {
  load(): Promise<Snapshot>;
  save(snapshot: Snapshot): Promise<void>;
  reset(): Promise<Snapshot>;
  loadSample(): Promise<Snapshot>;
}

export const dbAdapter: DataAdapter = {
  load: () => loadOpsSnapshot(),
  save: async (snapshot) => {
    await saveOpsSnapshot({ data: snapshot });
  },
  reset: () => resetOpsSnapshot(),
  loadSample: () => loadSampleOpsSnapshot(),
};
