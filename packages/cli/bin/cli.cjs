#!/usr/bin/env node

const { program, InvalidArgumentError } = require('commander');
const { date } = require('@pkg-stats/core');
const pkg = require('../package.json');
const { getDownloadsStats } = require('..');

const bin = Object.keys(pkg.bin)[0] || '';

program.version(pkg.version).description(`${bin} is a tool for npm package stats`);

function parseDate(dateStr) {
  if (!date.isValidDate(dateStr)) {
    throw new InvalidArgumentError('Not a valid Date, must be YYYY-MM-DD format');
  }
  return dateStr;
}

program
  .command('downloads')
  .description('npm package stats: downloads')
  .argument('<packageName...>', 'must have a package name')
  .option('-s, --startDate <date>', 'must have a start date, format: YYYY-MM-DD', parseDate)
  .option('-e, --endDate <date>', 'must have a end date, format: YYYY-MM-DD', parseDate)
  .option('-p, --urlPrefixes [prefix...]', 'must have a format')
  .option('-m, --merge', 'is merge prefix')
  .action(async (packageNames, options) => {
    await getDownloadsStats({ ...options, packageNames });
  });

program.addHelpText(
  'after',
  `\nExample call:
  $ ${bin} downloads `,
);

program.parse(process.argv);
