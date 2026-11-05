import { readFile as fsReadFile, writeFile as fsWriteFile } from 'fs';
import { glob as _glob } from 'glob';

export const readFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) =>
    fsReadFile(path, 'utf8', (err, data) => (err ? reject(err) : resolve(data)))
  );

export const readJson = (path: string) => readFile(path).then(JSON.parse);

export const writeFile = (file: string, data: string): Promise<void> =>
  new Promise((resolve, reject) =>
    fsWriteFile(file, data, 'utf8', err => (err ? reject(err) : resolve()))
  );

// glob v9+ returns files in no particular order, but v7 sorted them
export const glob = (
  pattern: string,
  options: { ignore?: string[] }
): Promise<string[]> => _glob(pattern, options).then(files => files.sort());
