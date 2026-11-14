package com.zeroburn.service;

import com.zeroburn.dto.*;
import com.zeroburn.entity.AccessAlertEntity;
import com.zeroburn.entity.SecretEntity;
import com.zeroburn.repository.AccessAlertRepository;
import com.zeroburn.repository.SecretRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SecretService {

    private static final Logger log = LoggerFactory.getLogger(SecretService.class);

    private final SecretRepository secretRepository;
    private final AccessAlertRepository accessAlertRepository;
    private final SseAlertService sseAlertService;
    private final UserAgentParser userAgentParser;

    @PersistenceContext
    private EntityManager entityManager;

    public SecretService(SecretRepository secretRepository,
                         AccessAlertRepository accessAlertRepository,
                         SseAlertService sseAlertService,
                         UserAgentParser userAgentParser) {
        this.secretRepository = secretRepository;
        this.accessAlertRepository = accessAlertRepository;
        this.sseAlertService = sseAlertService;
        this.userAgentParser = userAgentParser;
    }

    @Transactional
    public CreateSecretResponse createSecret(CreateSecretRequest request, HttpServletRequest httpRequest) {
        UUID secretId = UUID.randomUUID();
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofMinutes(request.getExpiryMinutes()));

        SecretEntity entity = new SecretEntity(
                secretId,
                request.getCiphertext(),
                request.getIv(),
                request.getSalt(),
                request.isHasPassphrase(),
                request.getMaxViews(),
                request.getMaxViews(), // initial remaining_views = max_views
                request.getCreatorToken(),
                now,
                expiresAt
        );

        secretRepository.save(entity);

        String ip = extractClientIp(httpRequest);
        String rawUa = httpRequest.getHeader("User-Agent");
        String deviceInfo = userAgentParser.parseDeviceAndBrowser(rawUa);

        AccessAlertEntity alert = new AccessAlertEntity(
                secretId,
                request.getCreatorToken(),
                "CREATED",
                ip,
                rawUa,
                deviceInfo,
                now
        );
        accessAlertRepository.save(alert);

        AlertEventDto eventDto = new AlertEventDto(
                alert.getId(),
                secretId,
                "CREATED",
                ip,
                rawUa,
                deviceInfo,
                now,
                "Secret created (Protected with AES-256-GCM, " + request.getMaxViews() + " max view"
                        + (request.getMaxViews() > 1 ? "s" : "") + ")"
        );
        sseAlertService.broadcastToCreator(request.getCreatorToken(), eventDto);

        log.info("Secret created: id={}, views={}, expiresAt={}", secretId, request.getMaxViews(), expiresAt);
        return new CreateSecretResponse(secretId, expiresAt, request.getMaxViews(), request.isHasPassphrase());
    }

    @Transactional
    public SecretMetadataResponse getSecretMetadata(UUID secretId, HttpServletRequest httpRequest) {
        Instant now = Instant.now();
        Optional<SecretEntity> secretOpt = secretRepository.findById(secretId);

        if (secretOpt.isPresent()) {
            SecretEntity secret = secretOpt.get();
            if (secret.getExpiresAt().isBefore(now)) {
                return handleExpiredSecretMetadata(secretId, secret.getCreatorToken());
            }

            return new SecretMetadataResponse(
                    secretId,
                    true,
                    secret.isHasPassphrase(),
                    secret.getRemainingViews(),
                    secret.getExpiresAt(),
                    "ACTIVE",
                    "Secret is active and ready to be revealed."
            );
        }

        // Secret does not exist in secrets table.
        // Check if it was already consumed to detect intrusion!
        return checkIntrusionOnMetadata(secretId, httpRequest);
    }

    @Transactional
    public SecretConsumeResponse consumeSecret(UUID secretId, HttpServletRequest httpRequest) {
        Instant now = Instant.now();
        String ip = extractClientIp(httpRequest);
        String rawUa = httpRequest.getHeader("User-Agent");
        String deviceInfo = userAgentParser.parseDeviceAndBrowser(rawUa);

        // First check if the secret exists to determine view strategy
        Optional<SecretEntity> checkOpt = secretRepository.findById(secretId);
        if (checkOpt.isEmpty()) {
            handleIntrusionOrMissing(secretId, ip, rawUa, deviceInfo);
        }

        SecretEntity existing = checkOpt.get();
        if (existing.getExpiresAt().isBefore(now)) {
            secretRepository.delete(existing);
            recordAlert(secretId, existing.getCreatorToken(), "EXPIRED", ip, rawUa, deviceInfo,
                    "Attempted to view expired secret");
            throw new ResponseStatusException(HttpStatus.GONE, "Secret has expired and was purged.");
        }

        if (existing.getRemainingViews() <= 1) {
            // SINGLE VIEW SECRET: Atomic native DELETE ... RETURNING *
            return executeAtomicSingleViewConsume(secretId, existing, ip, rawUa, deviceInfo, now);
        } else {
            // MULTI VIEW SECRET: Pessimistic Lock SELECT ... FOR UPDATE
            return executePessimisticMultiViewConsume(secretId, ip, rawUa, deviceInfo, now);
        }
    }

    @SuppressWarnings("unchecked")
    private SecretConsumeResponse executeAtomicSingleViewConsume(UUID secretId, SecretEntity cached,
                                                                 String ip, String rawUa, String deviceInfo, Instant now) {
        SecretEntity deletedEntity = null;
        try {
            Query nativeQuery = entityManager.createNativeQuery(
                    "DELETE FROM secrets WHERE id = :id AND remaining_views = 1 AND expires_at > :now RETURNING *",
                    SecretEntity.class
            );
            nativeQuery.setParameter("id", secretId);
            nativeQuery.setParameter("now", now);

            List<SecretEntity> results = nativeQuery.getResultList();
            if (!results.isEmpty()) {
                deletedEntity = results.get(0);
            }
        } catch (Exception e) {
            log.warn("Native DELETE RETURNING failed or not supported by DB dialect, falling back to JPA delete: {}", e.getMessage());
            // Safe fallback for H2 or dialects that don't support RETURNING with entities
            Optional<SecretEntity> locked = secretRepository.findByIdForUpdate(secretId);
            if (locked.isPresent() && locked.get().getRemainingViews() == 1) {
                deletedEntity = locked.get();
                secretRepository.delete(deletedEntity);
            }
        }

        if (deletedEntity == null) {
            // Raced or already deleted by a concurrent request
            handleIntrusionOrMissing(secretId, ip, rawUa, deviceInfo);
        }

        // Secret was atomically destroyed!
        recordAlert(secretId, deletedEntity.getCreatorToken(), "CONSUMED", ip, rawUa, deviceInfo,
                "Secret burned & revealed by " + deviceInfo + " (" + ip + "). 0 copies remain in database.");

        log.info("Secret atomically consumed and deleted from DB: id={}", secretId);

        return new SecretConsumeResponse(
                secretId,
                deletedEntity.getCiphertext(),
                deletedEntity.getIv(),
                deletedEntity.getSalt(),
                deletedEntity.isHasPassphrase(),
                0
        );
    }

    private SecretConsumeResponse executePessimisticMultiViewConsume(UUID secretId, String ip,
                                                                    String rawUa, String deviceInfo, Instant now) {
        SecretEntity secret = secretRepository.findByIdForUpdate(secretId)
                .orElseThrow(() -> {
                    handleIntrusionOrMissing(secretId, ip, rawUa, deviceInfo);
                    return new ResponseStatusException(HttpStatus.GONE, "Secret already consumed");
                });

        if (secret.getExpiresAt().isBefore(now)) {
            secretRepository.delete(secret);
            recordAlert(secretId, secret.getCreatorToken(), "EXPIRED", ip, rawUa, deviceInfo, "Secret expired");
            throw new ResponseStatusException(HttpStatus.GONE, "Secret has expired.");
        }

        int newRemaining = secret.getRemainingViews() - 1;
        secret.setRemainingViews(newRemaining);

        if (newRemaining <= 0) {
            secretRepository.delete(secret);
            recordAlert(secretId, secret.getCreatorToken(), "CONSUMED", ip, rawUa, deviceInfo,
                    "Final view consumed by " + deviceInfo + " (" + ip + "). Row permanently deleted from DB.");
        } else {
            secretRepository.save(secret);
            recordAlert(secretId, secret.getCreatorToken(), "VIEWED", ip, rawUa, deviceInfo,
                    "Secret revealed (" + newRemaining + " view" + (newRemaining > 1 ? "s" : "") + " remaining)");
        }

        return new SecretConsumeResponse(
                secretId,
                secret.getCiphertext(),
                secret.getIv(),
                secret.getSalt(),
                secret.isHasPassphrase(),
                newRemaining
        );
    }

    private SecretMetadataResponse checkIntrusionOnMetadata(UUID secretId, HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        String rawUa = httpRequest.getHeader("User-Agent");
        String deviceInfo = userAgentParser.parseDeviceAndBrowser(rawUa);

        // Check if an alert exists for this secretId
        Optional<AccessAlertEntity> alertOpt = accessAlertRepository.findFirstBySecretIdAndEventType(secretId, "CONSUMED");

        if (alertOpt.isPresent()) {
            String creatorToken = alertOpt.get().getCreatorToken();

            // Record Intrusion Attempt!
            recordAlert(secretId, creatorToken, "INTRUSION_ATTEMPT", ip, rawUa, deviceInfo,
                    "UNAUTHORIZED RE-ACCESS BLOCKED: " + deviceInfo + " (" + ip + ") tried to open burned secret!");

            log.warn("INTRUSION DETECTED for secretId={}: IP={}, Device={}", secretId, ip, deviceInfo);

            return new SecretMetadataResponse(
                    secretId,
                    false,
                    false,
                    0,
                    null,
                    "BURNED",
                    "This secret has already been consumed and permanently destroyed. Intrusion alert broadcast to creator."
            );
        }

        return new SecretMetadataResponse(
                secretId,
                false,
                false,
                0,
                null,
                "NOT_FOUND",
                "Secret does not exist or has expired."
        );
    }

    private void handleIntrusionOrMissing(UUID secretId, String ip, String rawUa, String deviceInfo) {
        Optional<AccessAlertEntity> alertOpt = accessAlertRepository.findFirstBySecretIdAndEventType(secretId, "CONSUMED");
        if (alertOpt.isPresent()) {
            String creatorToken = alertOpt.get().getCreatorToken();
            recordAlert(secretId, creatorToken, "INTRUSION_ATTEMPT", ip, rawUa, deviceInfo,
                    "UNAUTHORIZED RE-ACCESS BLOCKED: " + deviceInfo + " (" + ip + ") attempted to consume burned secret!");

            throw new ResponseStatusException(HttpStatus.GONE,
                    "UNAUTHORIZED ACCESS BLOCKED: This secret was already destroyed. An intrusion alert was logged.");
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Secret not found or expired.");
    }

    private SecretMetadataResponse handleExpiredSecretMetadata(UUID secretId, String creatorToken) {
        return new SecretMetadataResponse(
                secretId,
                false,
                false,
                0,
                null,
                "EXPIRED",
                "This secret expired before it was consumed."
        );
    }

    private void recordAlert(UUID secretId, String creatorToken, String eventType,
                             String ip, String rawUa, String deviceInfo, String message) {
        AccessAlertEntity alert = new AccessAlertEntity(
                secretId,
                creatorToken,
                eventType,
                ip,
                rawUa,
                deviceInfo,
                Instant.now()
        );
        accessAlertRepository.save(alert);

        AlertEventDto eventDto = new AlertEventDto(
                alert.getId(),
                secretId,
                eventType,
                ip,
                rawUa,
                deviceInfo,
                alert.getCreatedAt(),
                message
        );
        sseAlertService.broadcastToCreator(creatorToken, eventDto);
    }

    @Transactional
    public void simulateCiphertextTamper(UUID secretId) {
        SecretEntity secret = secretRepository.findById(secretId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Secret not found for tamper test"));

        String ct = secret.getCiphertext();
        if (ct.length() > 5) {
            // Flip the 4th character
            char flipped = (ct.charAt(4) == 'A') ? 'B' : 'A';
            String tampered = ct.substring(0, 4) + flipped + ct.substring(5);
            secret.setCiphertext(tampered);
            secretRepository.save(secret);
            log.info("Simulated tamper test: Flipped character in ciphertext for secretId={}", secretId);
        }
    }

    @Transactional(readOnly = true)
    public List<ActiveSecretDto> getActiveSecrets(String creatorToken) {
        Instant now = Instant.now();
        List<SecretEntity> list = secretRepository.findByCreatorTokenOrderByCreatedAtDesc(creatorToken);
        return list.stream().map(s -> {
            long remainingSeconds = Math.max(0, Duration.between(now, s.getExpiresAt()).getSeconds());
            boolean isExpired = s.getExpiresAt().isBefore(now);
            return new ActiveSecretDto(
                    s.getId(),
                    s.getMaxViews(),
                    s.getRemainingViews(),
                    s.isHasPassphrase(),
                    s.getCreatedAt(),
                    s.getExpiresAt(),
                    remainingSeconds,
                    isExpired
            );
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AlertEventDto> getAlertHistory(String creatorToken) {
        return accessAlertRepository.findByCreatorTokenOrderByCreatedAtDesc(creatorToken)
                .stream()
                .map(a -> new AlertEventDto(
                        a.getId(),
                        a.getSecretId(),
                        a.getEventType(),
                        a.getIpAddress(),
                        a.getUserAgent(),
                        a.getDeviceInfo(),
                        a.getCreatedAt(),
                        formatAlertMessage(a)
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getLiveRowCount(UUID secretId) {
        return secretRepository.countById(secretId);
    }

    private String formatAlertMessage(AccessAlertEntity a) {
        return switch (a.getEventType()) {
            case "CREATED" -> "Secret created (" + a.getSecretId().toString().substring(0, 8) + "...)";
            case "CONSUMED" -> "Secret burned by " + a.getDeviceInfo() + " (" + a.getIpAddress() + ")";
            case "VIEWED" -> "Secret viewed by " + a.getDeviceInfo() + " (" + a.getIpAddress() + ")";
            case "INTRUSION_ATTEMPT" -> "⚠️ INTRUSION BLOCKED from " + a.getDeviceInfo() + " (" + a.getIpAddress() + ")";
            case "EXPIRED" -> "Secret expired and auto-purged";
            default -> "Alert: " + a.getEventType();
        };
    }

    public String extractClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
