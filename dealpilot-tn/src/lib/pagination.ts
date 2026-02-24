export const clampLimit = (value?: number) => {
  if (!value || Number.isNaN(value)) return 20;
  return Math.min(Math.max(Math.floor(value), 1), 100);
};

export const clampPage = (value?: number) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.max(Math.floor(value), 1);
};

export const getRangeBounds = (limit: number, page: number) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  return { start, end };
};
