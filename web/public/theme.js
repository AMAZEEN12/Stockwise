// Apply the saved appearance before styles and React load.
(function () {
  var preference = 'system';
  try {
    var saved = localStorage.getItem('stockwise.theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* System appearance still works when storage is unavailable. */ }
  var theme = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0b0b0a' : '#f6f7f2';
}());
