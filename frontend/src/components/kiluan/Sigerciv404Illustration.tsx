interface Props {
  className?: string
  title?: string
}

/** Ilustrasi 404 — peta pesisir, kompas, dan spot yang hilang (konsep sigerciv). */
export default function Sigerciv404Illustration({ className, title = 'Spot tidak ditemukan di peta' }: Props) {
  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="sig404-sky" x1="240" y1="0" x2="240" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="#aaffc7" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#67c090" stopOpacity="0.35" />
          <stop offset="1" stopColor="#124170" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="sig404-sea" x1="0" y1="210" x2="480" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67c090" />
          <stop offset="0.55" stopColor="#215b63" />
          <stop offset="1" stopColor="#124170" />
        </linearGradient>
        <linearGradient id="sig404-compass" x1="240" y1="70" x2="240" y2="250" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e8f8f0" stopOpacity="0.85" />
        </linearGradient>
        <filter id="sig404-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#124170" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* langit & latar */}
      <rect width="480" height="360" fill="url(#sig404-sky)" rx="24" />
      <circle cx="390" cy="58" r="34" fill="#aaffc7" fillOpacity="0.35" />
      <circle cx="72" cy="92" r="18" fill="#67c090" fillOpacity="0.25" />

      {/* mangrove kiri */}
      <g opacity="0.9">
        <path
          d="M0 250 C20 220 35 235 48 210 C58 190 70 205 82 188 C94 172 108 188 118 170 L118 250 Z"
          fill="#215b63"
          fillOpacity="0.55"
        />
        <path
          d="M28 250 C42 228 52 240 64 222 C74 206 86 218 96 204 L96 250 Z"
          fill="#124170"
          fillOpacity="0.45"
        />
      </g>

      {/* pulau kecil kanan */}
      <ellipse cx="404" cy="248" rx="46" ry="14" fill="#215b63" fillOpacity="0.35" />
      <path
        d="M368 248 C378 220 392 214 404 218 C416 214 430 220 440 248 Z"
        fill="#67c090"
        fillOpacity="0.55"
      />

      {/* ombak */}
      <path
        d="M0 250 C40 238 80 262 120 250 C160 238 200 262 240 250 C280 238 320 262 360 250 C400 238 440 262 480 250 L480 360 L0 360 Z"
        fill="url(#sig404-sea)"
      />
      <path
        d="M0 268 C55 256 95 280 150 268 C205 256 245 280 300 268 C355 256 395 280 480 268"
        stroke="#aaffc7"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 286 C70 274 110 298 160 286 C210 274 250 298 300 286 C350 274 390 298 460 286"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* jejak rute putus — spot hilang */}
      <path
        d="M96 292 C130 276 168 284 204 268 C228 258 252 246 276 232"
        stroke="#aaffc7"
        strokeOpacity="0.75"
        strokeWidth="2.5"
        strokeDasharray="7 8"
        strokeLinecap="round"
      />
      <circle cx="276" cy="232" r="5" fill="#aaffc7" fillOpacity="0.8" />
      <path
        d="M292 224 C318 210 344 206 372 214"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="5 9"
        strokeLinecap="round"
      />

      {/* pin peta mengambang */}
      <g filter="url(#sig404-soft)" transform="translate(318 118)">
        <path
          d="M0 0 C0 -18 14 -28 28 -28 C42 -28 56 -18 56 0 C56 22 28 48 28 48 C28 48 0 22 0 0 Z"
          fill="#124170"
        />
        <circle cx="28" cy="-2" r="10" fill="#aaffc7" />
        <text
          x="28"
          y="2"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="#124170"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          ?
        </text>
      </g>

      {/* kompas */}
      <g filter="url(#sig404-soft)" transform="translate(240 160)">
        <circle r="78" fill="url(#sig404-compass)" stroke="#67c090" strokeWidth="3" />
        <circle r="62" fill="none" stroke="#215b63" strokeOpacity="0.18" strokeWidth="1.5" />
        <path d="M0 -68 L8 -18 L0 -24 L-8 -18 Z" fill="#124170" />
        <path d="M0 68 L8 18 L0 24 L-8 18 Z" fill="#67c090" fillOpacity="0.65" />
        <path d="M68 0 L18 8 L24 0 L18 -8 Z" fill="#215b63" fillOpacity="0.55" />
        <path d="M-68 0 L-18 8 L-24 0 L-18 -8 Z" fill="#215b63" fillOpacity="0.35" />
        <circle r="8" fill="#124170" />
        <circle r="3.5" fill="#aaffc7" />
        <text
          y="-34"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#124170"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          N
        </text>
      </g>

      {/* angka 404 di tengah kompas */}
      <text
        x="240"
        y="168"
        textAnchor="middle"
        fontSize="28"
        fontWeight="800"
        letterSpacing="-1"
        fill="#124170"
        fillOpacity="0.88"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        404
      </text>

      {/* lumba-lumba */}
      <g transform="translate(372 118) rotate(-8)">
        <path
          d="M0 0 C18 -10 34 -8 44 2 C52 10 48 18 36 20 C28 21 18 18 10 24 C6 27 2 24 4 18 C8 8 0 4 0 0 Z"
          fill="#215b63"
          fillOpacity="0.75"
        />
        <path d="M44 2 L58 -6 L52 4 Z" fill="#67c090" />
      </g>

      {/* perahu nelayan */}
      <g transform="translate(118 248)">
        <path d="M0 0 C18 -8 42 -8 60 0 L54 10 C36 4 18 4 0 10 Z" fill="#124170" />
        <path d="M30 -18 L32 0" stroke="#215b63" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 -18 L48 -8 L32 0 Z" fill="#67c090" fillOpacity="0.8" />
        <circle cx="22" cy="-4" r="3" fill="#aaffc7" />
      </g>
    </svg>
  )
}
