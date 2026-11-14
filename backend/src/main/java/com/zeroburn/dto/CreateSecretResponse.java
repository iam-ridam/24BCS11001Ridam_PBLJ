package com.zeroburn.dto;

import java.time.Instant;
import java.util.UUID;

public class CreateSecretResponse {

    private UUID secretId;
    private Instant expiresAt;
    private int maxViews;
    private boolean hasPassphrase;

    public CreateSecretResponse() {
    }

    public CreateSecretResponse(UUID secretId, Instant expiresAt, int maxViews, boolean hasPassphrase) {
        this.secretId = secretId;
        this.expiresAt = expiresAt;
        this.maxViews = maxViews;
        this.hasPassphrase = hasPassphrase;
    }

    public UUID getSecretId() {
        return secretId;
    }

    public void setSecretId(UUID secretId) {
        this.secretId = secretId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public int getMaxViews() {
        return maxViews;
    }

    public void setMaxViews(int maxViews) {
        this.maxViews = maxViews;
    }

    public boolean isHasPassphrase() {
        return hasPassphrase;
    }

    public void setHasPassphrase(boolean hasPassphrase) {
        this.hasPassphrase = hasPassphrase;
    }
}
