# `randomgen-parser`

Parses [RandomGen](http://orteil.dashnet.org/randomgen/).

## Installation

```sh
npm install randomgen-parser
```

## API

### Importing

```js
const RandomGenParser = require('randomgen-parser');
```

### Using

The `randomgen-parser` module exports a class. The constructor accepts two arguments. The first one is the string to parse. The second one is optional and is the string to parse. The results of the parsing will be stored at the `parsed` property of the object. Here are some more functions:

```js
const RandomGenParser = require('randomgen-parser');

new RandomGenParser('').parsed;
// -> [ { type: "newline", raw: "", stringValue: "", interpretedValue: "", pos: { line: 1, column: 0 }, afterLinebreak: null } ]

let parser = new RandomGenParser('$hello world\na\nb\nc\n');

parser.setString('$hello world\na\nb\nc\nd\n');
parser.reparse();
```

Here is the format of the config:

```json5
{
  linebreaks: String
}
```

For more information on the functions given and the types, look at the [types](index.d.ts).

### Extending

The `randomgen-parser` module allows to extend and create plugins for it. An example plugin that would use `#` instead of `//` for line comments is:

```js
module.exports = {
  lineCommentStart: '#',
  lineCommentValueReg: /^[\s\uFEFF\xA0]*#(.*)$/
};
```

The exported object must contain properties that are intended to be edited of the class.

## Development

Run the following to convert typescript to javascript:

```sh
npm run build
```
