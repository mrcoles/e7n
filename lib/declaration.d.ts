declare module 'css.escape';

declare module 'pseudoloc' {
  type Options = {
    prepend: string;
    append: string;
    delimiter: string;
    startDelimiter: string;
    endDelimiter: string;
    extend: number;
    override?: string;
  };

  export type PsuedolocOptions = Partial<Options>;

  export const version: string;
  export const option: Options;
  export function str(text: string): string;
}
