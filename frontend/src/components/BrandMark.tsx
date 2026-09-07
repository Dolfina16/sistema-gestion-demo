// Isotipo de la app. Marca genérica propia (no la de ningún cliente): se dibuja
// en `currentColor`, así hereda el color del contenedor —blanco sobre el AppBar,
// terracota sobre el fondo del login— sin necesidad de dos archivos de imagen.
export default function BrandMark({ size = 54 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 52"
      width={size}
      height={size}
      role="img"
      aria-label="Residencia"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* techo a dos aguas */}
      <path d="M6 25 L32 5 L58 25" />
      {/* muros laterales */}
      <path d="M12 24 V46" />
      <path d="M52 24 V46" />
      {/* línea de piso */}
      <path d="M4 46 H60" />
      {/* portal con arco */}
      <path d="M26 46 V34 a6 6 0 0 1 12 0 V46" />
      {/* ventanas */}
      <rect x="16.5" y="29" width="7" height="7" />
      <rect x="40.5" y="29" width="7" height="7" />
    </svg>
  )
}
