const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        // QLine's own names
        ink: { DEFAULT: 'hsl(var(--ink))', soft: 'hsl(var(--ink-soft))', line: 'hsl(var(--ink-line))' },
        brass: { DEFAULT: 'hsl(var(--brass))', soft: 'hsl(var(--brass-soft))' },
      },
      // One family per weight: React Native does not pick a weight from a
      // family the way a browser does, so each weight is its own font file.
      fontFamily: {
        ui: ['SchibstedGrotesk_400Regular', 'system-ui', 'sans-serif'],
        'ui-md': ['SchibstedGrotesk_500Medium', 'system-ui', 'sans-serif'],
        'ui-sb': ['SchibstedGrotesk_600SemiBold', 'system-ui', 'sans-serif'],
        num: ['Fraunces_600SemiBold', 'Georgia', 'serif'],
        'num-b': ['Fraunces_700Bold', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
