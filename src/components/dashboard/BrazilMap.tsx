import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CHART_COLORS } from "@/lib/chart-colors";
import { useEtes } from "@/hooks/use-sigsan-data";

export function BrazilMap() {
  const { data: etes } = useEtes();

  const markers = (etes || []).filter((e) => e.latitude && e.longitude);

  return (
    <Card className="border-border h-full elevation-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa de Monitorização Nacional
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="rounded-lg overflow-hidden border border-border" style={{ height: 360 }}>
          <MapContainer
            center={[-14.5, -51.0]}
            zoom={4}
            scrollWheelZoom
            className="h-full w-full"
            style={{ height: "100%", background: "hsl(0, 0%, 98%)" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {markers.map((ete) => (
              <CircleMarker
                key={ete.id}
                center={[ete.latitude!, ete.longitude!]}
                radius={ete.status === "critica" ? 10 : 7}
                pathOptions={{
                  color: ete.status === "critica" ? CHART_COLORS.destructive : CHART_COLORS.success,
                  fillColor: ete.status === "critica" ? CHART_COLORS.destructive : CHART_COLORS.success,
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, minWidth: 180, color: "#1D2D3E" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{ete.nome}</div>
                    <div style={{ color: "#6B7B8D", marginBottom: 8 }}>
                      {ete.cidade}, {ete.uf} — <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{ete.codigo}</span>
                    </div>
                    {ete.entidades && (
                      <div style={{ fontSize: 11, color: "#6B7B8D" }}>
                        Concessionária: <strong>{(ete.entidades as any).nome}</strong>
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
