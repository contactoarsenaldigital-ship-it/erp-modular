// Placeholder de Fase 0. Acá vive, en fases posteriores, el toggle real de
// ModuleConnection (sección 3.10 del diseño): "Conectar Ventas con
// Inventario", etc. Depende de que existan al menos dos módulos de negocio
// activos para tener sentido, así que la UI real se construye en Fase 2
// (cuando Ventas ya puede conectarse con Inventario de la Fase 1).
export default function SettingsPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500 }}>Configuración · Conexiones</h1>
      <p style={{ color: "#666" }}>
        La UI para activar/desactivar conexiones entre módulos (tabla
        <code> ModuleConnection</code>) se construye en la Fase 2, cuando
        haya al menos dos módulos de negocio reales para conectar.
      </p>
    </main>
  );
}
