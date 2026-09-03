import type { ReactNode } from 'react'

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizeClass = {
  sm: 'spinner--sm',
  md: 'spinner--md',
  lg: 'spinner--lg',
} as const

export function Spinner({
  size = 'md',
  label = 'Đang tải',
  className = '',
}: SpinnerProps) {
  return (
    <span
      className={`spinner ${sizeClass[size]} ${className}`.trim()}
      role="status"
      aria-label={label}
    >
      <span className="spinner__ring" aria-hidden />
    </span>
  )
}

type ButtonLabelProps = {
  loading: boolean
  loadingText?: string
  children: ReactNode
}

/** Label + inline spinner for submit buttons. */
export function ButtonLabel({
  loading,
  loadingText,
  children,
}: ButtonLabelProps) {
  if (!loading) return <>{children}</>
  return (
    <span className="btn-label">
      <Spinner size="sm" label={loadingText ?? 'Đang xử lý'} />
      <span>{loadingText ?? children}</span>
    </span>
  )
}
