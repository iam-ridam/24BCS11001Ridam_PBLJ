package com.zeroburn.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateSecretRequest {

    @NotBlank(message = "Ciphertext is required")
    private String ciphertext;

    @NotBlank(message = "IV is required")
    @Size(max = 64, message = "IV max length is 64")
    private String iv;

    @Size(max = 64, message = "Salt max length is 64")
    private String salt;

    private boolean hasPassphrase;

    @Min(value = 1, message = "Max views must be at least 1")
    @Max(value = 100, message = "Max views cannot exceed 100")
    private int maxViews = 1;

    @Min(value = 1, message = "Expiry minutes must be at least 1")
    @Max(value = 10080, message = "Expiry minutes cannot exceed 7 days (10080 minutes)")
    private int expiryMinutes = 60;

    @NotBlank(message = "Creator token is required")
    @Size(max = 128, message = "Creator token max length is 128")
    private String creatorToken;

    public CreateSecretRequest() {
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

    public int getExpiryMinutes() {
        return expiryMinutes;
    }

    public void setExpiryMinutes(int expiryMinutes) {
        this.expiryMinutes = expiryMinutes;
    }

    public String getCreatorToken() {
        return creatorToken;
    }

    public void setCreatorToken(String creatorToken) {
        this.creatorToken = creatorToken;
    }
}
