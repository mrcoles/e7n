import { readFile as fsReadFile, writeFile as fsWriteFile } from 'fs';
import _glob from 'glob';

export const readFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) =>
    fsReadFile(path, 'utf8', (err, data) => (err ? reject(err) : resolve(data)))
  );

export const readJson = (path: string) => readFile(path).then(JSON.parse);

export const writeFile = (file: string, data: string): Promise<undefined> =>
  new Promise((resolve, reject) =>
    fsWriteFile(file, data, 'utf8', err => (err ? reject(err) : resolve()))
  );

export const glob = (
  pattern: string,
  options: { ignore?: string[] }
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    _glob(pattern, options, (err: Error | null, files: string[]) =>
      err ? reject(err) : resolve(files)
    );
  });
