import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

// Aspire sets OTEL_EXPORTER_OTLP_ENDPOINT automatically.
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Express v5 uses path-to-regexp v8 which is incompatible with the
      // OTEL Express instrumentation. HTTP instrumentation still captures
      // all inbound/outbound requests.
      "@opentelemetry/instrumentation-express": { enabled: false },
    }),
  ],
});

sdk.start();
