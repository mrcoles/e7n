const program = require('commander');
const version = require('../package.json').version;

const build = require('./build');

program.version(version);

program
  .command('collect')
  .description('collects various strings and updates the locales')
  .option(
    '--root <path>',
    'Root directory, must contain a "_locales" directory (defaults to cwd)'
  )
  .option('--src-path <path>', 'Path to source directory (defaults to root)')
  .action(_handle(build.collect));

// TODO - make build default command?

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
