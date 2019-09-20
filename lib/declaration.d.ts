declare module 'css.escape';

declare module 'pseudo-localization' {
  export type LocalizeOptions = {
    strategy?: string;
  };

  export function localize(text: string, options?: LocalizeOptions): string;
}
