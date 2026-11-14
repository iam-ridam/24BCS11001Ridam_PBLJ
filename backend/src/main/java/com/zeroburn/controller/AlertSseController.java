package com.zeroburn.controller;

import com.zeroburn.dto.AlertEventDto;
import com.zeroburn.service.SecretService;
import com.zeroburn.service.SseAlertService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertSseController {

    private final SseAlertService sseAlertService;
    private final SecretService secretService;

    public AlertSseController(SseAlertService sseAlertService, SecretService secretService) {
        this.sseAlertService = sseAlertService;
        this.secretService = secretService;
    }

    /**
     * Server-Sent Events (SSE) endpoint: Subscribes creator's dashboard to real-time events and intrusion alerts.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAlerts(@RequestParam String creatorToken) {
        return sseAlertService.subscribe(creatorToken);
    }

    /**
     * Retrieve recent alert logs for the creator console.
     */
    @GetMapping("/history")
    public ResponseEntity<List<AlertEventDto>> getAlertHistory(@RequestParam String creatorToken) {
        List<AlertEventDto> history = secretService.getAlertHistory(creatorToken);
        return ResponseEntity.ok(history);
    }
}
