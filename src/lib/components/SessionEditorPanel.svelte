<script lang="ts">
  import NowEditorPanel from './NowEditorPanel.svelte';
  import PlanEditorPanel from './PlanEditorPanel.svelte';

  let {
    mode,
    hasSelection,
    savedFlowMsg,
    titleValue,
    partsValue,
    copyBtnText,
    partsFeedbackText,
    timeFeedbackText,
    hasAiKey,
    aiPanelOpen,
    aiInput,
    aiError,
    aiLoading,
    aiPlanMode,
    startTimeValue,
    endMode,
    actionLabel,
    actionHint,
    saveStatusLabel,
    canRevert,
    showTitleHelp,
    showPartsHelp,
    showTimeHelp,
    targetDateLabel,
    sourceLabel,
    sourceHelp,
    showSourceHelp,
    shareToken,
    shareMode,
    shareCopyText,
    shareUrl,
    onTitleInput,
    onPartsInput,
    onPartsKeyDown,
    onCopyPrompt,
    onToggleAiPanel,
    onAiInputChange,
    onSetStrictMode,
    onSetHelpfulMode,
    onRunAi,
    onAction,
    onStartTimeInput,
    onEndModeChange,
    onEndControlMount,
    onRevert,
    onToggleTitleHelp,
    onTogglePartsHelp,
    onToggleTimeHelp,
    onToggleSourceHelp,
    onCopyShareLink,
    onStopSharing,
    onStartLiveShare,
    onSaveFlow,
    onStartSessionShare,
    onStartDayShare,
    actualHistoryOpen,
    onToggleActualHistory,
    currentSubjectCategory,
    suggestedDuration,
    pendingActualEntries,
    onConfirmActualEntry,
    onDeleteActualEntry,
    onExportActualHistory
  }: {
    mode: 'now' | 'plan';
    hasSelection: boolean;
    savedFlowMsg: string;
    titleValue: string;
    partsValue: string;
    copyBtnText: string;
    partsFeedbackText: string;
    timeFeedbackText: string;
    hasAiKey: boolean;
    aiPanelOpen: boolean;
    aiInput: string;
    aiError: string;
    aiLoading: boolean;
    aiPlanMode: 'strict' | 'helpful';
    startTimeValue: string;
    endMode: 'end' | 'len';
    actionLabel: string;
    actionHint: string;
    saveStatusLabel: string;
    canRevert: boolean;
    showTitleHelp: boolean;
    showPartsHelp: boolean;
    showTimeHelp: boolean;
    targetDateLabel: string;
    sourceLabel: string;
    sourceHelp: string;
    showSourceHelp: boolean;
    shareToken: string;
    shareMode: 'active-session-live' | 'selected-session-snapshot' | 'selected-day-snapshot' | null;
    shareCopyText: string;
    shareUrl: string;
    onTitleInput: (value: string) => void;
    onPartsInput: (value: string) => void;
    onPartsKeyDown: (e: KeyboardEvent) => void;
    onCopyPrompt: () => void;
    onToggleAiPanel: () => void;
    onAiInputChange: (value: string) => void;
    onSetStrictMode: () => void;
    onSetHelpfulMode: () => void;
    onRunAi: () => void;
    onAction: () => void;
    onStartTimeInput: (value: string) => void;
    onEndModeChange: (mode: 'end' | 'len') => void;
    onEndControlMount: (node: HTMLElement | null) => void;
    onRevert: () => void;
    onToggleTitleHelp: () => void;
    onTogglePartsHelp: () => void;
    onToggleTimeHelp: () => void;
    onToggleSourceHelp: () => void;
    onCopyShareLink: () => void;
    onStopSharing: () => void;
    onStartLiveShare: () => void;
    onSaveFlow: () => void;
    onStartSessionShare: () => void;
    onStartDayShare: () => void;
    actualHistoryOpen: boolean;
    onToggleActualHistory: () => void;
    currentSubjectCategory: string;
    suggestedDuration: { minutes: number; sampleSize: number } | null;
    pendingActualEntries: any[];
    onConfirmActualEntry: (id: string) => void;
    onDeleteActualEntry: (id: string) => void;
    onExportActualHistory: () => void;
  } = $props();

  const shareSummary = $derived.by(() => {
    if (shareMode === 'active-session-live') return 'Aktiv session delas live.';
    if (shareMode === 'selected-day-snapshot') return 'Vald dag delas som snapshot.';
    if (shareMode === 'selected-session-snapshot') return 'Vald session delas som snapshot.';
    return '';
  });

  const shareModeLabel = $derived.by(() => {
    if (shareMode === 'active-session-live') return 'Live';
    if (shareMode === 'selected-day-snapshot') return 'Dag';
    if (shareMode === 'selected-session-snapshot') return 'Pass';
    return '';
  });
</script>

{#if mode === 'now'}
  <NowEditorPanel
    {titleValue}
    {partsValue}
    {partsFeedbackText}
    {onTitleInput}
    {onPartsInput}
    {onPartsKeyDown}
    {onAction}
    {actionLabel}
    {shareToken}
    {shareUrl}
    {shareModeLabel}
    {shareCopyText}
    {shareSummary}
    {onCopyShareLink}
    {onStopSharing}
    {onStartLiveShare}
    {onSaveFlow}
    {savedFlowMsg}
    {showTitleHelp}
    {showPartsHelp}
    {onToggleTitleHelp}
    {onTogglePartsHelp}
  />
{:else}
  <PlanEditorPanel
    {hasSelection}
    {targetDateLabel}
    {sourceLabel}
    {sourceHelp}
    {showSourceHelp}
    {onToggleSourceHelp}
    {titleValue}
    {onTitleInput}
    {showTitleHelp}
    {onToggleTitleHelp}
    {partsValue}
    {onPartsInput}
    {onPartsKeyDown}
    {partsFeedbackText}
    {onCopyPrompt}
    {copyBtnText}
    {showPartsHelp}
    {onTogglePartsHelp}
    {hasAiKey}
    {aiPanelOpen}
    {onToggleAiPanel}
    {aiInput}
    {onAiInputChange}
    {aiPlanMode}
    {onSetStrictMode}
    {onSetHelpfulMode}
    {aiError}
    {onRunAi}
    {aiLoading}
    {actualHistoryOpen}
    {onToggleActualHistory}
    {currentSubjectCategory}
    {suggestedDuration}
    {pendingActualEntries}
    {onConfirmActualEntry}
    {onDeleteActualEntry}
    {onExportActualHistory}
    {startTimeValue}
    {onStartTimeInput}
    {endMode}
    {onEndModeChange}
    {onToggleTimeHelp}
    {showTimeHelp}
    {timeFeedbackText}
    {onAction}
    {actionLabel}
    {actionHint}
    {saveStatusLabel}
    {onRevert}
    {canRevert}
    {shareToken}
    {shareUrl}
    {shareModeLabel}
    {shareCopyText}
    {shareSummary}
    {onCopyShareLink}
    {onStopSharing}
    {onStartSessionShare}
    {onStartDayShare}
    {onEndControlMount}
  />
{/if}
