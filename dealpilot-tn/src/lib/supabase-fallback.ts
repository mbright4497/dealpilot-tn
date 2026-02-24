type SupabaseResponse = {
  data: any;
  error: any;
  count?: number | null;
};

type QueryChain = {
  select: (...args: any[]) => QueryChain;
  insert: (...args: any[]) => Promise<SupabaseResponse>;
  update: (...args: any[]) => Promise<SupabaseResponse>;
  delete: (...args: any[]) => Promise<SupabaseResponse>;
  eq: (...args: any[]) => QueryChain;
  order: (...args: any[]) => QueryChain;
  range: (...args: any[]) => Promise<SupabaseResponse>;
  single: () => Promise<SupabaseResponse>;
  maybeSingle: () => Promise<SupabaseResponse>;
  upsert: (...args: any[]) => Promise<SupabaseResponse>;
};

const createQueryStub = (): QueryChain => {
  const query: any = {};
  query.select = () => query;
  query.insert = async () => ({ data: null, error: null });
  query.update = async () => ({ data: null, error: null });
  query.delete = async () => ({ data: null, error: null });
  query.eq = () => query;
  query.order = () => query;
  query.range = async () => ({ data: null, error: null });
  query.single = async () => ({ data: null, error: null });
  query.maybeSingle = async () => ({ data: null, error: null });
  query.upsert = async () => ({ data: null, error: null });
  return query;
};

const createClientStub = () => ({
  from: (_table: string) => createQueryStub()
});

export const supabaseFallback = {
  supabaseClient: createClientStub(),
  supabaseAdmin: createClientStub()
};
