---
goal: Enforce sermon-only processing and remove non-sermon paths
version: 1.0
date_created: 2026-01-26
last_updated: 2026-01-26
owner: Core App Team
status: Planned
tags: [feature, refactor, cleanup, ui, ipc, python]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan enforces sermon-only transcription across the app by removing the "Process as sermon" checkbox and deprecating all non-sermon processing and related views. It also cleans up types, IPC, UI routes, and history handling, ensuring no code paths remain that assume a non-sermon mode, while maintaining stability and backward compatibility for persisted data.

## 1. Requirements & Constraints

- **REQ-001**: Always process transcriptions as sermons (no user toggle).
- **REQ-002**: Remove the "Process as sermon" checkbox from settings UI.
- **REQ-003**: Remove the non-sermon transcription view and all references.
- **REQ-004**: Eliminate the `processAsSermon` option from types, IPC contracts, and pipelines.
- **REQ-005**: Maintain app stability and avoid breaking existing projects/history.
- **REQ-006**: Migrate or safely ignore previously saved non-sermon items.
- **SEC-001**: Preserve Electron context isolation and typed IPC patterns.
- **CON-001**: Do not introduce regressions to AST ↔ TipTap sync.
- **CON-002**: Do not change file/folder structure unless necessary.
- **GUD-001**: Follow feature-driven architecture and strict TS rules.
- **PAT-001**: Use Python event-based progress and existing AST pipeline.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Identify and remove sermon toggle usage and non-sermon code paths.

| Task     | Description                                                                                                                            | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Locate settings component rendering the checkbox by searching for the label `Process as sermon` (case-insensitive).                    |           |      |
| TASK-002 | Locate all code references to `processAsSermon`, `sermon`, `non-sermon`, `raw transcript` across TS/TSX/TS in renderer/main/shared.   |           |      |
| TASK-003 | Inventory non-sermon view files by searching for keywords: `RawTranscription`, `NonSermon`, `transcription view` in renderer.         |           |      |

### Implementation Phase 2

- GOAL-002: Enforce sermon-only processing in backend (main + Python) and remove branches.

| Task     | Description                                                                                                                                                                                                                     | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-004 | In `src/main/services/python-whisper.ts` and/or `src/main/services/whisper.ts`, remove option passing for non-sermon; ensure spawn args always invoke sermon pipeline (e.g., drop flags and set default behavior to sermon).      |           |      |
| TASK-005 | In `src/python/main.py`, set sermon mode default to True; delete conditional non-sermon branches; always run: transcribe → bible_quote_processor → ast_builder; keep progress events unchanged.                                   |           |      |
| TASK-006 | In `src/python/whisper_bridge.py` (if applicable), remove any parameters related to non-sermon processing.                                                                                                                      |           |      |

### Implementation Phase 3

- GOAL-003: Remove UI toggle and non-sermon views/routes; simplify renderer logic.

| Task     | Description                                                                                                                                                              | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-007 | Remove checkbox from settings component (likely `src/renderer/features/settings/components/TranscriptionSettings.tsx`); delete local state/props and any context wiring. |           |      |
| TASK-008 | Delete non-sermon transcription view component(s) (e.g., `RawTranscriptionView.tsx`); remove exports and references from barrels.                                       |           |      |
| TASK-009 | Update routing/menu (e.g., `src/renderer/App.tsx` or feature router) to remove route(s) pointing to non-sermon view(s).                                                  |           |      |

### Implementation Phase 4

- GOAL-004: Remove option from types and IPC; consolidate to sermon-only types.

| Task     | Description                                                                                                                                                                                             | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-010 | Remove `processAsSermon` from `src/shared/types.ts` and any settings types in `src/renderer/types/` or feature types; adjust all call sites.                                                             |           |      |
| TASK-011 | Update preload and main IPC: remove `processAsSermon` from request payloads and response types (`src/preload/index.ts`, `src/main/ipc/index.ts`, `src/renderer/services/electronAPI.ts`).               |           |      |
| TASK-012 | Update queue item/builders to no longer accept that flag (e.g., `useBatchQueue.ts`, transcription services).                                                                                              |           |      |

### Implementation Phase 5

- GOAL-005: Data migration for history; hide or normalize legacy non-sermon entries.

| Task     | Description                                                                                                                                                                                                                                     | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-013 | In `src/renderer/features/history/hooks/useHistory.ts`, on load, detect items marked as non-sermon; either set a `isLegacyNonSermon: true` flag or filter them from default views without deleting storage.                                    |           |      |
| TASK-014 | Ensure UI never offers navigation to a non-sermon view; where referenced, show a toast or inline note indicating legacy items are hidden and can be exported from storage (optional, if UI element exists).                                     |           |      |

### Implementation Phase 6

- GOAL-006: Compile, test, and document changes.

| Task     | Description                                                                                              | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-015 | Run `npm run typecheck` and fix type errors due to removed types and props.                              |           |      |
| TASK-016 | Update/adjust unit tests in renderer/main/python integration tests if present (Vitest).                  |           |      |
| TASK-017 | Update `README.md` and any docs under `src/docs/` to remove toggle references; add CHANGELOG entry.      |           |      |
| TASK-018 | Manual QA: `npm run electron:dev`, run a transcription, verify sermon pipeline and AST editor behavior. |           |      |

## 3. Alternatives

- **ALT-001**: Hide the checkbox but keep non-sermon code paths dormant. Rejected: increases maintenance and risk of dead code.
- **ALT-002**: Feature-flag sermon-only behavior. Rejected: requirement is unconditional; complexity not justified.

## 4. Dependencies

- **DEP-001**: Python environment availability; existing Whisper/Bible pipeline assets remain unchanged.
- **DEP-002**: TipTap + AST integration stays intact; no changes to editor extensions needed.

## 5. Files

- **FILE-001**: src/renderer/features/settings/components/TranscriptionSettings.tsx (remove checkbox)
- **FILE-002**: src/renderer/features/transcription/hooks/useBatchQueue.ts (remove flag from queue items)
- **FILE-003**: src/renderer/App.tsx or feature router (remove non-sermon routes)
- **FILE-004**: src/renderer/features/transcription/views/RawTranscriptionView.tsx (delete, if present)
- **FILE-005**: src/renderer/services/electronAPI.ts (remove flag from API)
- **FILE-006**: src/preload/index.ts (remove flag from IPC exposure)
- **FILE-007**: src/main/ipc/index.ts (remove flag from handlers)
- **FILE-008**: src/main/services/python-whisper.ts and/or src/main/services/whisper.ts (enforce sermon-only)
- **FILE-009**: src/python/main.py (remove non-sermon branches)
- **FILE-010**: src/python/whisper_bridge.py (clean args, if used)
- **FILE-011**: src/shared/types.ts (remove `processAsSermon`)
- **FILE-012**: src/renderer/features/history/hooks/useHistory.ts (migrate legacy items)
- Additional: any file containing `processAsSermon` or strings `Process as sermon`, `non-sermon`, `RawTranscription`.

## 6. Testing

- **TEST-001**: Unit test: settings rendering no longer shows the toggle; snapshot update for settings panel.
- **TEST-002**: Integration: transcription start payload to IPC contains no `processAsSermon` and succeeds.
- **TEST-003**: Integration: renderer displays sermon AST editor as the only transcription view.
- **TEST-004**: History: legacy non-sermon items are ignored/hidden without runtime errors.
- **TEST-005**: Python: end-to-end invocation emits progress and produces AST consistently.

## 7. Risks & Assumptions

- **RISK-001**: Unknown file names for the settings component; mitigated via deterministic search tasks (Phase 1).
- **RISK-002**: Persisted history may reference removed routes; mitigated by guarding UI and filtering.
- **RISK-003**: IPC contract change can break older code paths; mitigated by updating all wrappers consistently.
- **ASSUMPTION-001**: Non-sermon pipeline is not required by any other hidden feature.
- **ASSUMPTION-002**: Sermon pipeline already stable and used widely.

## 8. Related Specifications / Further Reading

- [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- [.github/document-model-instructions.md](../.github/document-model-instructions.md)
- TipTap/AST sync notes (see AppContext debounce and mapping sections in the above docs)
