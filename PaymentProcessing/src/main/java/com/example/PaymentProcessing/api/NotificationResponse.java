package com.example.PaymentProcessing.api;

import com.example.PaymentProcessing.model.Notification;
import java.time.LocalDateTime;

public class NotificationResponse {
    private Long notificationId;
    private String type;
    private String title;
    private String message;
    private boolean read;
    private LocalDateTime createdAt;

    public static NotificationResponse fromEntity(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.notificationId = notification.getNotificationId();
        response.type = notification.getType() == null ? null : notification.getType().name();
        response.title = notification.getTitle();
        response.message = notification.getMessage();
        response.read = notification.isRead();
        response.createdAt = notification.getCreatedAt();
        return response;
    }

    public Long getNotificationId() { return notificationId; }
    public void setNotificationId(Long notificationId) { this.notificationId = notificationId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
