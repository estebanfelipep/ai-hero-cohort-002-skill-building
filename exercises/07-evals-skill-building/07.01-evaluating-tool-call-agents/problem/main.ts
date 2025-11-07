import { runEvalite } from 'evalite/runner';
import { createInMemoryStorage } from 'evalite/in-memory-storage';

runEvalite({
  mode: 'watch-for-file-changes',
  cwd: import.meta.dirname,
  storage: createInMemoryStorage(),
});
