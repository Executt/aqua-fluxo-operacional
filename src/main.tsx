import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installCorrelationInterceptor } from "@/lib/correlation";

// Garante x-correlation-id em todas as chamadas (PostgREST, Edge Functions, APIs).
installCorrelationInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
