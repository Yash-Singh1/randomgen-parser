declare type Config = {
  linebreaks?: string;
  plugins?: Object | Array<Object>;
};
declare type settingType = 'string' | 'number' | 'boolean';
declare type afterLinebreak = string | null;
declare type part = aboutList | setting | note | newlineToken | comment | listElement;
declare type ParsingResult = Array<part>;
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
  chance?: 'default' | number;
  attributes?: Object;
  afterLinebreak: afterLinebreak;
  pos: pos;
}
interface unionReference {
  type: 'reference';
  referenceType: 'union';
  stringValue: string;
  interpretedValue: Array<Array<referenceElement | stringOfAnElement>>;
  raw: string;
  pos: pos;
}
declare type referenceElement =
  | unionReference
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
declare class ParsingError extends Error {
  name: string;
  message: string;
  constructor(message: string);
}
declare class RandomGenParser {
  string: string;
  parsed: ParsingResult;
  /**
   * Constructor for the parser
   * @param {string} string
   * @param {Config} config
   * @param {Object} events
   */
  constructor(string: string, { linebreaks, plugins }?: Config);
  /**
   * Parses the code
   * @param {Config} The configuration for parsing
   */
  reparse({ linebreaks }?: Config): ParsingResult;
  setString(string: string): void;
  getPosition(string: string, subString: string, index: number): number;
  flatten(arr: any): any;
  splitOnNewline(string: string, linebreakType: string): Array<string>;
  getLineBreak(linebreakType: string): string;
  beginningWhitespace: RegExp;
  getBeginningWhitespace(line: string): string;
  lineCommentValueReg: RegExp;
  getLineCommentValue(line: string): string;
  isLineComment(line: string): boolean;
  singleLineCommentTemplate: Pick<comment, 'type' | 'commentType'>;
  isBlockCommentStart(line: string): boolean;
  isBlockCommentEnd(line: string): boolean;
  lineCommentStart: string;
  blockCommentStart: string;
  blockCommentEnd: string;
  defaultBlockComments: comment;
  commentingAtBeginning: boolean;
  inListAtBeginning: boolean;
  listAtBeginning: aboutList | null;
  posAtBeginning: number;
  resultAtBeginning: ParsingResult;
  linebreakTypes: {
    'crlf': string;
    'cr+lf': string;
    'lf': string;
    'cr': string;
    'auto': RegExp;
  };
  newlineObject: Omit<newlineToken, 'afterLinebreak' | 'pos'>;
  nameDeclarationRegexp: RegExp;
  nameDeclarationStart: string;
  isNameDeclaration(line: string): boolean;
  getNameFromNameDeclaration(line: string): string;
  descriptionDeclarationRegexp: RegExp;
  descriptionDeclarationStart: string;
  isDescriptionDeclaration(line: string): boolean;
  getDescriptionFromDescriptionDeclaration(line: string): string;
  authorDeclarationRegexp: RegExp;
  authorDeclarationStart: string;
  isAuthorDeclaration(line: string): boolean;
  getAuthorFromAuthorDeclaration(line: string): string;
  buttonDeclarationRegexp: RegExp;
  buttonDeclarationStart: string;
  isButtonDeclaration(line: string): boolean;
  getButtonTextFromButtonDeclaration(line: string): string;
  amountDeclarationRegexp: RegExp;
  amountDeclarationStart: string;
  isAmountDeclaration(line: string): boolean;
  getAmountFromAmountDeclaration(line: string): string;
  pictureDeclarationRegexp: RegExp;
  pictureDeclarationStart: string;
  isPictureDeclaration(line: string): boolean;
  getPictureURLFromPictureDeclaration(line: string): string;
  includeRegexp: RegExp;
  includeDeclarationStart: string;
  isIncludeDeclaration(line: string): boolean;
  getURLFromIncludeDeclaration(line: string): string;
  booleanSettingRegexp: RegExp;
  booleanDeclarationStart: string;
  isBooleanSettingDeclaration(line: string): boolean;
  getBooleanSetting(line: string): string;
  isSetting(line: string): boolean;
  getSetting(line: string, lineNum: number): Omit<setting, 'afterLinebreak'>;
  noteStart: string;
  isNote(line: string): boolean;
  getNote(line: string): string;
  noteTemplate: Pick<note, 'type'>;
  listStartCharacter: string;
  listPushCharacter: string;
  listRootCharacter: string;
  isList(line: string): boolean;
  getList(
    line: string
  ): {
    column: number;
    listInfo: Omit<aboutList, 'pos'>;
  };
  percentSign: string;
  attributeSeperator: string;
  isPercent(object: string): boolean;
  isAttribute(object: string): boolean;
  getKeyAndValue(object: string, lineNum: number, column: number): [string, Omit<listElement, 'afterLinebreak'>];
  convertToStringOfAnElement(string: string, lineNum: number, column: number): stringOfAnElement;
  parseElement(line: string, lineNum: number, inObject?: boolean, column?: number): Omit<listElement, 'afterLinebreak'>;
  referenceOpen: string;
  referenceClose: string;
  referenceOr: string;
  referenceVar: string;
  referenceKeywordSeperator: string;
  rangeReg: RegExp;
  parseReference(
    reference: Array<{
      value: string;
      column: number;
    }>,
    lineNum: number
  ): referenceElement;
}

export = RandomGenParser;
