import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          background: '#064e3b',
        }}
      >
        <svg width="116" height="116" viewBox="0 0 64 64" fill="none">
          <path
            d="M47.7 14.5C31.3 14.1 18 19.6 15.4 31.2c-1.6 7.3 3.8 12.6 10.2 11.1 11.4-2.7 18.1-15.7 22.1-27.8Z"
            fill="#34d399"
          />
          <path
            d="M13.5 51c6.9-12.5 15-20.6 27.1-28.4"
            stroke="#d1fae5"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
      </div>
    ),
    size,
  )
}
