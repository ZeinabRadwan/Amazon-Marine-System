/**
 * Container – consistent width and horizontal padding for page content.
 * Centers content and applies horizontal padding.
 *
 * Props:
 *   - children: ReactNode
 *   - size: 'sm' | 'md' | 'lg' | 'xl' – max-width and spacing (default: 'lg')
 *   - className: string – optional extra classes
 */
const SIZE_CLASSES = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'w-full',
  xl: 'w-full',
}

export default function Container({
  children,
  size = 'lg',
  className = '',
}) {
  const sizeClasses = SIZE_CLASSES[size] ?? SIZE_CLASSES.lg

  return (
    <div className={`mx-auto w-full py-4 px-8 ${sizeClasses} ${className}`.trim()}>
      {children}
    </div>
  )
}
