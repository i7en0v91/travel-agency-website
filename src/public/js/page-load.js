// initialize preferred theme
const mode = localStorage.getItem("theme") || "system";
let theme;
if (mode === "system") {
  const isSystemInDarkMode = matchMedia("(prefers-color-scheme: dark)")
    .matches;
  theme = isSystemInDarkMode ? "dark" : "light";
} else {
  theme = mode;
}
document.documentElement.dataset.theme = theme;
document.documentElement.classList.remove('dark', 'light');
document.documentElement.classList.add(theme);