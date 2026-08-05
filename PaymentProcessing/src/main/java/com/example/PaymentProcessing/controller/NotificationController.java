package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.NotificationResponse;
import com.example.PaymentProcessing.service.NotificationService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> list(@RequestAttribute("customerId") Long customerId) {
        return notificationService.list(customerId);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@RequestAttribute("customerId") Long customerId) {
        return Map.of("count", notificationService.unreadCount(customerId));
    }

    @PutMapping("/{notificationId}/read")
    public void markRead(@PathVariable Long notificationId, @RequestAttribute("customerId") Long customerId) {
        notificationService.markRead(notificationId, customerId);
    }

    @PutMapping("/read-all")
    public void markAllRead(@RequestAttribute("customerId") Long customerId) {
        notificationService.markAllRead(customerId);
    }
}
