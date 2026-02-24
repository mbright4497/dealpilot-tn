export const supabaseAdmin: { from: (table: string) => any } = {
  from: (_table: string) => {
    // Runtime will be mocked in tests. Provide a permissive any-typed fallback to satisfy TS.
    return {
      select: () => ({ data: null, error: null }),
      upsert: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null })
    } as any;
  }
};
