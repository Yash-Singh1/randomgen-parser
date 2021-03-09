declare type Config = {
  linebreaks?: string;
};
declare type Class = new (...args: any[]) => any;
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
  chance: 'default' | number;
  attributes: Object;
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
declare class RandomGenParser {
  string: string;
  parsed: ParsingResult;
  /**
   * Constructor for the parser
   * @param {string} string
   * @param {Config} config
   * @param {Object} events
   */
  constructor(string: string, { linebreaks }?: Config);
  /**
   * Parses the code
   * @param {Config} The configuration for parsing
   */
  reparse({ linebreaks }?: Config): ParsingResult;
  setString(string: string): void;
  private getPosition;
  private flatten;
  private splitOnNewline;
  private getLineBreak;
  #beginningWhitespace;
  private getBeginningWhitespace;
  #lineCommentValueReg;
  private getLineCommentValue;
  private isLineComment;
  #singleLineCommentTemplate;
  private isBlockCommentStart;
  private isBlockCommentEnd;
  #lineCommentStart;
  #blockCommentStart;
  #blockCommentEnd;
  #defaultBlockComments;
  #commentingAtBeginning;
  #inListAtBeginning;
  #listAtBeginning;
  #posAtBeginning;
  #resultAtBeginning;
  #linebreakTypes;
  #newlineObject;
  #nameDeclarationRegexp;
  #nameDeclarationStart;
  private isNameDeclaration;
  private getNameFromNameDeclaration;
  #descriptionDeclarationRegexp;
  #descriptionDeclarationStart;
  private isDescriptionDeclaration;
  private getDescriptionFromDescriptionDeclaration;
  #authorDeclarationRegexp;
  #authorDeclarationStart;
  private isAuthorDeclaration;
  private getAuthorFromAuthorDeclaration;
  #buttonDeclarationRegexp;
  #buttonDeclarationStart;
  private isButtonDeclaration;
  private getButtonTextFromButtonDeclaration;
  #amountDeclarationRegexp;
  #amountDeclarationStart;
  private isAmountDeclaration;
  private getAmountFromAmountDeclaration;
  #pictureDeclarationRegexp;
  #pictureDeclarationStart;
  private isPictureDeclaration;
  private getPictureURLFromPictureDeclaration;
  #includeRegexp;
  #includeDeclarationStart;
  private isIncludeDeclaration;
  private getURLFromIncludeDeclaration;
  #booleanSettingRegexp;
  #booleanDeclarationStart;
  private isBooleanSettingDeclaration;
  private getBooleanSetting;
  private isSetting;
  private getSetting;
  #noteStart;
  private isNote;
  private getNote;
  #noteTemplate;
  #listStartCharacter;
  #listPushCharacter;
  #listRootCharacter;
  private isList;
  private getList;
  #percentSign;
  #attributeSeperator;
  private isPercent;
  private isAttribute;
  private getKeyAndValue;
  private convertToStringOfAnElement;
  private parseElement;
  #referenceOpen;
  #referenceClose;
  #referenceOr;
  #referenceVar;
  #referenceKeywordSeperator;
  #rangeReg;
  private parseReference;
  static plug(pluggedClass: Class): Class;
}

export = RandomGenParser;
