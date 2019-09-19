import chalk from 'chalk';
import program from 'commander';

import { collect } from './build';

const version = require('../package.json').version;

program.version(version);

// TODO - option to specify plugins from this list
// https://babeljs.io/docs/en/next/babel-parser.html#plugins

program
  .command('collect [root]')
  .description(
    'collects various strings and updates the locales from a Chrome extension\'s root directory (must contain a "_locales" underneath it), defaults to CWD.'
  )
  .option('--src-path <path>', 'Path to source directory (defaults to [root])')
  .option(
    '--manifest-path <path>',
    'Path to the manifest file, used to find the default locale path (defaults to [root]/manifest.json)'
  )
  .option(
    '--default-locale-path <path>',
    'Path to source directory (defaults to [root]/_locales/[defaultLocale]/messages.json)'
  )
  .option('--print', 'Print the result to stdout instead of updating the file')
  .option('--verbose', 'Verbose output')
  .action((root, opts) => {
    return collect(root, opts)
      .then(x => {
        if (opts.verbose) {
          console.log(chalk.bold('\nUpdated default locale file...\n'));
          console.log(JSON.stringify(x, null, 2));
        }
      })
      .catch(console.error);
  });

// Make collect the default command
const args = process.argv;
//@ts-ignore
if (!args[2] || !program.commands.some(c => c.name() === args[2])) {
  //@ts-ignore
  args.splice(2, 0, 'collect');
}

program.parse(args);
