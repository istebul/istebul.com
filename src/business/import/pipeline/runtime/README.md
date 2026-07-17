# pipeline/runtime

Import Pipeline **Runtime Orchestrator** (PR-101A / EPIC-101).

## Ne yapar?

- Foundation `IMPORT_PIPELINE_STAGES` sırasını yürütür
- `IImportPipeline.run()` uygular
- Aşama sürelerini ölçer (`StageExecution.durationMs`)
- Uygulanmayan aşamalar `not-implemented` / `NOT_IMPLEMENTED` döner
- Gerçek CSV/Excel okuma **yoktur**

## Ana tipler

| Tip | Rol |
|-----|-----|
| `PipelineContext` | Runtime bağlam + bag |
| `PipelineResult` | ImportResult + aşama telemetrisi |
| `StageExecution` | Tek aşama kaydı |

## Kullanım

```ts
import { createImportPipelineRuntime } from './runtime';

const runtime = createImportPipelineRuntime();
const result = await runtime.run(request);
const detailed = await runtime.runWithDetails(request);
```
