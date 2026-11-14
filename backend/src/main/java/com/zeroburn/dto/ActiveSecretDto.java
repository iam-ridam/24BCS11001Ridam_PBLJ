package com.zeroburn.dto;

import java.time.Instant;
import java.util.UUID;

public class ActiveSecretDto {

    private UUID secretId;
    private int maxViews;
    private int remainingViews;
    private boolean hasPassphrase;
    private Instant createdAt;
    private Instant expiresAt;
    private long remainingSeconds;
    private boolean isExpired;

    public ActiveSecretDto() {
    }

    public ActiveSecretDto(UUID secretId, int maxViews, int remainingViews, boolean hasPassphrase,
                           Instant createdAt, Instant expiresAt, long remainingSeconds, boolean isExpired) {
        this.secretId = secretId;
        this.maxViews = maxViews;
        this.remainingViews = remainingViews;
        this.hasPassphrase = hasPassphrase;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.remainingSeconds = remainingSeconds;
        this.isExpired = isExpired;
    }

    public UUID getSecretId() {
        return secretId;
    }

    public void setSecretId(UUID secretId) {
        this.secretId = secretId;
    }

    public int getMaxViews() {
        return maxViews;
    }

    public void setMaxViews(int maxViews) {
        this.maxViews = maxViews;
    }

    public int getRemainingViews() {
        return remainingViews;
    }

    public void setRemainingViews(int remainingViews) {
        this.remainingViews = remainingViews;
    }

    public boolean isHasPassphrase() {
        return hasPassphrase;
    }

    public void setHasPassphrase(boolean hasPassphrase) {
        this.hasPassphrase = hasPassphrase;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public long getRemainingSeconds() {
        return remainingSeconds;
    }

    public void setRemainingSeconds(long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }

    public boolean isExpired() {
        return isExpired;
    }

    public void setExpired(boolean expired) {
        isExpired = expired;
    }
}
