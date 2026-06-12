module.exports = {
  extends: 'expo',
  // Edge functions run on Deno with its own toolchain — lint them separately.
  ignorePatterns: ['/dist/*', '/node_modules/*', '/supabase/functions/*'],
};
