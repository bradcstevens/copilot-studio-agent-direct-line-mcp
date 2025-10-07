/**
 * TypeScript interfaces for Direct Line 3.0 API
 * Based on Bot Framework Direct Line API specification
 */

/**
 * Direct Line token response
 */
export interface DirectLineToken {
  conversationId?: string;
  token: string;
  expires_in: number;
}

/**
 * Conversation response
 */
export interface Conversation {
  conversationId: string;
  token: string;
  expires_in: number;
  streamUrl?: string;
  referenceGrammarId?: string;
}

/**
 * Channel account (user or bot)
 */
export interface ChannelAccount {
  id: string;
  name?: string;
  role?: 'user' | 'bot';
}

/**
 * Attachment type
 */
export interface Attachment {
  contentType: string;
  contentUrl?: string;
  content?: unknown;
  name?: string;
  thumbnailUrl?: string;
}

/**
 * Suggested actions
 */
export interface SuggestedActions {
  actions: CardAction[];
  to?: string[];
}

/**
 * Card action
 */
export interface CardAction {
  type: 'imBack' | 'postBack' | 'openUrl' | 'playAudio' | 'playVideo' | 'showImage' | 'downloadFile' | 'signin' | 'call' | 'payment' | 'messageBack';
  title?: string;
  value?: unknown;
  text?: string;
  displayText?: string;
  image?: string;
}

/**
 * Activity type
 */
export type ActivityType =
  | 'message'
  | 'contactRelationUpdate'
  | 'conversationUpdate'
  | 'typing'
  | 'endOfConversation'
  | 'event'
  | 'invoke'
  | 'deleteUserData'
  | 'messageUpdate'
  | 'messageDelete'
  | 'installationUpdate'
  | 'messageReaction'
  | 'suggestion'
  | 'trace'
  | 'handoff';

/**
 * Activity (message or event)
 */
export interface Activity {
  type: ActivityType;
  id?: string;
  timestamp?: string;
  localTimestamp?: string;
  localTimezone?: string;
  serviceUrl?: string;
  channelId?: string;
  from: ChannelAccount;
  conversation?: {
    id: string;
    name?: string;
    conversationType?: string;
    isGroup?: boolean;
  };
  recipient?: ChannelAccount;
  textFormat?: 'plain' | 'markdown' | 'xml';
  attachmentLayout?: 'list' | 'carousel';
  membersAdded?: ChannelAccount[];
  membersRemoved?: ChannelAccount[];
  topicName?: string;
  historyDisclosed?: boolean;
  locale?: string;
  text?: string;
  speak?: string;
  inputHint?: 'acceptingInput' | 'ignoringInput' | 'expectingInput';
  summary?: string;
  suggestedActions?: SuggestedActions;
  attachments?: Attachment[];
  entities?: unknown[];
  channelData?: unknown;
  action?: string;
  replyToId?: string;
  label?: string;
  valueType?: string;
  value?: unknown;
  name?: string;
  relatesTo?: unknown;
  code?: string;
  expiration?: string;
  importance?: 'low' | 'normal' | 'high';
  deliveryMode?: 'normal' | 'notification';
  listenFor?: string[];
  textHighlights?: unknown[];
  semanticAction?: unknown;
}

/**
 * Activity set (collection of activities)
 */
export interface ActivitySet {
  activities: Activity[];
  watermark: string;
}

/**
 * Error response from Direct Line API
 */
export interface DirectLineError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Options for sending activities
 */
export interface SendActivityOptions {
  conversationId: string;
  activity: Partial<Activity>;
}

/**
 * Options for getting activities
 */
export interface GetActivitiesOptions {
  conversationId: string;
  watermark?: string;
}

/**
 * Type guard for error responses
 */
export function isDirectLineError(response: unknown): response is DirectLineError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as DirectLineError).error === 'object' &&
    'code' in (response as DirectLineError).error &&
    'message' in (response as DirectLineError).error
  );
}
