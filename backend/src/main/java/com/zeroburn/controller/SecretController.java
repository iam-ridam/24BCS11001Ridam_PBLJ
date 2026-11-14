package com.zeroburn.controller;

import com.zeroburn.dto.*;
import com.zeroburn.service.SecretService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/secrets")
public class SecretController {

    private final SecretService secretService;

    public SecretController(SecretService secretService) {
        this.secretService = secretService;
    }

    @PostMapping
    public ResponseEntity<CreateSecretResponse> createSecret(@Valid @RequestBody CreateSecretRequest request,
                                                             HttpServletRequest httpRequest) {
        CreateSecretResponse response = secretService.createSecret(request, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Non-destructive metadata check. Safe for messaging link preview scrapers (WhatsApp, Slack, Discord).
     */
    @GetMapping("/{secretId}/meta")
    public ResponseEntity<SecretMetadataResponse> getSecretMetadata(@PathVariable UUID secretId,
                                                                    HttpServletRequest httpRequest) {
        SecretMetadataResponse meta = secretService.getSecretMetadata(secretId, httpRequest);
        return ResponseEntity.ok(meta);
    }

    /**
     * Two-step reveal trigger: Atomically burns the secret and returns encrypted payload for client decryption.
     */
    @PostMapping("/{secretId}/consume")
    public ResponseEntity<SecretConsumeResponse> consumeSecret(@PathVariable UUID secretId,
                                                               HttpServletRequest httpRequest) {
        SecretConsumeResponse response = secretService.consumeSecret(secretId, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve active secrets created in the current creator session.
     */
    @GetMapping("/active")
    public ResponseEntity<List<ActiveSecretDto>> getActiveSecrets(@RequestParam String creatorToken) {
        List<ActiveSecretDto> secrets = secretService.getActiveSecrets(creatorToken);
        return ResponseEntity.ok(secrets);
    }

    /**
     * Security Integrity Audit: Simulates database tampering by flipping 1 character of ciphertext in PostgreSQL.
     * Verifies AES-256-GCM authentication tag failure during client decryption.
     */
    @PostMapping("/{secretId}/simulate-tamper")
    public ResponseEntity<Map<String, String>> simulateCiphertextTamper(@PathVariable UUID secretId) {
        secretService.simulateCiphertextTamper(secretId);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Ciphertext tampered in database! AES-GCM tag verification will now fail on reveal."
        ));
    }

    /**
     * Live database verification endpoint: Returns actual row count in PostgreSQL table.
     * Allows client verification that the row was destroyed (returns 0).
     */
    @GetMapping("/{secretId}/row-count")
    public ResponseEntity<Map<String, Object>> getLiveRowCount(@PathVariable UUID secretId) {
        long count = secretService.getLiveRowCount(secretId);
        return ResponseEntity.ok(Map.of(
                "secretId", secretId,
                "rowCount", count,
                "status", count > 0 ? "EXISTS_IN_DATABASE" : "PERMANENTLY_DELETED"
        ));
    }
}
