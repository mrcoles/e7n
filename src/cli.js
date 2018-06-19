const chalk = require('chalk');
const program = require('commander');
const version = require('../package.json').version;

const build = require('./build');

program.version(version);

program
  .command('collect [root]')
  .description(
    'collects various strings and updates the locales from a Chrome extension\'s root directory (must contain a "_locales" underneath it), defaults to CWD.'
  )
  .option('--src-path <path>', 'Path to source directory (defaults to root)')
  .action((root, opts) =>
    build
      .collect(root, opts)
      .then(x => {
        console.log(chalk.bold('\nUpdated default locale file...\n'));
        console.log(JSON.stringify(x, null, 2));
      })
      .catch(console.error)
  );

// TODO - make build default command?
// Make collect the default command
var args = process.argv;
if (!args[2] || !program.commands.some(c => c.name() === args[2])) {
  args.splice(2, 0, 'collect');
}

program.parse(process.argv);
