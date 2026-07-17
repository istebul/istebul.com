# readers/runtime

**Reader Registry Runtime** (PR-101B / EPIC-101).

## Ne yapar?

- Reader kayıt sistemi (`register` / `unregister` / `resolve` / …)
- Metadata ile seçim (mimeType, extension, sourceType, tenant)
- Lookup telemetrisi + `PipelineContext.bag` köprüsü
- Stub `IImportReader` (read → NotImplemented)

## Bu PR’da yok

CSV / Excel / JSON okuma, dosya sistemi, HTTP, AI.

## Kullanım

```ts
import { createReaderRegistryRuntime, createReaderFactory } from './runtime';

const registry = createReaderRegistryRuntime();
registry.register({
  descriptor: {
    id: 'csv-meta',
    name: 'CSV Metadata Reader',
    sourceTypes: ['csv'],
    extensions: ['.csv'],
    mimeTypes: ['text/csv'],
    version: '0.1.0'
  }
});

const factory = createReaderFactory(registry);
const { reader, telemetry } = factory.create({
  sourceType: 'csv',
  extension: '.csv'
});
```
