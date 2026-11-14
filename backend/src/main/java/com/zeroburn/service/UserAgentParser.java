package com.zeroburn.service;

import org.springframework.stereotype.Component;

@Component
public class UserAgentParser {

    public String parseDeviceAndBrowser(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown Device / Client";
        }

        String ua = userAgent.trim();

        // Check for common link preview bots and crawlers first
        if (ua.contains("WhatsApp")) {
            return "WhatsApp Link Preview Bot";
        }
        if (ua.contains("Slackbot")) {
            return "Slack Link Preview Bot";
        }
        if (ua.contains("Discordbot")) {
            return "Discord Link Preview Bot";
        }
        if (ua.contains("TelegramBot")) {
            return "Telegram Link Preview Bot";
        }
        if (ua.contains("Twitterbot")) {
            return "X (Twitter) Link Preview Bot";
        }
        if (ua.contains("facebookexternalhit")) {
            return "Facebook Link Preview Bot";
        }
        if (ua.contains("curl") || ua.contains("PostmanRuntime") || ua.contains("python-requests") || ua.contains("Wget")) {
            return "CLI / API Client (" + ua.split("/")[0] + ")";
        }

        // Detect OS / Platform
        String os = "Unknown OS";
        if (ua.contains("iPhone")) {
            os = "iPhone (iOS)";
        } else if (ua.contains("iPad")) {
            os = "iPad (iPadOS)";
        } else if (ua.contains("Android")) {
            os = "Android Mobile";
        } else if (ua.contains("Windows NT 10.0")) {
            os = "Windows 10/11";
        } else if (ua.contains("Macintosh") || ua.contains("Mac OS X")) {
            os = "macOS";
        } else if (ua.contains("Linux") && !ua.contains("Android")) {
            os = "Linux (Desktop)";
        }

        // Detect Browser
        String browser = "Unknown Browser";
        if (ua.contains("Edg/")) {
            browser = "Microsoft Edge";
        } else if (ua.contains("Chrome/") && !ua.contains("Chromium") && !ua.contains("Edg/")) {
            browser = "Google Chrome";
        } else if (ua.contains("Firefox/")) {
            browser = "Mozilla Firefox";
        } else if (ua.contains("Safari/") && !ua.contains("Chrome/") && !ua.contains("Chromium")) {
            browser = "Apple Safari";
        } else if (ua.contains("Opera/") || ua.contains("OPR/")) {
            browser = "Opera";
        }

        return browser + " on " + os;
    }
}
