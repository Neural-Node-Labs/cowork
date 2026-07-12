import { useTheme } from '../context/ThemeContext';

export function ThemePicker() {
  const { themes, themeId, setThemeId } = useTheme();

  return (
    <div className="theme-picker">
      <div className="theme-picker__label">Theme</div>
      <div className="theme-picker__grid">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`theme-swatch${t.id === themeId ? ' theme-swatch--active' : ''}`}
            title={t.name}
            aria-label={`Use ${t.name} theme`}
            aria-pressed={t.id === themeId}
            onClick={() => setThemeId(t.id)}
          >
            <span className="theme-swatch__dots">
              <span style={{ backgroundColor: t.swatch[0] }} />
              <span style={{ backgroundColor: t.swatch[1] }} />
              <span style={{ backgroundColor: t.swatch[2] }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
