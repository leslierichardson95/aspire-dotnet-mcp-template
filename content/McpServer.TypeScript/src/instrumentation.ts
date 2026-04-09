import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import * as grpc from "@grpc/grpc-js";
import * as fs from "fs";
import * as path from "path";

// Build gRPC credentials that trust Aspire's self-signed CA certs.
// Aspire sets SSL_CERT_DIR with PEM files. @grpc/grpc-js does NOT honor
// NODE_TLS_REJECT_UNAUTHORIZED, so we must load the certs explicitly.
// Important: grpc-js can fail when multiple root CAs are concatenated,
// so we find the correct cert by probing each one.
function getCredentials(): grpc.ChannelCredentials {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint?.startsWith("https://")) {
    return grpc.credentials.createInsecure();
  }

  const certDir = process.env.SSL_CERT_DIR;
  if (!certDir || !fs.existsSync(certDir)) {
    console.log("[OTEL] No SSL_CERT_DIR, cannot verify OTLP TLS");
    return grpc.credentials.createInsecure();
  }

  // Read only .pem files (not .0/.1 OpenSSL hash duplicates).
  const pemFiles = fs.readdirSync(certDir).filter(f => f.endsWith(".pem"));
  console.log(`[OTEL] Found ${pemFiles.length} cert(s) in ${certDir}`);

  // The private/ dir alongside certs/ contains the resource's own cert.
  // That cert's CA is the one that signed the OTLP endpoint cert too.
  const privateDir = path.join(certDir, "..", "private");
  if (fs.existsSync(privateDir)) {
    const privateFiles = fs.readdirSync(privateDir);
    for (const pf of privateFiles) {
      // Match by hash prefix (filename without extension)
      const hash = path.parse(pf).name;
      const matching = pemFiles.find(f => f.startsWith(hash));
      if (matching) {
        const cert = fs.readFileSync(path.join(certDir, matching));
        console.log(`[OTEL] Using cert ${matching} (matches private key)`);
        return grpc.credentials.createSsl(cert);
      }
    }
  }

  // Fallback: try each cert individually.
  for (const f of pemFiles) {
    const cert = fs.readFileSync(path.join(certDir, f));
    console.log(`[OTEL] Trying cert ${f}`);
    return grpc.credentials.createSsl(cert);
  }

  return grpc.credentials.createInsecure();
}

const credentials = getCredentials();

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ credentials }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ credentials }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ credentials }),
  ),
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
console.log("[OTEL] SDK started");

// NOTE: console.log() output appears in Aspire's Console Logs but NOT in
// Structured Logs. To get structured logs in the dashboard, use a logging
// library like winston or pino — OpenTelemetry auto-instruments those.
// See: https://opentelemetry.io/docs/languages/js/instrumentation/#logs
