---
goal: Hide Dev AST Editor Behind Developer Tools Toggle
version: 1.0
date_created: 2026-01-26
last_updated: 2026-01-26
owner: WhisperSermons Development Team
status: 'Planned'
tags: ['feature', 'ui', 'developer-experience']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan outlines the implementation for making the Dev AST editor mode conditional on the Developer Tools state. Currently, the Editor and Dev AST modes are always visible via tab selectors in the RightPanel. This change will:

1. Hide the editor mode switcher (SegmentedControl) when Developer Tools are closed
2. Show the editor mode switcher only when Developer Tools are opened
3. Automatically shift the editor upward to fill the empty space when the switcher is hidden
4. Maintain the exact same UI/UX when Developer Tools are enabled
5. Default to Editor mode when Developer Tools are disabled

## 1. Requirements & Constraints

**Functional Requirements:**
- **REQ-001**: Dev AST editor mode must only be accessible when Developer Tools are open
- **REQ-002**: Editor mode switcher (SegmentedControl) must be hidden when Developer Tools are closed
- **REQ-003**: When switcher is hidden, the editor must automatically shift upward to fill the space
- **REQ-004**: When Developer Tools are toggled off, the active mode must reset to 'editor'
- **REQ-005**: Keyboard shortcuts (Cmd+1, Cmd+2) must only work when Developer Tools are open
- **REQ-006**: The UI/UX must remain identical to current behavior when Developer Tools are enabled

**Technical Requirements:**
- **REQ-007**: Must detect Developer Tools state in real-time (opened/closed)
- **REQ-008**: Must use Electron's `webContents.isDevToolsOpened()` API for state detection
- **REQ-009**: Must implement IPC communication for DevTools state updates
- **REQ-010**: Must update AppContext to track `isDevToolsOpen` state alongside existing `isDev` flag

**UI/UX Requirements:**
- **REQ-011**: The `.right-panel-view-switcher` element must be conditionally rendered
- **REQ-012**: CSS must handle the vertical spacing automatically (existing flex layout should handle this)
- **REQ-013**: Transition must be seamless with no visual glitches

**Constraints:**
- **CON-001**: Must not break existing keyboard shortcuts or workflow when DevTools are enabled
- **CON-002**: Must not interfere with the unified action bar or document metadata panel
- **CON-003**: Must maintain compatibility with existing undo/redo functionality
- **CON-004**: Production builds (`!app.isPackaged`) must still respect DevTools toggle behavior

**Guidelines:**
- **GUD-001**: Follow existing IPC communication patterns (preload → main → renderer)
- **GUD-002**: Use React hooks for state management (useState, useEffect)
- **GUD-003**: Maintain TypeScript strict mode compliance
- **GUD-004**: Keep code changes minimal and focused

**Patterns to Follow:**
- **PAT-001**: Use Electron's `devtools-opened` and `devtools-closed` events for state tracking
- **PAT-002**: Store DevTools state in AppContext alongside `isDev` flag
- **PAT-003**: Conditional rendering based on `isDevToolsOpen && isDev` boolean combination
- **PAT-004**: Reset `activeMode` to 'editor' when DevTools are closed

## 2. Implementation Steps

### Implementation Phase 1: IPC Infrastructure for DevTools State Tracking

**GOAL-001**: Establish IPC communication to track Developer Tools state in real-time

| Task     | Description                                                                                                                                                                                                                                                                                                        | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-001 | Add `isDevToolsOpen: boolean` field to AppInfo type in `src/shared/types.ts` (around line 213 where app:getInfo response is defined)                                                                                                                                                                              |           |      |
| TASK-002 | Update `app:getInfo` IPC handler in `src/main/ipc/index.ts` (line 213) to include `isDevToolsOpen: getMainWindow()?.webContents.isDevToolsOpened() ?? false`                                                                                                                                                      |           |      |
| TASK-003 | Create new IPC event channel `devtools:stateChanged` in `src/main/index.ts` that fires when DevTools open/close state changes, sending `{ isOpen: boolean }` payload                                                                                                                                              |           |      |
| TASK-004 | Register event listeners in `createWindow()` function in `src/main/index.ts` (after line 221) for `devtools-opened` and `devtools-closed` events on `mainWindow.webContents`, forwarding to renderer via `mainWindow.webContents.send('devtools:stateChanged', { isOpen: true/false })`                           |           |      |
| TASK-005 | Add `onDevToolsStateChanged` method to `contextBridge.exposeInMainWorld('electronAPI', {...})` in `src/preload/index.ts` (around line 100) with signature: `(callback: (isOpen: boolean) => void) => void` that subscribes to `devtools:stateChanged` IPC events and calls cleanup function on unsubscribe        |           |      |
| TASK-006 | Add TypeScript type definition for `onDevToolsStateChanged` to the ElectronAPI interface in `src/renderer/types/electron.ts` (if it exists) or update preload types                                                                                                                                               |           |      |
| TASK-007 | Update `src/renderer/services/electronAPI.ts` to expose the new `onDevToolsStateChanged` wrapper function that calls `window.electronAPI.onDevToolsStateChanged` with fallback for when API is not available                                                                                                      |           |      |

### Implementation Phase 2: AppContext State Management

**GOAL-002**: Track DevTools state in AppContext and make it available to all components

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                     | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-008 | Add `isDevToolsOpen: boolean` state variable to `AppContext.tsx` (around line 81, next to existing `isDev` state) with initial value `false`                                                                                                                                                                                                                                   |           |      |
| TASK-009 | Update the existing `useEffect` that calls `getAppInfo()` (around line 96-100) to also set `setIsDevToolsOpen(info.isDevToolsOpen)` from the AppInfo response                                                                                                                                                                                                                  |           |      |
| TASK-010 | Add new `useEffect` hook in AppContext (after line 100) that subscribes to DevTools state changes using `window.electronAPI.onDevToolsStateChanged((isOpen) => setIsDevToolsOpen(isOpen))`, with cleanup function to unsubscribe on unmount                                                                                                                                    |           |      |
| TASK-011 | Add `isDevToolsOpen` to the TranscriptionContextValue interface in `src/renderer/contexts/types.ts` (around line 60, where `isDev` is defined)                                                                                                                                                                                                                                 |           |      |
| TASK-012 | Add `isDevToolsOpen` to the AppContext provider value in `AppContext.tsx` (around line 659 and 681 where `isDev` is already provided)                                                                                                                                                                                                                                          |           |      |

### Implementation Phase 3: RightPanel Conditional Rendering Logic

**GOAL-003**: Implement conditional rendering of editor mode switcher and automatic mode reset

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-013 | Extract `isDevToolsOpen` from `useAppTranscription()` hook in `RightPanel.tsx` (around line 362, alongside existing `isDev`)                                                                                                                                                                                                                                                                              |           |      |
| TASK-014 | Update the conditional rendering check for `.right-panel-view-switcher` div in `RightPanel.tsx` (line 283) from `{isDev && (...)}` to `{isDev && isDevToolsOpen && (...)}`                                                                                                                                                                                                                                |           |      |
| TASK-015 | Add `useEffect` hook in `RightPanelContent` component (after line 373) that watches `isDevToolsOpen` and resets `activeMode` to `'editor'` when DevTools are closed: `useEffect(() => { if (!isDevToolsOpen && activeMode === 'ast') { setActiveMode('editor'); } }, [isDevToolsOpen, activeMode]);`                                                                                                       |           |      |
| TASK-016 | Update the keyboard shortcuts `useEffect` hook (around line 376-405) to only register shortcuts when both `isDev && isDevToolsOpen` are true - change the condition from `if (typeof window === 'undefined' \|\| !window.document \|\| !isDev) return;` to `if (typeof window === 'undefined' \|\| !window.document \|\| !isDev \|\| !isDevToolsOpen) return;`                                           |           |      |
| TASK-017 | Add `isDevToolsOpen` to the dependency array of the keyboard shortcuts useEffect (line 405) so shortcuts are re-registered when DevTools state changes                                                                                                                                                                                                                                                    |           |      |

### Implementation Phase 4: CSS Adjustments & Testing

**GOAL-004**: Verify CSS layout handles switcher visibility correctly and test edge cases

| Task     | Description                                                                                                                                                                                                                                                                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-018 | Verify that existing CSS in `RightPanel.css` (specifically `.right-panel-view-switcher` styles around line 50-58) already has `flex-shrink: 0` which prevents layout issues when element is removed                                                                                                                             |           |      |
| TASK-019 | Test in development mode: Verify that Dev AST tab is hidden when DevTools are closed, and appears when opened via View → Toggle Developer Tools menu                                                                                                                                                                            |           |      |
| TASK-020 | Test mode switching: Start with Dev AST mode active, close DevTools, verify it automatically switches to Editor mode                                                                                                                                                                                                            |           |      |
| TASK-021 | Test keyboard shortcuts: Verify Cmd+1 and Cmd+2 only work when DevTools are open, and do nothing when closed                                                                                                                                                                                                                    |           |      |
| TASK-022 | Test production build behavior: Create production build and verify that DevTools toggle still controls AST editor visibility (even though `isDev` would be false in production, the feature should still work if DevTools are manually opened)                                                                                  |           |      |
| TASK-023 | Test with different window sizes: Verify the editor content area properly fills the space previously occupied by the switcher when it's hidden, with no awkward gaps or layout shifts                                                                                                                                           |           |      |
| TASK-024 | Test undo/redo functionality: Verify that closing DevTools while in Dev AST mode with pending undo/redo operations doesn't cause state corruption - the mode switch should be seamless                                                                                                                                          |           |      |

### Implementation Phase 5: Documentation & Cleanup

**GOAL-005**: Update documentation and code comments to reflect new DevTools-gated behavior

| Task     | Description                                                                                                                                                                                                                                                                         | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-025 | Update JSDoc comment for `RightPanelContent` component in `RightPanel.tsx` (around line 150) to document that Dev AST mode is only available when Developer Tools are open                                                                                                         |           |      |
| TASK-026 | Update code comment above the keyboard shortcuts useEffect (line 388) to mention "only in dev mode AND when DevTools are open"                                                                                                                                                     |           |      |
| TASK-027 | Add comment in AppContext above the DevTools state change subscription explaining: "Track DevTools open/close state to conditionally show Dev AST editor mode"                                                                                                                     |           |      |
| TASK-028 | Update `.github/copilot-instructions.md` to document that Dev AST mode is now conditional on Developer Tools being open, not just `isDev` flag                                                                                                                                     |           |      |
| TASK-029 | If user-facing documentation exists (README.md, etc.), add a note that the Dev AST editor is only accessible via View → Toggle Developer Tools                                                                                                                                     |           |      |

## 3. Alternatives

**ALT-001**: **User preference setting** - Add a settings toggle to show/hide Dev AST mode instead of tying it to DevTools state
- **Rejected Reason**: Adds unnecessary UI complexity for a developer-only feature. DevTools toggle is more semantic and reduces settings clutter.

**ALT-002**: **Command palette / keyboard shortcut only** - Remove tab switcher entirely and only allow Dev AST access via hidden keyboard shortcut
- **Rejected Reason**: Less discoverable for developers who don't know the shortcut. Tab UI is valuable when DevTools are intentionally opened.

**ALT-003**: **Environment variable flag** - Control Dev AST visibility via environment variable instead of runtime DevTools state
- **Rejected Reason**: Requires restart to change, not dynamic. DevTools toggle is already built into Electron and provides better UX.

**ALT-004**: **Separate window for Dev AST** - Open Dev AST in a new window instead of a tab
- **Rejected Reason**: Breaks continuity with existing UI patterns, adds window management complexity, and makes it harder to compare editor and AST views.

## 4. Dependencies

**DEP-001**: Electron `webContents.isDevToolsOpened()` API - Must be available in the Electron version used (should be available in Electron 5+, currently using much newer version)

**DEP-002**: Existing `isDev` flag infrastructure - The DevTools state check should work **in conjunction with** `isDev`, not replace it (i.e., `isDev && isDevToolsOpen` for full gate)

**DEP-003**: IPC communication patterns established in `src/preload/index.ts` and `src/main/ipc/index.ts` - Must follow existing patterns

**DEP-004**: AppContext provider structure - New state must be added without breaking existing context consumers

**DEP-005**: No external npm packages required - Implementation uses only built-in Electron and React APIs

## 5. Files

**FILE-001**: `src/shared/types.ts` - Add `isDevToolsOpen` field to AppInfo interface

**FILE-002**: `src/main/ipc/index.ts` - Update `app:getInfo` handler to include DevTools state

**FILE-003**: `src/main/index.ts` - Register DevTools event listeners and create IPC sender

**FILE-004**: `src/preload/index.ts` - Expose `onDevToolsStateChanged` IPC event subscription

**FILE-005**: `src/renderer/services/electronAPI.ts` - Add wrapper for DevTools state subscription

**FILE-006**: `src/renderer/contexts/types.ts` - Add `isDevToolsOpen` to context interface

**FILE-007**: `src/renderer/contexts/AppContext.tsx` - Track DevTools state and provide to consumers

**FILE-008**: `src/renderer/components/layout/RightPanel/RightPanel.tsx` - Conditional rendering and mode reset logic

**FILE-009**: `src/renderer/types/electron.ts` (if exists) - TypeScript definitions for new API

**FILE-010**: `.github/copilot-instructions.md` - Documentation updates

## 6. Testing

**TEST-001**: **DevTools state initialization** - On app launch, verify `isDevToolsOpen` correctly reflects initial DevTools state (should be `false` in production, `true` in dev due to auto-open)

**TEST-002**: **Real-time state tracking** - Open and close DevTools multiple times, verify `isDevToolsOpen` state updates immediately each time

**TEST-003**: **Switcher visibility toggle** - Verify SegmentedControl appears/disappears correctly when DevTools are toggled

**TEST-004**: **Automatic mode reset** - Set active mode to 'ast', close DevTools, verify mode automatically switches to 'editor' and Dev AST panel is replaced with QuoteAwareSermonEditor

**TEST-005**: **Keyboard shortcut gating** - With DevTools closed, press Cmd+2, verify nothing happens. Open DevTools, press Cmd+2, verify it switches to Dev AST mode.

**TEST-006**: **Keyboard shortcut Cmd+1** - Verify Cmd+1 always works when DevTools are open, switching back to Editor mode

**TEST-007**: **Production build behavior** - Build production version, manually open DevTools via menu, verify Dev AST mode becomes available

**TEST-008**: **Layout flow** - Verify no visual jumps or layout shifts when switcher appears/disappears - the editor should smoothly fill the space

**TEST-009**: **State persistence across DevTools toggles** - If user is editing in Editor mode, close/open DevTools, verify content and edit state are preserved

**TEST-010**: **Undo/redo stack integrity** - Perform edits in Dev AST mode, close DevTools (forcing mode switch), verify undo/redo still work correctly

**TEST-011**: **Quote review panel interaction** - With quote review panel open, toggle DevTools, verify panel remains functional and layout doesn't break

**TEST-012**: **Window resize during transition** - Resize window while DevTools state is changing, verify layout remains stable

## 7. Risks & Assumptions

**RISK-001**: **DevTools event listener memory leaks** - If event listeners for `devtools-opened`/`devtools-closed` are not properly cleaned up
- **Mitigation**: Use proper cleanup in React useEffect hooks and ensure IPC event listeners are removed on component unmount

**RISK-002**: **Race condition on app startup** - DevTools state might be queried before event listeners are registered, causing initial state to be incorrect
- **Mitigation**: Call `app:getInfo` immediately on AppContext mount to get initial state, then subscribe to changes

**RISK-003**: **Production users manually opening DevTools** - Users might discover the hidden Dev AST mode by opening DevTools
- **Mitigation**: This is acceptable behavior - if a user knows how to open DevTools, they're likely technical enough to use Dev AST safely

**RISK-004**: **Keyboard shortcut conflicts** - Other Electron/browser shortcuts might interfere with Cmd+1/Cmd+2
- **Mitigation**: Existing code already handles this, no new risk introduced

**RISK-005**: **CSS layout assumptions** - Removing the switcher element might expose layout bugs if CSS doesn't handle missing elements gracefully
- **Mitigation**: The current flex layout with `flex-shrink: 0` should handle this correctly; thorough testing in TASK-023 will verify

**ASSUMPTION-001**: Developer Tools state is binary (open/closed) - No intermediate states like "docked" vs "undocked"
- **Validation**: Electron's `isDevToolsOpened()` returns boolean, so this is safe

**ASSUMPTION-002**: Users who want Dev AST mode will know to open Developer Tools
- **Validation**: This is a developer-facing feature; documenting it in dev docs is sufficient

**ASSUMPTION-003**: The `isDev` flag (based on `app.isPackaged`) should still gate Dev AST mode alongside DevTools state
- **Validation**: Using `isDev && isDevToolsOpen` ensures Dev AST is never exposed in production builds unless DevTools are explicitly opened

**ASSUMPTION-004**: Switching from 'ast' to 'editor' mode programmatically is safe and won't corrupt document state
- **Validation**: This already happens via keyboard shortcuts and tab clicks, so it's a tested code path

## 8. Related Specifications / Further Reading

- **Electron DevTools Documentation**: https://www.electronjs.org/docs/latest/tutorial/devtools-extension
- **Electron webContents API**: https://www.electronjs.org/docs/latest/api/web-contents#contentsisdevtoolsopened
- **WhisperSermons Architecture Doc**: `.github/copilot-instructions.md` - Section on "React Patterns" and "Context Architecture"
- **Document Model Instructions**: `.github/document-model-instructions.md` - Understanding AST state management
- **Related Component**: `src/renderer/components/layout/RightPanel/UnifiedEditorActions.tsx` - Unified action bar shared between modes
- **Related Context**: `src/renderer/contexts/AppContext.tsx` - Central state management
