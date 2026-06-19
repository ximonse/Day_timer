<script lang="ts">
  import { fade } from 'svelte/transition';
  import NowEditorPanel from './NowEditorPanel.svelte';
  import PlanEditorPanel from './PlanEditorPanel.svelte';
  import type { AiAgendaPromptMode, AiFlexibilityLevel, AiPlanResponse } from '$lib/ai-plan-engine.js';

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
    planShareOpen,
    nowMainOpen,
    nowQuickStartOpen,
    nowShareOpen,
    aiInput,
    aiError,
    aiQuestionText,
    aiLoading,
    aiPromptMode,
    aiLastResponse,
    startTimeValue,
    endMode,
    actionLabel,
    actionHint,
    saveStatusLabel,
    canRevert,
    showTitleHelp,
    showPartsHelp,
    targetDateLabel,
    sourceLabel,
    sourceHelp,
    shareCopyText,
    onTitleInput,
    onPartsInput,
    onPartsKeyDown,
    onCopyPrompt,
    onToggleAiPanel,
    onTogglePlanShare,
    onToggleNowMain,
    onToggleNowQuickStart,
    onToggleNowShare,
    onAiInputChange,
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
    onSaveFlow,
    onStartLiveShare,
    quickStartTitle,
    quickStartText,
    onQuickStartTitleInput,
    onQuickStartTextInput,
    onQuickStart,
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
    suggestedDuration,
    onApplySuggestedDuration,
    onRunAiWithText,
    whisperApiKey = '',
    aiFlexibilityLevel = 2,
    onFlexibilityChange = () => {}
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
    planShareOpen: boolean;
    nowMainOpen: boolean;
    nowQuickStartOpen: boolean;
    nowShareOpen: boolean;
    aiInput: string;
    aiError: string;
    aiQuestionText: string;
    aiLoading: boolean;
    aiPromptMode: AiAgendaPromptMode;
    aiLastResponse: AiPlanResponse | null;
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
    targetDateLabel: string;
    sourceLabel: string;
    sourceHelp: string;
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
    onTogglePlanShare: () => void;
    onToggleNowMain: () => void;
    onToggleNowQuickStart: () => void;
    onToggleNowShare: () => void;
    onAiInputChange: (value: string) => void;
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
    onSaveFlow: () => void;
    quickStartTitle: string;
    quickStartText: string;
    onQuickStartTitleInput: (value: string) => void;
    onQuickStartTextInput: (value: string) => void;
    onQuickStart: () => void;
    onStartLiveShare: () => void;
    onStartSessionShare: () => void;
    onStartDayShare: () => void;
    onStopActiveShare: () => void;
    onStopSessionShare: () => void;
    onStopDayShare: () => void;
    onCopyActiveShare: () => void;
    onCopySessionShare: () => void;
    onCopyDayShare: () => void;
    suggestedDuration: { minutes: number; sampleSize: number } | null;
    onApplySuggestedDuration: (mins: number) => void;
    onRunAiWithText: (text: string) => void;
    whisperApiKey?: string;
    aiFlexibilityLevel?: AiFlexibilityLevel;
    onFlexibilityChange?: (level: AiFlexibilityLevel) => void;
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
      {nowMainOpen}
      {nowQuickStartOpen}
      {nowShareOpen}
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
      {quickStartTitle}
      {quickStartText}
      {onQuickStartTitleInput}
      {onQuickStartTextInput}
      {onQuickStart}
      {onToggleNowMain}
      {onToggleNowQuickStart}
      {onToggleNowShare}
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
      {titleValue}
      {onTitleInput}
      {partsValue}
      {onPartsInput}
      {onPartsKeyDown}
      {partsFeedbackText}
      {onCopyPrompt}
      {copyBtnText}
      {hasAiKey}
      {aiPanelOpen}
      {planShareOpen}
      {onToggleAiPanel}
      {onTogglePlanShare}
      {aiInput}
      {onAiInputChange}
      {aiPromptMode}
      {aiLastResponse}
      {aiError}
      {aiQuestionText}
      {onRunAi}
      {aiLoading}
      {suggestedDuration}
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
      {onRunAiWithText}
      {whisperApiKey}
      {aiFlexibilityLevel}
      {onFlexibilityChange}
    />
  </div>
{/if}
