/** The SteelFlow app icon: "SF" in white on steel, with a red-oxide base line. Rendered by next/og. */
export function brandIcon(size: number) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1B232A',
        color: '#FFFFFF',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        borderBottom: `${Math.round(size * 0.07)}px solid #A2412A`,
      }}
    >
      SF
    </div>
  )
}
