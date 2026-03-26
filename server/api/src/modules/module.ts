import type { FastifyInstance } from 'fastify';

export interface ApiModule {
  name: string;
  register(app: FastifyInstance): void;
}

export function registerApiModules(app: FastifyInstance, modules: readonly ApiModule[]): void {
  const seenModuleNames = new Set<string>();

  for (const module of modules) {
    if (seenModuleNames.has(module.name)) {
      throw new Error(`Duplicate API module registration: ${module.name}`);
    }

    seenModuleNames.add(module.name);
    module.register(app);
  }
}
