export interface WorkerJob {
  intervalMs: number;
  name: string;
  run(): void;
}

export interface WorkerModule {
  jobs: readonly WorkerJob[];
  name: string;
}

export function collectWorkerJobs(modules: readonly WorkerModule[]): WorkerJob[] {
  const seenModuleNames = new Set<string>();
  const seenJobNames = new Set<string>();
  const jobs: WorkerJob[] = [];

  for (const module of modules) {
    if (seenModuleNames.has(module.name)) {
      throw new Error(`Duplicate worker module registration: ${module.name}`);
    }

    seenModuleNames.add(module.name);

    for (const job of module.jobs) {
      const jobKey = `${module.name}:${job.name}`;

      if (seenJobNames.has(jobKey)) {
        throw new Error(`Duplicate worker job registration: ${jobKey}`);
      }

      seenJobNames.add(jobKey);
      jobs.push(job);
    }
  }

  return jobs;
}
