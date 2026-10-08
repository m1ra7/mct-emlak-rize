export type Theme = "light" | "dark";
export const themeKey = "mct-theme-v1";
export function validTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
export const themeInit = `(function(){try{var t=localStorage.getItem('mct-theme-v1');if(t!=='dark'&&t!=='light')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;
