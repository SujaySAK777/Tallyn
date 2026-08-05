package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.NotificationResponse;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Notification;
import com.example.PaymentProcessing.model.NotificationType;
import com.example.PaymentProcessing.repository.NotificationRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void create(Long customerId, NotificationType type, String title, String message) {
        if (customerId == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setCustomerId(customerId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    public List<NotificationResponse> list(Long customerId) {
        return notificationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(NotificationResponse::fromEntity)
                .toList();
    }

    public long unreadCount(Long customerId) {
        return notificationRepository.countByCustomerIdAndReadFalse(customerId);
    }

    @Transactional
    public void markRead(Long notificationId, Long customerId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ApiException("NOTIFICATION_NOT_FOUND", "Notification not found", HttpStatus.NOT_FOUND));

        if (!Objects.equals(notification.getCustomerId(), customerId)) {
            throw new ApiException("FORBIDDEN", "You do not have access to this notification.", HttpStatus.FORBIDDEN);
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead(Long customerId) {
        List<Notification> notifications = notificationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        notifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(notifications);
    }
}
