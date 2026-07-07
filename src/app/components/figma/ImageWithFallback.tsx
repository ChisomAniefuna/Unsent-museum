import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

const MAX_RETRIES = 2

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [retries, setRetries] = useState(0)

  const { src, alt, style, className, ...rest } = props

  const handleError = () => {
    if (retries < MAX_RETRIES) {
      setRetries((r) => r + 1)
    }
  }

  if (retries >= MAX_RETRIES) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    )
  }

  const retrySrc = retries > 0 && src ? `${src}${src.includes('?') ? '&' : '?'}_r=${retries}` : src

  return (
    <img src={retrySrc} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}
