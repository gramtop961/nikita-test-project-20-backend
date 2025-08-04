"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSlackConfigured = exports.slackClient = void 0;
const web_api_1 = require("@slack/web-api");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.slackClient = new web_api_1.WebClient(process.env.SLACK_BOT_TOKEN);
const isSlackConfigured = () => {
    return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET);
};
exports.isSlackConfigured = isSlackConfigured;
