import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const etes = [
  {
    id: "ETE-0482",
    nome: "ETE Barueri",
    cidade: "São Paulo, SP",
    lat: -23.5115,
    lng: -46.8761,
    status: "ok" as const,
    ph: "7.2",
    turbidez: "12 NTU",
    dbo: "25 mg/L",
    temp: "24°C",
  },
  {
    id: "ETE-1204",
    nome: "ETE Arrudas",
    cidade: "Belo Horizonte, MG",
    lat: -19.9042,
    lng: -43.9292,
    status: "ok" as const,
    ph: "7.0",
    turbidez: "18 NTU",
    dbo: "30 mg/L",
    temp: "26°C",
  },
  {
    id: "ETE-0891",
    nome: "ETE Belém",
    cidade: "Curitiba, PR",
    lat: -25.4697,
    lng: -49.2056,
    status: "ok" as const,
    ph: "6.8",
    turbidez: "10 NTU",
    dbo: "22 mg/L",
    temp: "20°C",
  },
  {
    id: "ETE-0327",
    nome: "ETE Jaguaribe",
    cidade: "Salvador, BA",
    lat: -12.9211,
    lng: -38.4312,
    status: "ok" as const,
    ph: "7.4",
    turbidez: "15 NTU",
    dbo: "28 mg/L",
    temp: "29°C",
  },
  {
    id: "ETE-0963",
    nome: "ETE Alegria",
    cidade: "Rio de Janeiro, RJ",
    lat: -22.8628,
    lng: -43.2392,
    status: "critical" as const,
    ph: "8.9",
    turbidez: "55 NTU",
    dbo: "65 mg/L",
    temp: "31°C",
    alerta: "Turbidez acima do limite legal (≤ 40 NTU)",
  },
];

export function BrazilMap() {
  return (
    <Card className="bg-card border-border h-full">
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
            style={{ height: "100%", background: "hsl(222 30% 6%)" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {etes.map((ete) => (
              <CircleMarker
                key={ete.id}
                center={[ete.lat, ete.lng]}
                radius={ete.status === "critical" ? 10 : 7}
                pathOptions={{
                  color: ete.status === "critical" ? "hsl(0 72% 55%)" : "hsl(152 60% 42%)",
                  fillColor: ete.status === "critical" ? "hsl(0 72% 55%)" : "hsl(152 60% 42%)",
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, minWidth: 180, color: "#1a1a2e" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{ete.nome}</div>
                    <div style={{ color: "#555", marginBottom: 8 }}>{ete.cidade} — <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{ete.id}</span></div>
                    {ete.status === "critical" && (
                      <div style={{ background: "#fde8e8", color: "#c0392b", padding: "4px 8px", borderRadius: 4, marginBottom: 8, fontSize: 11, fontWeight: 600 }}>
                        ⚠ {ete.alerta}
                      </div>
                    )}
                    <table style={{ width: "100%", fontSize: 11 }}>
                      <tbody>
                        <tr><td style={{ color: "#888", padding: "2px 0" }}>pH</td><td style={{ fontFamily: "JetBrains Mono", textAlign: "right" }}>{ete.ph}</td></tr>
                        <tr><td style={{ color: "#888", padding: "2px 0" }}>Turbidez</td><td style={{ fontFamily: "JetBrains Mono", textAlign: "right", color: ete.status === "critical" ? "#c0392b" : undefined }}>{ete.turbidez}</td></tr>
                        <tr><td style={{ color: "#888", padding: "2px 0" }}>DBO</td><td style={{ fontFamily: "JetBrains Mono", textAlign: "right" }}>{ete.dbo}</td></tr>
                        <tr><td style={{ color: "#888", padding: "2px 0" }}>Temperatura</td><td style={{ fontFamily: "JetBrains Mono", textAlign: "right" }}>{ete.temp}</td></tr>
                      </tbody>
                    </table>
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
