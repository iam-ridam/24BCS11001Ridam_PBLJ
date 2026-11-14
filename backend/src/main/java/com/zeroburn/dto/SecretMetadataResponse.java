package com.zeroburn.dto;

import java.time.Instant;
import java.util.UUID;

public class SecretMetadataResponse {

    private UUID secretId;
    private boolean exists;
    private boolean hasPassphrase;
    private int remainingViews;
    private Instant expiresAt;
    private String status; // "ACTIVE", "BURNED", "EXPIRED", "NOT_FOUND"
    private String message;

    public SecretMetadataResponse() {
    }

    public SecretMetadataResponse(UUID secretId, boolean exists, boolean hasPassphrase,
                                  int remainingViews, Instant expiresAt, String status, String message) {
        this.secretId = secretId;
        this.exists = exists;
        this.hasPassphrase = hasPassphrase;
        this.remainingViews = remainingViews;
        this.expiresAt = expiresAt;
        this.status = status;
        this.message = message;
    }

    public UUID getSecretId() {
        return secretId;
    }

    public void setSecretId(UUID secretId) {
        this.secretId = secretId;
    }

    public boolean isExists() {
        return exists;
    }

    public void setExists(boolean exists) {
        this.exists = exists;
    }

    public boolean isHasPassphrase() {
        return hasPassphrase;
    }

    public void setHasPassphrase(boolean hasPassphrase) {
        this.hasPassphrase = hasPassphrase;
    }

    public int getRemainingViews() {
        return remainingViews;
    }

    public void setRemainingViews(int remainingViews) {
        this.remainingViews = remainingViews;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
