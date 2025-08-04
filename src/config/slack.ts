import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

dotenv.config();

export const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
}

export const isSlackConfigured = (): boolean => {
  return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET);
};