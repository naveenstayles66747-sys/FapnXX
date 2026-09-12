import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';

const dir = process.cwd();

async function run() {
  console.log('Checking status...');
  const statusMatrix = await git.statusMatrix({ fs, dir });
  
  const filesToStage = [];
  const filesToRemove = [];
  
  for (const [filepath, head, workdir, stage] of statusMatrix) {
    if (
      filepath.startsWith('affiliate-webmaster') ||
      filepath.startsWith('node_modules') ||
      filepath.startsWith('.git') ||
      filepath.startsWith('dist') ||
      filepath.endsWith('.log')
    ) {
      continue;
    }
    // modified or new or deleted
    if (workdir !== head || workdir !== stage) {
      if (workdir === 0) {
        filesToRemove.push(filepath);
      } else {
        filesToStage.push(filepath);
      }
    }
  }

  console.log(`Files to stage (${filesToStage.length}):`, filesToStage);
  if (filesToRemove.length > 0) {
    console.log(`Files to remove (${filesToRemove.length}):`, filesToRemove);
  }

  for (const file of filesToStage) {
    await git.add({ fs, dir, filepath: file });
  }

  for (const file of filesToRemove) {
    await git.remove({ fs, dir, filepath: file });
  }

  if (filesToStage.length === 0 && filesToRemove.length === 0) {
    console.log('Nothing to commit. Working tree clean.');
    return;
  }

  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'Naveen',
      email: 'naveenstayles66747@gmail.com',
    },
    message: 'feat: SQLite FTS5 search index (64MB), 1500+ A-Z Pornstars catalog, search bar and live query engine',
  });

  console.log('Committed SHA:', sha);

  console.log('Pushing to origin main...');
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
  });

  console.log('Push result:', pushResult);
}

run().catch(err => {
  console.error('Git operation error:', err);
});
