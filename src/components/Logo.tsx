interface LogoProps {
  size?: number
  variant?: 'default' | 'icon'
}

export default function Logo({ size = 24, variant = 'default' }: LogoProps) {
  // Icon version (transparent background) for use in UI elements
  if (variant === 'icon') {
    return (
      <img 
        src="/bloopicon.png" 
        alt="Bloop"
        style={{
          width: size,
          height: size,
          objectFit: 'contain'
        }}
      />
    )
  }

  // Default: use the PNG image
  return (
    <img 
      src="/blooplogo.png" 
      alt="Bloop"
      style={{
        width: size,
        height: size,
        objectFit: 'contain'
      }}
    />
  )
}
