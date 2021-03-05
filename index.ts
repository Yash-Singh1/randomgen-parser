type Config = {
  linebreaks?: string;
};
type Class = new (...args: any[]) => any;
type settingType = 'string' | 'number' | 'boolean';
type afterLinebreak = string | null;
type part = aboutList | setting | note | newlineToken | comment | listElement;
type ParsingResult = Array<part>;
interface pos {
  line: [number, number] | number;
  column: number | null;
}
interface comment {
  type: 'comment';
  commentType: 'single-line' | 'multi-line';
  stringValue: string;
  interpretedValue: string;
  raw: string;
  pos: pos;
  afterLinebreak: afterLinebreak;
}
interface newlineToken {
  type: 'newline';
  stringValue: string;
  interpretedValue: string;
  raw: string;
  pos: pos;
  afterLinebreak: afterLinebreak;
}
interface note {
  type: 'note';
  raw: string;
  stringValue: string;
  interpretedValue: string;
  pos: pos;
  afterLinebreak: afterLinebreak;
}
interface setting {
  type: 'setting';
  stringValue: string;
  interpretedValue: string | number | boolean;
  raw: string;
  settingType?: settingType;
  setting?: string;
  pos: pos;
  afterLinebreak: afterLinebreak;
}
interface aboutList {
  type: 'list';
  name: string;
  raw: string;
  declarationString: string;
  stringValue: string;
  interpretedValue: ParsingResult;
  isRoot?: boolean;
  isIncrementing?: boolean;
  afterLinebreak: afterLinebreak;
  pos: pos;
}
interface objectType {
  type: 'object';
  objectType: 'attributes' | 'chance';
  stringValue: string;
  interpretedValue: Object | number;
  spaceAfter: boolean;
  raw: string;
  pos: pos;
}
interface stringOfAnElement {
  type: 'string';
  stringValue: string;
  interpretedValue: string;
  raw: string;
  pos: pos;
}
interface listElement {
  type: 'element';
  stringValue: string;
  interpretedValue: Array<objectType | stringOfAnElement | referenceElement>;
  raw: string;
  chance: 'default' | number;
  attributes: Object;
  afterLinebreak: afterLinebreak;
  pos: pos;
}
type referenceElement =
  | {
      type: 'reference';
      referenceType: 'union';
      stringValue: string;
      interpretedValue: Array<referenceElement | stringOfAnElement>;
      raw: string;
      pos: pos;
    }
  | {
      type: 'reference';
      referenceType: 'variable';
      variableType: 'identifier' | 'list';
      keywords: Array<string>;
      stringValue: string;
      interpretedValue: string;
      raw: string;
      pos: pos;
    }
  | {
      type: 'reference';
      referenceType: 'range';
      stringValue: string;
      interpretedValue: [number, number];
      raw: string;
      pos: pos;
    }
  | {
      type: 'reference';
      referenceType: 'special';
      stringValue: string;
      interpretedValue: string;
      raw: string;
      pos: pos;
    };

function ParsingError(message) {
  this.name = 'ParsingError';
  this.message = message;
  this.randomgen = true;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, ParsingError);
  }
}

ParsingError.prototype = Error.prototype;

class RandomGenParser {
  string: string;
  parsed: ParsingResult;

  /**
   * Constructor for the parser
   * @param {string} string
   * @param {Config} config
   * @param {Object} events
   */
  constructor(string: string, { linebreaks = 'lf' }: Config = {}) {
    this.setString(string);
    this.reparse({ linebreaks });
  }

  /**
   * Parses the code
   * @param {Config} The configuration for parsing
   */
  reparse({ linebreaks = 'lf' }: Config = {}): ParsingResult {
    let splitted: Array<string> = this.splitOnNewline(this.string, linebreaks);
    let parsingResult: ParsingResult = this.resultAtBeginning;
    let inList: boolean = this.inListAtBeginning;
    let currentList: aboutList | null = this.listAtBeginning;
    let commenting: boolean = this.commentingAtBeginning;
    let pos: number = this.posAtBeginning;
    let currentBlockComments: comment = Object.assign({}, this.defaultBlockComments);
    let beforeLinebreak: afterLinebreak = null;
    splitted.forEach((line, lineNum) => {
      pos += line.length;
      let afterLinebreak: afterLinebreak = (
        Object.values(this.linebreakTypes)
          .map((type) => {
            if (typeof type === 'string') {
              return { matches: this.string.slice(pos).startsWith(type), value: type };
            } else {
              let value = type.exec(this.string.slice(pos));
              return { matches: value !== null, value: value ? value[0] : null };
            }
          })
          .filter((type) => type.matches === true)[0] || { value: null }
      ).value;
      if (afterLinebreak !== null) {
        pos += afterLinebreak.length;
      }
      if (commenting === true) {
        if (this.isBlockCommentEnd(line)) {
          commenting = false;
          currentBlockComments.raw += line;
          currentBlockComments.stringValue += this.beginningWhitespace.exec(line)[0];
          currentBlockComments.interpretedValue = currentBlockComments.stringValue;
          currentBlockComments.afterLinebreak = afterLinebreak;
          currentBlockComments.pos.line[1] = lineNum + 1;
          if (inList === true) {
            currentList.interpretedValue.push(currentBlockComments);
            currentList.stringValue += currentBlockComments.raw;
          } else {
            parsingResult.push(currentBlockComments);
          }
          currentBlockComments = Object.assign({}, this.defaultBlockComments);
        } else {
          currentBlockComments.stringValue += line;
          currentBlockComments.stringValue += afterLinebreak || '';
          currentBlockComments.raw += line;
          currentBlockComments.raw += afterLinebreak || '';
          currentBlockComments.interpretedValue = currentBlockComments.stringValue;
        }
        return;
      }
      if (line === '') {
        parsingResult.push(Object.assign(this.newlineObject, { pos: { line: lineNum + 1, column: 0 }, afterLinebreak }));
        if (inList === true) {
          inList = false;
          currentList.afterLinebreak = beforeLinebreak;
          parsingResult.push(currentList);
          currentList = null;
        }
      } else if (this.isLineComment(line)) {
        let lineCommentValue: string = this.getLineCommentValue(line);
        let commentInfo: comment = {
          ...this.singleLineCommentTemplate,
          stringValue: lineCommentValue,
          interpretedValue: lineCommentValue,
          raw: line,
          pos: {
            line: lineNum + 1,
            column: null
          },
          afterLinebreak
        };
        if (inList === true) {
          currentList.interpretedValue.push(commentInfo);
          currentList.raw += commentInfo.raw;
          currentList.raw += afterLinebreak || '';
          currentList.stringValue = currentList.raw;
        } else {
          parsingResult.push(commentInfo);
        }
      } else if (this.isBlockCommentStart(line)) {
        commenting = true;
        currentBlockComments.raw += line;
        currentBlockComments.raw += afterLinebreak || '';
        currentBlockComments.stringValue += line.trim().slice(2);
        currentBlockComments.stringValue += afterLinebreak || '';
        currentBlockComments.interpretedValue = currentBlockComments.stringValue;
        currentBlockComments.pos.line[0] = lineNum + 1;
      } else if (this.isSetting(line)) {
        parsingResult.push({ ...this.getSetting(line, lineNum + 1), afterLinebreak });
        if (inList === true) {
          inList = false;
          currentList.afterLinebreak = beforeLinebreak;
          parsingResult.push(currentList);
          currentList = null;
        }
      } else if (this.isNote(line)) {
        let noteValue: string = this.getNote(line);
        let noteInfo: note = {
          ...this.noteTemplate,
          stringValue: noteValue,
          interpretedValue: noteValue,
          raw: line,
          pos: { line: lineNum + 1, column: this.getBeginningWhitespace(line).length + this.noteStart.length + 1 },
          afterLinebreak
        };
        if (inList === true) {
          currentList.interpretedValue.push(noteInfo);
          currentList.raw += noteInfo.raw;
          currentList.raw += afterLinebreak || '';
          currentList.stringValue = currentList.raw;
        } else {
          parsingResult.push(noteInfo);
        }
      } else if (this.isList(line)) {
        if (inList === true) {
          currentList.afterLinebreak = beforeLinebreak;
          parsingResult.push(currentList);
        }
        let listInfo = this.getList(line);
        currentList = { ...listInfo.listInfo, pos: { line: lineNum + 1, column: listInfo.column } };
        inList = true;
        currentList.raw += afterLinebreak || '';
        currentList.stringValue = currentList.raw;
      } else {
        currentList.interpretedValue.push({ ...this.parseElement(line, lineNum + 1), afterLinebreak });
        currentList.raw += line;
        currentList.raw += afterLinebreak || '';
        currentList.stringValue = currentList.raw;
      }
      if (lineNum + 1 === splitted.length && inList === true) {
        inList = false;
        currentList.afterLinebreak = beforeLinebreak;
        parsingResult.push(currentList);
        currentList = null;
      }
      if (afterLinebreak) {
        beforeLinebreak = afterLinebreak.slice();
      }
    });
    this.parsed = parsingResult;
    return parsingResult;
  }

  setString(string: string) {
    this.string = string;
  }

  private getPosition(string: string, subString: string, index: number): number {
    return string.split(subString, index).join(subString).length;
  }

  private flatten(arr: any): any {
    while (arr.find((arr) => Array.isArray(arr))) {
      arr = arr.reduce((acc, arr) => {
        if (!Array.isArray(arr)) acc.push(arr);
        else acc = acc.concat(arr);
        return acc;
      }, []);
    }
    return arr;
  }

  private splitOnNewline(string: string, linebreakType: string): Array<string> {
    return string.split(this.getLineBreak(linebreakType));
  }

  private getLineBreak(linebreakType: string): string {
    return this.linebreakTypes[linebreakType.toLowerCase()];
  }

  private beginningWhitespace: RegExp = /^[\s\uFEFF\xA0]*/;
  private getBeginningWhitespace(line: string) {
    return this.beginningWhitespace.exec(line)[0];
  }

  private lineCommentValueReg: RegExp = /^[\s\uFEFF\xA0]*\/\/(.*)$/;
  private getLineCommentValue(line: string): string {
    return this.lineCommentValueReg.exec(line)[1];
  }
  private isLineComment(line: string): boolean {
    return line.trim().startsWith(this.lineCommentStart);
  }

  private singleLineCommentTemplate: Pick<comment, 'type' | 'commentType'> = {
    type: 'comment',
    commentType: 'single-line'
  };

  private isBlockCommentStart(line: string): boolean {
    return line.trim().startsWith(this.blockCommentStart);
  }

  private isBlockCommentEnd(line: string): boolean {
    return line.trim().startsWith(this.blockCommentEnd);
  }

  private lineCommentStart: string = '//';
  private blockCommentStart: string = '/*';
  private blockCommentEnd: string = '*/';

  private defaultBlockComments: comment = {
    type: 'comment',
    commentType: 'multi-line',
    raw: '',
    stringValue: '',
    interpretedValue: '',
    pos: {
      line: [0, 0],
      column: null
    },
    afterLinebreak: null
  };

  private commentingAtBeginning: boolean = false;
  private inListAtBeginning: boolean = false;
  private listAtBeginning: aboutList | null = null;
  private posAtBeginning: number = 0;
  private resultAtBeginning: ParsingResult = [];

  private linebreakTypes = {
    'crlf': '\r\n',
    'cr+lf': '\r\n',
    'lf': '\n',
    'cr': '\r',
    'auto': /\r\n|\r|\n/
  };

  private newlineObject: Omit<newlineToken, 'afterLinebreak' | 'pos'> = {
    type: 'newline',
    raw: '',
    stringValue: '',
    interpretedValue: ''
  };

  private nameDeclarationRegexp: RegExp = /^[\s\uFEFF\xA0]*\$name : (.*?)[\s\uFEFF\xA0]*$/i;
  private nameDeclarationStart: string = '$name : ';
  private isNameDeclaration(line: string): boolean {
    return this.nameDeclarationRegexp.test(line);
  }
  private getNameFromNameDeclaration(line: string): string {
    return this.nameDeclarationRegexp.exec(line)[1];
  }

  private descriptionDeclarationRegexp: RegExp = /^[\s\uFEFF\xA0]*\$description : (.*?)[\s\uFEFF\xA0]*$/i;
  private descriptionDeclarationStart: string = '$description : ';
  private isDescriptionDeclaration(line: string): boolean {
    return this.descriptionDeclarationRegexp.test(line);
  }
  private getDescriptionFromDescriptionDeclaration(line: string): string {
    return this.descriptionDeclarationRegexp.exec(line)[1];
  }

  private authorDeclarationRegexp: RegExp = /^[\s\uFEFF\xA0]*\$author : (.*?)[\s\uFEFF\xA0]*$/i;
  private authorDeclarationStart: string = '$author : ';
  private isAuthorDeclaration(line: string): boolean {
    return this.authorDeclarationRegexp.test(line);
  }
  private getAuthorFromAuthorDeclaration(line: string): string {
    return this.authorDeclarationRegexp.exec(line)[1];
  }

  private buttonDeclarationRegexp: RegExp = /^[\s\uFEFF\xA0]*\$button : (.*?)[\s\uFEFF\xA0]*$/i;
  private buttonDeclarationStart: string = '$description : ';
  private isButtonDeclaration(line: string): boolean {
    return this.buttonDeclarationRegexp.test(line);
  }
  private getButtonTextFromButtonDeclaration(line: string): string {
    return this.buttonDeclarationRegexp.exec(line)[1];
  }

  private amountDeclarationRegexp: RegExp = /^[\s\uFEFF\xA0]*\$amount : (.*?)[\s\uFEFF\xA0]*$/i;
  private amountDeclarationStart: string = '$amount : ';
  private isAmountDeclaration(line: string): boolean {
    return this.amountDeclarationRegexp.test(line);
  }
  private getAmountFromAmountDeclaration(line: string): string {
    return this.amountDeclarationRegexp.exec(line)[1];
  }

  private pictureDeclarationRegexp: RegExp = /^[\s\uFEFF\xA0]*\$picture : (.*?)[\s\uFEFF\xA0]*$/i;
  private pictureDeclarationStart: string = '$picture : ';
  private isPictureDeclaration(line: string): boolean {
    return this.pictureDeclarationRegexp.test(line);
  }
  private getPictureURLFromPictureDeclaration(line: string): string {
    return this.pictureDeclarationRegexp.exec(line)[1];
  }

  private includeRegexp: RegExp = /^[\s\uFEFF\xA0]*\$include (.*?)[\s\uFEFF\xA0]*$/i;
  private includeDeclarationStart = '$include ';
  private isIncludeDeclaration(line: string): boolean {
    return this.includeRegexp.test(line);
  }
  private getURLFromIncludeDeclaration(line: string): string {
    return this.includeRegexp.exec(line)[1];
  }

  private booleanSettingRegexp: RegExp = /^[\s\uFEFF\xA0]*\$(all roots|allow duplicates|force unique|includes finalized)[\s\uFEFF\xA0]*$/i;
  private booleanDeclarationStart: string = '$';
  private isBooleanSettingDeclaration(line: string): boolean {
    return this.booleanSettingRegexp.test(line);
  }
  private getBooleanSetting(line: string): string {
    return this.booleanSettingRegexp.exec(line)[1];
  }

  private isSetting(line: string): boolean {
    return (
      this.isNameDeclaration(line) ||
      this.isDescriptionDeclaration(line) ||
      this.isAuthorDeclaration(line) ||
      this.isButtonDeclaration(line) ||
      this.isAmountDeclaration(line) ||
      this.isPictureDeclaration(line) ||
      this.isIncludeDeclaration(line) ||
      this.isBooleanSettingDeclaration(line)
    );
  }
  private getSetting(line: string, lineNum: number): Omit<setting, 'afterLinebreak'> {
    let stringValue: string;
    let interpretedValue: any;
    let settingType: settingType;
    let setting: string;
    let column: number = this.getBeginningWhitespace(line).length;
    if (this.isNameDeclaration(line)) {
      stringValue = this.getNameFromNameDeclaration(line);
      settingType = 'string';
      setting = 'name';
      column += this.nameDeclarationStart.length;
    } else if (this.isDescriptionDeclaration(line)) {
      stringValue = this.getDescriptionFromDescriptionDeclaration(line);
      settingType = 'string';
      setting = 'description';
      column += this.descriptionDeclarationStart.length;
    } else if (this.isAuthorDeclaration(line)) {
      stringValue = this.getAuthorFromAuthorDeclaration(line);
      settingType = 'string';
      setting = 'author';
      column += this.authorDeclarationStart.length;
    } else if (this.isButtonDeclaration(line)) {
      stringValue = this.getButtonTextFromButtonDeclaration(line);
      settingType = 'string';
      setting = 'button';
      column += this.buttonDeclarationStart.length;
    } else if (this.isAmountDeclaration(line)) {
      stringValue = this.getAmountFromAmountDeclaration(line);
      let numberParsedValue: number = parseInt(stringValue);
      if (isNaN(numberParsedValue)) {
        interpretedValue = 1;
      } else {
        interpretedValue = Math.min(numberParsedValue, 50);
      }
      settingType = 'number';
      setting = 'amount';
      column += this.amountDeclarationStart.length;
    } else if (this.isPictureDeclaration(line)) {
      stringValue = this.getPictureURLFromPictureDeclaration(line);
      settingType = 'string';
      setting = 'picture';
      column += this.pictureDeclarationStart.length;
    } else if (this.isIncludeDeclaration(line)) {
      stringValue = this.getURLFromIncludeDeclaration(line);
      settingType = 'string';
      setting = 'include';
      column += this.includeDeclarationStart.length;
    } else if (this.isBooleanSettingDeclaration(line)) {
      stringValue = this.getBooleanSetting(line);
      settingType = 'boolean';
      interpretedValue = true;
      setting = stringValue;
      column += this.booleanDeclarationStart.length;
    }
    column += 1;
    if (!interpretedValue) {
      interpretedValue = stringValue;
    }
    return {
      type: 'setting',
      stringValue,
      interpretedValue,
      raw: line,
      settingType,
      setting,
      pos: {
        line: lineNum,
        column
      }
    };
  }

  private noteStart: string = '$[note] ';
  private isNote(line: string): boolean {
    return line.trimStart().startsWith(this.noteStart);
  }
  private getNote(line: string): string {
    return line.trimStart().slice(this.noteStart.length);
  }
  private noteTemplate: Pick<note, 'type'> = {
    type: 'note'
  };

  private listStartCharacter: string = '$';
  private listPushCharacter: string = '+';
  private listRootCharacter: string = '>';
  private isList(line: string): boolean {
    return line.trim().startsWith(this.listStartCharacter);
  }
  private getList(line: string): { column: number; listInfo: Omit<aboutList, 'pos'> } {
    let saved_line: string = line.slice();
    line = line.trim().slice(1);
    let isRoot: boolean = false;
    let isIncrementing: boolean = false;
    if (line.includes(this.listRootCharacter)) {
      isRoot = true;
      line = line.replace(this.listRootCharacter, '');
    }
    if (line.startsWith(this.listPushCharacter)) {
      isIncrementing = true;
      line = line.slice(1);
    }
    let name: string = line.toLowerCase();
    return {
      column: saved_line.length - saved_line.replace('>', '').replace('+', '').trimStart().slice(1).length + 1,
      listInfo: {
        type: 'list',
        declarationString: saved_line,
        raw: saved_line,
        stringValue: saved_line.trim(),
        name,
        isRoot,
        isIncrementing,
        interpretedValue: [],
        afterLinebreak: null
      }
    };
  }

  private percentSign = '%';
  private attributeSeperator = ':';
  private isPercent(object: string) {
    return !object.includes(':') && object.endsWith(this.percentSign);
  }
  private isAttribute(object: string) {
    return object.includes(this.attributeSeperator);
  }
  private getKeyAndValue(object: string, lineNum: number, column: number): [string, listElement] {
    return [
      object.split(this.attributeSeperator)[0],
      this.parseElement(
        object.split(this.attributeSeperator).slice(1).join(this.attributeSeperator),
        lineNum,
        true,
        column + object.split(this.attributeSeperator)[0].length + this.attributeSeperator.length
      )
    ];
  }
  private convertToStringOfAnElement(string: string, lineNum: number, column: number): stringOfAnElement {
    return { type: 'string', raw: string, stringValue: string, interpretedValue: string, pos: { line: lineNum, column } };
  }
  private parseElement(line: string, lineNum: number, inObject: boolean = false, column: number = null): listElement {
    let saved_line: string = line.slice();
    let chance: 'default' | number | undefined = !inObject ? 'default' : undefined;
    let attributes: Object | undefined = !inObject ? {} : undefined;
    line = line.trim();
    if ((line.match(/\[/) || []).length !== (line.match(new RegExp(this.referenceClose)) || []).length) {
      throw new ParsingError('Unmatched square brackets found at line ' + lineNum);
    }
    if ((line.match(/{/) || []).length !== (line.match(/}/) || []).length && !inObject) {
      throw new ParsingError('Unmatched curly braces found at line' + lineNum);
    }
    if (line.includes('{') && !inObject) {
      if (line.lastIndexOf('}') !== line.length - 1) {
        throw new ParsingError('Closing brackets not found at end of line ' + lineNum);
      }
      let objects: Array<string> = line
        .slice(line.indexOf('{') + 1, -1)
        .replace('} {', '}{')
        .split('}{');
      if (objects.find((object) => object.includes('{') || object.includes('}'))) {
        throw new ParsingError('Unknown characters between curly braces ending and starting ' + lineNum);
      }
      objects.forEach((object, objectNum) => {
        if (this.isPercent(object)) {
          chance = parseFloat(object.slice(0, -1));
          if (isNaN(chance)) {
            throw new ParsingError('Invalid percentage ' + object + ' at line ' + lineNum);
          }
        } else if (this.isAttribute(object)) {
          let attributeParts = this.getKeyAndValue(object, lineNum, this.getPosition(saved_line, '{', objectNum + 1) + 1);
          attributes[attributeParts[0]] = attributeParts[1];
        }
      });
    }
    let second_saved_line: string = saved_line.slice();
    let tokensSplit: Array<{ value: string; column: number }> = [];
    [...saved_line].forEach((char, index) => {
      if (((inObject ? '{}' : '') + this.referenceOpen + this.referenceClose + this.referenceOpen).includes(char)) {
        tokensSplit.push({ value: char, column: index + 1 });
        tokensSplit.push({ value: '', column: index + 2 });
      } else {
        if (index === 0) tokensSplit.push({ value: '', column: 1 });
        tokensSplit[tokensSplit.length - 1].value += char;
      }
    });
    if (tokensSplit[tokensSplit.length - 1].value === '') tokensSplit.pop();
    if (
      !inObject &&
      tokensSplit
        .filter((value) => '{}'.includes(value.value))
        .map((bracketObj) => bracketObj.value)
        .find((bracket, bracketIndex, bracketArr) => bracketArr[bracketIndex + 1] === bracket)
    ) {
      throw new ParsingError('Consecutive equal curly braces found at line ' + lineNum);
    }
    let interpretedValue: Array<objectType | stringOfAnElement | referenceElement> = [];
    if (!inObject) {
      tokensSplit = tokensSplit.reduce((acc, token) => {
        if (acc.length > 0 && Array.isArray(acc[acc.length - 1]) && acc[acc.length - 1][acc[acc.length - 1].length - 1].value !== '}') {
          acc[acc.length - 1].push(token);
        } else if (token.value === '{') {
          acc.push([token]);
        } else {
          acc.push(token);
        }
        return acc;
      }, []);
    }
    tokensSplit = tokensSplit.reduce((acc, token) => {
      if (
        acc.length > 0 &&
        Array.isArray(acc[acc.length - 1]) &&
        acc[acc.length - 1].filter((char) => char.value === this.referenceOpen).length !==
          acc[acc.length - 1].filter((char) => char.value === this.referenceClose).length
      ) {
        acc[acc.length - 1].push(token);
      } else if (token.value === this.referenceOpen) {
        acc.push([token]);
      } else {
        acc.push(token);
      }
      return acc;
    }, []);
    tokensSplit = tokensSplit.reduce((acc, token, tokenPos) => {
      if (typeof token.value === 'string' && token.value !== this.referenceOr) {
        if (
          tokenPos !== tokensSplit.length - 1 &&
          typeof tokensSplit[tokenPos + 1].value === 'string' &&
          tokensSplit[tokenPos + 1].value === this.referenceOr
        ) {
          token.value += this.referenceOr;
        }
        if (tokenPos !== 0 && typeof tokensSplit[tokenPos - 1].value === 'string' && tokensSplit[tokenPos - 1].value === this.referenceOr) {
          token.value = this.referenceOr + token.value;
          token.column -= 1;
        }
        acc.push(token);
      } else if (token.value !== this.referenceOr) {
        acc.push(token);
      }
      return acc;
    }, []);
    tokensSplit.forEach((token, tokenPos) => {
      if (typeof token === 'undefined') {
        return;
      }
      if (typeof token.value === 'string' && !((inObject ? '{}' : '') + this.referenceOpen + this.referenceClose).includes(token.value)) {
        interpretedValue.push(this.convertToStringOfAnElement(token.value, lineNum, token.column));
      } else if (Array.isArray(token)) {
        if (!inObject && token[0].value === '{') {
          let spaceAfter: boolean =
            tokenPos + 1 !== tokensSplit.length && !Array.isArray(tokensSplit[tokenPos + 1]) && tokensSplit[tokenPos + 1].value === ' ';
          if (this.isPercent(token[1].value)) {
            let percentChance: number = parseFloat(token[1].value.slice(0, -1));
            if (isNaN(percentChance)) {
              throw new ParsingError('Invalid percentage ' + token[1].value + ' at line ' + lineNum);
            }
            interpretedValue.push({
              type: 'object',
              objectType: 'chance',
              stringValue: token[1].value,
              interpretedValue: percentChance,
              raw: token.map((tokenPart) => tokenPart.value).join(''),
              pos: {
                line: lineNum,
                column: token[0].column
              },
              spaceAfter
            });
          } else if (this.isAttribute(token[1].value)) {
            let attributeParts = this.getKeyAndValue(token[1].value, lineNum, token[1].column);
            interpretedValue.push({
              type: 'object',
              objectType: 'attributes',
              stringValue: token[1].value,
              interpretedValue: attributeParts,
              raw: token.map((tokenPart) => tokenPart.value).join(''),
              pos: {
                line: lineNum,
                column: token[0].column
              },
              spaceAfter
            });
          }
          if (spaceAfter) {
            delete tokensSplit[tokenPos + 1];
          }
        } else if (token[0].value === this.referenceOpen) {
          interpretedValue.push(this.parseReference(token, lineNum));
        }
      }
    });
    return {
      type: 'element',
      raw: second_saved_line,
      chance,
      attributes,
      stringValue: line.trim(),
      interpretedValue,
      pos: { line: lineNum, column: column },
      afterLinebreak: null
    };
  }

  private referenceOpen: string = '[';
  private referenceClose: string = ']';
  private referenceOr: string = '|';
  private referenceVar: string = '#';
  private referenceKeywordSeperator: string = ',';
  private rangeReg: RegExp = /(\d+)-(\d+)/;
  private parseReference(reference: Array<{ value: string; column: number }>, lineNum: number): referenceElement {
    let saved_line: string = this.flatten(reference)
      .map((referencePart) => referencePart.value)
      .join('');
    reference = reference.slice(1, -1);
    if (reference.length === 1 && this.rangeReg.test(reference[0].value)) {
      let results = this.rangeReg.exec(reference[0].value);
      let start = parseInt(results[1]);
      let end = parseInt(results[2]);
      if (isNaN(start) || isNaN(end)) {
        throw new Error('Range is invalid at line ' + lineNum + ' , column ' + reference[0].column);
      }
      return {
        type: 'reference',
        referenceType: 'range',
        raw: saved_line,
        stringValue: reference[0].value,
        interpretedValue: [start, end],
        pos: {
          line: lineNum,
          column: reference[0].column
        }
      };
    } else if (reference.length === 1 && ['an', 's', 'seed', '', '/', ' '].includes(reference[0].value)) {
      return {
        type: 'reference',
        referenceType: 'special',
        stringValue: reference[0].value,
        interpretedValue: reference[0].value,
        raw: saved_line,
        pos: {
          line: lineNum,
          column: reference[0].column
        }
      };
    } else if (reference.length === 1) {
      return {
        type: 'reference',
        referenceType: 'variable',
        variableType: reference[0].value.startsWith(this.referenceVar) ? 'identifier' : 'list',
        stringValue: reference[0].value,
        interpretedValue: reference[0].value,
        raw: saved_line,
        keywords: reference[0].value.split(this.referenceKeywordSeperator).slice(1),
        pos: {
          line: lineNum,
          column: reference[0].column
        }
      };
    } else if (reference.length !== 1 && reference.find((part) => part.value === this.referenceOr)) {
      let cached_column: number = Number(reference[0].column);
      reference = reference.reduce((acc, token) => {
        if (
          acc.length > 0 &&
          Array.isArray(acc[acc.length - 1]) &&
          acc[acc.length - 1].filter((char) => char === this.referenceOpen).length !==
            acc[acc.length - 1].filter((char) => char === this.referenceClose).length
        ) {
          acc[acc.length - 1].push(token);
        } else if (token.value === this.referenceOpen) {
          acc.push([token]);
        } else {
          acc.push(token);
        }
        return acc;
      }, []);
      reference.filter((part) => part.value === this.referenceOr);
      let result = {
        type: 'reference',
        referenceType: 'union',
        raw: saved_line,
        stringValue: saved_line.slice(1, -1),
        interpretedValue: [],
        pos: {
          line: lineNum,
          column: cached_column
        }
      };
      reference.forEach((part) => {
        if (Array.isArray(part)) {
          result.interpretedValue.push(this.parseReference(part, lineNum));
        } else {
          result.interpretedValue.push(this.convertToStringOfAnElement(part.value, lineNum, part.column));
        }
      });
    }
  }

  static plug(pluggedClass: Class) {
    return pluggedClass;
  }
}

if (typeof module !== 'undefined') {
  module.exports = RandomGenParser;
}
