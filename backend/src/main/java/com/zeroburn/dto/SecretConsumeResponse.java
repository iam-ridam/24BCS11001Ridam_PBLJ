package com.zeroburn.dto;

import java.util.UUID;

public class SecretConsumeResponse {

    private UUID secretId;
    private String ciphertext;
    private String iv;
    private String salt;
    private boolean hasPassphrase;
    private int remainingViews;

    public SecretConsumeResponse() {
    }

    public SecretConsumeResponse(UUID secretId, String ciphertext, String iv, String salt,
                                 boolean hasPassphrase, int remainingViews) {
        this.secretId = secretId;
        this.ciphertext = ciphertext;
        this.iv = iv;
        this.salt = salt;
        this.hasPassphrase = hasPassphrase;
        this.remainingViews = remainingViews;
    }

    public UUID getSecretId() {
        return secretId;
    }

    public void setSecretId(UUID secretId) {
        this.secretId = secretId;
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

    public int getRemainingViews() {
        return remainingViews;
    }

    public void setRemainingViews(int remainingViews) {
        this.remainingViews = remainingViews;
    }
}
