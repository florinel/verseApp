import { useTheme, FontSize } from '../context/ThemeContext';

const SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'xs', label: 'Extra Small' },
  { value: 'sm', label: 'Small' },
  { value: 'base', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { dark, toggle, fontSerif, toggleFont, fontSize, setFontSize } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-parchment-200 dark:border-gray-700 w-full max-w-sm mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Dark mode */}
        <div className="flex items-center justify-between py-3 border-b border-parchment-100 dark:border-gray-800">
          <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${dark ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Font family */}
        <div className="flex items-center justify-between py-3 border-b border-parchment-100 dark:border-gray-800">
          <span className="text-sm text-gray-700 dark:text-gray-300">Font</span>
          <div className="flex rounded-lg border border-parchment-300 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => { if (!fontSerif) toggleFont(); }}
              className={`px-3 py-1 text-sm transition-colors ${fontSerif ? 'bg-amber-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            >
              <span className="font-serif">Serif</span>
            </button>
            <button
              onClick={() => { if (fontSerif) toggleFont(); }}
              className={`px-3 py-1 text-sm transition-colors ${!fontSerif ? 'bg-amber-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            >
              <span className="font-sans">Sans</span>
            </button>
          </div>
        </div>

        {/* Font size */}
        <div className="py-3 border-b border-parchment-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Text Size</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{SIZE_OPTIONS.find(s => s.value === fontSize)?.label}</span>
          </div>
          <div className="flex gap-1">
            {SIZE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFontSize(opt.value)}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors
                  ${fontSize === opt.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-parchment-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-parchment-200 dark:hover:bg-gray-700'
                  }`}
              >
                {opt.label.split(' ').pop()}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-3 rounded-lg bg-parchment-50 dark:bg-gray-800/50 border border-parchment-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Preview</p>
          <p className={`${fontSerif ? 'font-serif' : 'font-sans'} ${
            fontSize === 'xs' ? 'text-xs' : fontSize === 'sm' ? 'text-sm' : fontSize === 'base' ? 'text-base' : fontSize === 'lg' ? 'text-lg' : 'text-xl'
          } text-gray-800 dark:text-gray-200 leading-relaxed`}>
            <sup className="text-[10px] font-sans font-bold text-amber-700 dark:text-amber-400 align-super mr-0.5">1</sup>
            In the beginning God created the heavens and the earth.
          </p>
        </div>
      </div>
    </div>
  );
}
