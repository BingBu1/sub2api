/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 主色调 - Zipkiwi 官网蓝色系
        primary: {
          50: '#edf3fc',
          100: '#e1e9fb',
          200: '#c6d6fb',
          300: '#9ab4ff',
          400: '#7399f1',
          500: '#315fe9',
          600: '#2952ce',
          700: '#2347b5',
          800: '#203a78',
          900: '#1f325e',
          950: '#14213d'
        },
        gray: {
          50: '#f7f9fd',
          100: '#edf3fc',
          200: '#d8e1ef',
          300: '#becbe0',
          400: '#8192ad',
          500: '#53647e',
          600: '#475974',
          700: '#344762',
          800: '#243650',
          900: '#182943',
          950: '#101c30'
        },
        // 辅助色 - 深蓝灰
        accent: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        // 深色模式背景
        dark: {
          50: '#f7f9fd',
          100: '#edf3ff',
          200: '#cfdaef',
          300: '#a5b4cd',
          400: '#9aaecb',
          500: '#6e82a3',
          600: '#43546d',
          700: '#2b3a52',
          800: '#16233a',
          900: '#111c2f',
          950: '#0b1220'
        }
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.06)',
        glow: '0 0 20px rgba(49, 94, 208, 0.25)',
        'glow-lg': '0 0 40px rgba(49, 94, 208, 0.35)',
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 40px rgba(0, 0, 0, 0.08)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(112deg, var(--zk-brand), var(--zk-brand-end))',
        'gradient-dark': 'linear-gradient(135deg, #16233a 0%, #111c2f 100%)',
        'gradient-glass':
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'mesh-gradient':
          'radial-gradient(at 40% 20%, rgba(49, 94, 208, 0.10) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(126, 161, 240, 0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(81, 119, 218, 0.06) 0px, transparent 50%)',
        'mesh-gradient-dark':
          'radial-gradient(at 40% 20%, rgba(49, 94, 208, 0.16) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(155, 184, 255, 0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(81, 119, 218, 0.08) 0px, transparent 50%)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(49, 94, 208, 0.25)' },
          '100%': { boxShadow: '0 0 30px rgba(49, 94, 208, 0.4)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  },
  plugins: []
}
