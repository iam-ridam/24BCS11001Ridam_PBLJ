package com.zeroburn.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "secrets", indexes = {
    @Index(name = "idx_secrets_creator_token", columnList = "creatorToken"),
    @Index(name = "idx_secrets_expires_at", columnList = "expiresAt")
})
public class SecretEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ciphertext", nullable = false, columnDefinition = "TEXT")
    private String ciphertext;

    @Column(name = "iv", nullable = false, length = 64)
    private String iv;

    @Column(name = "salt", length = 64)
    private String salt;

    @Column(name = "has_passphrase", nullable = false)
    private boolean hasPassphrase;

    @Column(name = "max_views", nullable = false)
    private int maxViews;

    @Column(name = "remaining_views", nullable = false)
    private int remainingViews;

    @Column(name = "creator_token", nullable = false, length = 128)
    private String creatorToken;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public SecretEntity() {
    }

    public SecretEntity(UUID id, String ciphertext, String iv, String salt, boolean hasPassphrase,
                        int maxViews, int remainingViews, String creatorToken,
                        Instant createdAt, Instant expiresAt) {
        this.id = id;
        this.ciphertext = ciphertext;
        this.iv = iv;
        this.salt = salt;
        this.hasPassphrase = hasPassphrase;
        this.maxViews = maxViews;
        this.remainingViews = remainingViews;
        this.creatorToken = creatorToken;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCiphertext() {
        return ciphertext;
    }

    public void setCiphertext(String ciphertext) {
        this.ciphertext = ciphertext;
    }

    public String getIv() {
        return iv;
    }

    public void setIv(String iv) {
        this.iv = iv;
    }

    public String getSalt() {
        return salt;
    }

    public void setSalt(String salt) {
        this.salt = salt;
    }

    public boolean isHasPassphrase() {
        return hasPassphrase;
    }

    public void setHasPassphrase(boolean hasPassphrase) {
        this.hasPassphrase = hasPassphrase;
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

    public String getCreatorToken() {
        return creatorToken;
    }

    public void setCreatorToken(String creatorToken) {
        this.creatorToken = creatorToken;
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
}
