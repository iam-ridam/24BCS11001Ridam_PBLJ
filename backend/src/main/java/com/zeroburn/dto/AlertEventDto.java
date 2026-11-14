package com.zeroburn.dto;

import java.time.Instant;
import java.util.UUID;

public class AlertEventDto {

    private Long id;
    private UUID secretId;
    private String eventType; // "CREATED", "CONSUMED", "INTRUSION_ATTEMPT", "EXPIRED"
    private String ipAddress;
    private String userAgent;
    private String deviceInfo;
    private Instant createdAt;
    private String message;

    public AlertEventDto() {
    }

    public AlertEventDto(Long id, UUID secretId, String eventType, String ipAddress,
                         String userAgent, String deviceInfo, Instant createdAt, String message) {
        this.id = id;
        this.secretId = secretId;
        this.eventType = eventType;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.deviceInfo = deviceInfo;
        this.createdAt = createdAt;
        this.message = message;
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
