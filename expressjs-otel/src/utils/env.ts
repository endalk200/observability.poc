export const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
};
