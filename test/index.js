const assert = require('assert');
const fs = require('fs');
const path = require('path');
const RandomGenParser = require('../index.js');
const ora = require('ora');

const spinner1 = ora('Reading test files').start();
const files = fs
  .readdirSync(path.join(process.cwd(), 'test'))
  .filter((file) => file !== 'index.js')
  .reduce((acc, file) => {
    if (file.startsWith('raw')) {
      if (acc.find((file2) => file2.parsed && file2.parsed.slice(11, -5) === file.slice(3, -4))) {
        acc.find((file2) => file2.parsed && file2.parsed.slice(11, -5) === file.slice(3, -4)).raw = path.join('test', file);
      } else {
        acc.push({ raw: path.join('test', file) });
      }
    } else if (file.startsWith('parsed')) {
      if (acc.find((file2) => file2.raw && file2.raw.slice(8, -4) === file.slice(6, -5))) {
        acc.find((file2) => file2.raw && file2.raw.slice(8, -4) === file.slice(6, -5)).parsed = path.join('test', file);
      } else {
        acc.push({ parsed: path.join('test', file) });
      }
    }
    return acc;
  }, []);
try {
  assert.strictEqual(
    files.every((file) => file.parsed && file.raw),
    true
  );
} catch (e) {
  let indexOfFile;
  if (
    files.find((file, index) => {
      indexOfFile = index;
      return !file.parsed;
    })
  ) {
    spinner1.fail('Unmatched parsed file for ' + (indexOfFile + 1) + 'th raw file');
  } else if (
    files.find((file, index) => {
      indexOfFile = index;
      return !file.raw;
    })
  ) {
    spinner1.fail('Unmatched raw file for ' + (indexOfFile + 1) + 'th parsed file');
  } else if (
    !files.every((file) => {
      let sortedKeys = Object.keys(file).sort();
      return sortedKeys[0] === 'parsed' && sortedKeys[1] === 'raw';
    })
  ) {
    spinner1.fail('Error reading test files');
  }
  console.log();
  throw e;
}
spinner1.succeed('Reading test files');

const spinner2 = ora('Running tests').start();
files.forEach((file, testNum) => {
  try {
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(new RandomGenParser(fs.readFileSync(file.raw, 'utf8')).parsed)),
      JSON.parse(fs.readFileSync(file.parsed, 'utf8'))
    );
  } catch (e) {
    spinner2.fail('Failed test number ' + (testNum + 1));
    console.log();
    throw e;
  }
});
spinner2.succeed('Running tests');
