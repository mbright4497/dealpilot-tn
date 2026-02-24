export const supabaseAdmin = {
  from: (_table: string) => ({
    select: () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null })
  }) as any
};
