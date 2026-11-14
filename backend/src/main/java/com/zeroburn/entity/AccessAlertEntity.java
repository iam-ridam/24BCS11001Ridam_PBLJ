package com.zeroburn.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "access_alerts", indexes = {
    @Index(name = "idx_alerts_secret_id", columnList = "secretId"),
    @Index(name = "idx_alerts_creator_token", columnList = "creatorToken")
})
public class AccessAlertEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "secret_id", nullable = false)
    private UUID secretId;

    @Column(name = "creator_token", nullable = false, length = 128)
    private String creatorToken;

    @Column(name = "event_type", nullable = false, length = 32)
    private String eventType;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "device_info", length = 256)
    private String deviceInfo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public AccessAlertEntity() {
    }

    public AccessAlertEntity(UUID secretId, String creatorToken, String eventType,
                             String ipAddress, String userAgent, String deviceInfo, Instant createdAt) {
        this.secretId = secretId;
        this.creatorToken = creatorToken;
        this.eventType = eventType;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.deviceInfo = deviceInfo;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UUID getSecretId() {
        return secretId;
    }

    public void setSecretId(UUID secretId) {
        this.secretId = secretId;
    }

    public String getCreatorToken() {
        return creatorToken;
    }

    public void setCreatorToken(String creatorToken) {
        this.creatorToken = creatorToken;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
