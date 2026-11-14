package com.zeroburn.service;

import com.zeroburn.dto.AlertEventDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseAlertService {

    private static final Logger log = LoggerFactory.getLogger(SseAlertService.class);
    private static final Long EMITTER_TIMEOUT = 30 * 60 * 1000L; // 30 minutes

    private final Map<String, List<SseEmitter>> creatorEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String creatorToken) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);

        creatorEmitters.computeIfAbsent(creatorToken, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(creatorToken, emitter));
        emitter.onTimeout(() -> {
            log.debug("SSE timeout for creatorToken: {}", creatorToken);
            removeEmitter(creatorToken, emitter);
        });
        emitter.onError(e -> {
            log.debug("SSE error for creatorToken {}: {}", creatorToken, e.getMessage());
            removeEmitter(creatorToken, emitter);
        });

        // Send initial connection acknowledgement event
        try {
            AlertEventDto initEvent = new AlertEventDto(
                    0L,
                    null,
                    "CONNECTED",
                    "127.0.0.1",
                    "SSE Stream",
                    "Console Listener",
                    Instant.now(),
                    "Real-time intrusion detection stream connected."
            );
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .id(String.valueOf(System.currentTimeMillis()))
                    .data(initEvent));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE event: {}", e.getMessage());
            removeEmitter(creatorToken, emitter);
        }

        return emitter;
    }

    public void broadcastToCreator(String creatorToken, AlertEventDto event) {
        List<SseEmitter> emitters = creatorEmitters.get(creatorToken);
        if (emitters == null || emitters.isEmpty()) {
            log.debug("No active SSE listeners for creatorToken: {}", creatorToken);
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(event.getEventType())
                        .id(String.valueOf(event.getId() != null ? event.getId() : System.currentTimeMillis()))
                        .data(event));
            } catch (IOException e) {
                log.warn("Error delivering SSE to client, removing dead emitter: {}", e.getMessage());
                removeEmitter(creatorToken, emitter);
            }
        }
    }

    private void removeEmitter(String creatorToken, SseEmitter emitter) {
        List<SseEmitter> emitters = creatorEmitters.get(creatorToken);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                creatorEmitters.remove(creatorToken);
            }
        }
    }

    /**
     * Heartbeat ping every 15 seconds to keep SSE connections open over Wi-Fi/proxies.
     */
    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        creatorEmitters.forEach((creatorToken, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (IOException e) {
                    removeEmitter(creatorToken, emitter);
                }
            }
        });
    }
}
