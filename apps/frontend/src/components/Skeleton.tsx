import type { CSSProperties } from 'react'
import { Spinner } from './Spinner'

type SkeletonProps = {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-block ${className}`.trim()}
      style={style}
      aria-hidden
    />
  )
}

export function RecipeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Đang tải công thức">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton__card skeleton__card--recipe">
          <Skeleton className="skeleton-block--pill" />
          <Skeleton className="skeleton-block--title" />
          <Skeleton className="skeleton-block--line" />
          <Skeleton className="skeleton-block--line skeleton-block--short" />
        </div>
      ))}
    </div>
  )
}

export function RecipeDetailSkeleton() {
  return (
    <div className="skeleton skeleton--detail" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="skeleton-block--back" />
      <Skeleton className="skeleton-block--hero" />
      <Skeleton className="skeleton-block--title" />
      <Skeleton className="skeleton-block--line" />
      <Skeleton className="skeleton-block--line" />
      <Skeleton className="skeleton-block--line skeleton-block--short" />
      <div className="skeleton__section">
        <Skeleton className="skeleton-block--subtitle" />
        <Skeleton className="skeleton-block--line" />
        <Skeleton className="skeleton-block--line" />
        <Skeleton className="skeleton-block--line skeleton-block--short" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="skeleton skeleton--form" aria-busy="true" aria-label="Đang tải hồ sơ">
      <Skeleton className="skeleton-block--title" />
      <Skeleton className="skeleton-block--line skeleton-block--short" />
      <Skeleton className="skeleton-block--field" />
      <Skeleton className="skeleton-block--field skeleton-block--tall" />
      <Skeleton className="skeleton-block--button" />
    </div>
  )
}

export function FormPageSkeleton() {
  return (
    <div className="skeleton skeleton--form" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="skeleton-block--back" />
      <Skeleton className="skeleton-block--title" />
      <Skeleton className="skeleton-block--line skeleton-block--short" />
      <Skeleton className="skeleton-block--field" />
      <Skeleton className="skeleton-block--field skeleton-block--tall" />
      <Skeleton className="skeleton-block--field" />
      <Skeleton className="skeleton-block--button" />
    </div>
  )
}

export function PageSpinner({ label = 'Đang tải' }: { label?: string }) {
  return (
    <div className="page-spinner" role="status" aria-live="polite">
      <Spinner size="lg" label={label} />
      <p className="muted">{label}…</p>
    </div>
  )
}
