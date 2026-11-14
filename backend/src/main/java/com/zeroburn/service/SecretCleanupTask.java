package com.zeroburn.service;

import com.zeroburn.dto.AlertEventDto;
import com.zeroburn.entity.AccessAlertEntity;
import com.zeroburn.entity.SecretEntity;
import com.zeroburn.repository.AccessAlertRepository;
import com.zeroburn.repository.SecretRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class SecretCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(SecretCleanupTask.class);

    private final SecretRepository secretRepository;
    private final AccessAlertRepository accessAlertRepository;
    private final SseAlertService sseAlertService;

    public SecretCleanupTask(SecretRepository secretRepository,
                             AccessAlertRepository accessAlertRepository,
                             SseAlertService sseAlertService) {
        this.secretRepository = secretRepository;
        this.accessAlertRepository = accessAlertRepository;
        this.sseAlertService = sseAlertService;
    }

    /**
     * Runs every 30 seconds to clean up unconsumed secrets that have reached their expiration time.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void cleanupExpiredSecrets() {
        Instant now = Instant.now();
        List<SecretEntity> expired = secretRepository.findExpiredSecrets(now);

        if (expired.isEmpty()) {
            return;
        }

        log.info("Running scheduled cleanup: found {} expired secret(s) to purge", expired.size());

        for (SecretEntity s : expired) {
            AccessAlertEntity alert = new AccessAlertEntity(
                    s.getId(),
                    s.getCreatorToken(),
                    "EXPIRED",
                    "127.0.0.1",
                    "System Daemon",
                    "Scheduled Cleanup Task",
                    now
            );
            accessAlertRepository.save(alert);

            AlertEventDto eventDto = new AlertEventDto(
                    alert.getId(),
                    s.getId(),
                    "EXPIRED",
                    "127.0.0.1",
                    "System Daemon",
                    "Scheduled Cleanup Task",
                    now,
                    "Secret expired without being viewed and was purged from database."
            );
            sseAlertService.broadcastToCreator(s.getCreatorToken(), eventDto);

            secretRepository.delete(s);
        }
    }
}
