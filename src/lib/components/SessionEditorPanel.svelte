<script lang="ts">
  import { fade } from 'svelte/transition';
  import NowEditorPanel from './NowEditorPanel.svelte';
  import PlanEditorPanel from './PlanEditorPanel.svelte';
  import type { AiPlanResponse, AiPlanningMode } from '$lib/ai-plan-engine.js';

  let {
    userLevel,
    aiProvider,
    aiApiKey,
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
    aiPlanningMode,
    aiLastResponse,
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
    shareCopyText,
    onTitleInput,
    onPartsInput,
    onPartsKeyDown,
    onCopyPrompt,
    onToggleAiPanel,
    onAiInputChange,
    onSetAiPlanningMode,
    onSetStrictMode,
    onSetHelpfulMode,
    onRunAi,
    onAction,
    onCreateNew,
    onStartTimeInput,
    endTimeValue,
    onEndTimeInput,
    totalMinutesValue,
    onTotalMinutesInput,
    minTotalMinutes,
    onEndModeChange,
    onRevert,
    onToggleTitleHelp,
    onTogglePartsHelp,
    onToggleTimeHelp,
    onToggleSourceHelp,
    onSaveFlow,
    onStartLiveShare,
    onStartSessionShare,
    onStartDayShare,
    onStopActiveShare,
    onStopSessionShare,
    onStopDayShare,
    onCopyActiveShare,
    onCopySessionShare,
    onCopyDayShare,
    activeShareUrl,
    sessionShareUrl,
    dayShareUrl,
    sessionShareDisabled,
    isCopyingActive,
    isCopyingSession,
    isCopyingDay,
    actualHistoryOpen,
    onToggleActualHistory,
    currentSubjectCategory,
    suggestedDuration,
    pendingActualEntries,
    onConfirmActualEntry,
    onDeleteActualEntry,
    onExportActualHistory,
    onApplySuggestedDuration
  }: {
    userLevel: number;
    aiProvider: string;
    aiApiKey: string;
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
    aiPlanningMode: AiPlanningMode;
    aiLastResponse: AiPlanResponse | null;
    aiPlanMode: 'strict' | 'helpful';
    startTimeValue: string;
    endTimeValue: string;
    totalMinutesValue: number;
    minTotalMinutes: number;
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
    showPartsFeedback?: boolean;
    shareCopyText: string;
    activeShareUrl: string;
    sessionShareUrl: string;
    dayShareUrl: string;
    sessionShareDisabled: boolean;
    isCopyingActive: boolean;
    isCopyingSession: boolean;
    isCopyingDay: boolean;
    onTitleInput: (value: string) => void;
    onPartsInput: (value: string) => void;
    onPartsKeyDown: (e: KeyboardEvent) => void;
    onCopyPrompt: () => void;
    onToggleAiPanel: () => void;
    onAiInputChange: (value: string) => void;
    onSetAiPlanningMode: (mode: AiPlanningMode) => void;
    onSetStrictMode: () => void;
    onSetHelpfulMode: () => void;
    onRunAi: () => void;
    onAction: () => void;
    onCreateNew: () => void;
    onStartTimeInput: (value: string) => void;
    onEndTimeInput: (value: string) => void;
    onTotalMinutesInput: (value: number) => void;
    onEndModeChange: (mode: 'end' | 'len') => void;
    onRevert: () => void;
    onToggleTitleHelp: () => void;
    onTogglePartsHelp: () => void;
    onToggleTimeHelp: () => void;
    onToggleSourceHelp: () => void;
    onSaveFlow: () => void;
    onStartLiveShare: () => void;
    onStartSessionShare: () => void;
    onStartDayShare: () => void;
    onStopActiveShare: () => void;
    onStopSessionShare: () => void;
    onStopDayShare: () => void;
    onCopyActiveShare: () => void;
    onCopySessionShare: () => void;
    onCopyDayShare: () => void;
    actualHistoryOpen: boolean;
    onToggleActualHistory: () => void;
    currentSubjectCategory: string;
    suggestedDuration: { minutes: number; sampleSize: number } | null;
    pendingActualEntries: any[];
    onConfirmActualEntry: (id: string) => void;
    onDeleteActualEntry: (id: string) => void;
    onExportActualHistory: () => void;
    onApplySuggestedDuration: (mins: number) => void;
  } = $props();

</script>

{#if mode === 'now'}
  <div in:fade={{ duration: 150 }}>
    <NowEditorPanel
      {userLevel}
      {aiProvider}
      {aiApiKey}
      {hasAiKey}
      {titleValue}
      {partsValue}
      {partsFeedbackText}
      {onTitleInput}
      {onPartsInput}
      {onPartsKeyDown}
      {onAction}
      {actionLabel}
      {activeShareUrl}
      {shareCopyText}
      {isCopyingActive}
      {onCopyActiveShare}
      {onStopActiveShare}
      {onStartLiveShare}
      {onSaveFlow}
      {savedFlowMsg}
      {showTitleHelp}
      {showPartsHelp}
      {onToggleTitleHelp}
      {onTogglePartsHelp}
    />
  </div>
{:else}
  <div in:fade={{ duration: 150 }}>
    <PlanEditorPanel
      {userLevel}
      {aiProvider}
      {aiApiKey}
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
      {aiPlanningMode}
      {aiLastResponse}
      {onSetAiPlanningMode}
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
      {onApplySuggestedDuration}
      {startTimeValue}
      {onStartTimeInput}
      {endTimeValue}
      {onEndTimeInput}
      {totalMinutesValue}
      {onTotalMinutesInput}
      {minTotalMinutes}
      {endMode}
      {onEndModeChange}
      {onToggleTimeHelp}
      {showTimeHelp}
      {timeFeedbackText}
      {onAction}
      {onCreateNew}
      {actionLabel}
      {actionHint}
      {saveStatusLabel}
      {onRevert}
      {canRevert}
      {sessionShareUrl}
      {dayShareUrl}
      {sessionShareDisabled}
      {shareCopyText}
      {isCopyingSession}
      {isCopyingDay}
      {onCopySessionShare}
      {onCopyDayShare}
      {onStopSessionShare}
      {onStopDayShare}
      {onStartSessionShare}
      {onStartDayShare}
      {onSaveFlow}
      {savedFlowMsg}
    />
  </div>
{/if}
