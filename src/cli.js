const program = require('commander');
const version = require('../package.json').version;

const build = require('./build');

program.version(version);

program
  .command('collect [root]')
  .description(
    'collects various strings and updates the locales from a Chrome extension\'s root directory (must contain a "_locales" underneath it), defaults to CWD.'
  )
  // .option(
  //   '--root <path>',
  //   'Root directory, must contain a "_locales" directory (defaults to cwd)'
  // )
  .option('--src-path <path>', 'Path to source directory (defaults to root)')
  .action(_handle(build.collect));

// TODO - make build default command?
// Make collect the default command
var args = process.argv;
if (!args[2] || !program.commands.some(c => c.name() === args[2])) {
  args.splice(2, 0, 'collect');
}

program.parse(process.argv);

function _handle(fn) {
  return function() {
    Promise.resolve()
      .then(() => fn.apply(null, arguments))
      .then(result => console.log('RESULT', result))
      .catch(err => {
        console.error(err);
      });
  };
}
