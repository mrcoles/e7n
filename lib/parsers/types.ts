export type ParseString = {
  text: string;
  key: string | undefined;
  placeholders?: any;
};
export type FormatError = {
  message: string;
  shortMessage: string;
  sample: string;
  line?: number;
  char?: number;
};
