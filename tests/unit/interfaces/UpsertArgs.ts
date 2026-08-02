export interface UpsertArgs {
  where: { id: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}
