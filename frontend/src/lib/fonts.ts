import localFont from 'next/font/local'

export const niveauGrotesk = localFont({
  src: [
    {
      path: '../fonts/niveau-grotesk/Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../fonts/niveau-grotesk/Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/niveau-grotesk/Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/niveau-grotesk/Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-niveau-grotesk',
  display: 'swap',
})
