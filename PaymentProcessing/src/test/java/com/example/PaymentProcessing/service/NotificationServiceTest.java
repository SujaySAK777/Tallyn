package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.PaymentProcessing.api.NotificationResponse;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Notification;
import com.example.PaymentProcessing.model.NotificationType;
import com.example.PaymentProcessing.repository.NotificationRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class NotificationServiceTest {

    @Test
    void shouldSaveNotificationForCustomer() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);

        service.create(7L, NotificationType.MONEY_DEBITED, "Money debited", "Rs. 100 sent to Jane");

        var captor = org.mockito.ArgumentCaptor.forClass(Notification.class);
        verify(repository).save(captor.capture());
        Notification saved = captor.getValue();
        assertEquals(7L, saved.getCustomerId());
        assertEquals(NotificationType.MONEY_DEBITED, saved.getType());
        assertEquals("Money debited", saved.getTitle());
        assertEquals("Rs. 100 sent to Jane", saved.getMessage());
        assertFalse(saved.isRead());
    }

    @Test
    void shouldSkipSavingWhenCustomerIdIsNull() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);

        service.create(null, NotificationType.PAYMENT_FAILED, "Payment failed", "Something went wrong");

        verify(repository, never()).save(any(Notification.class));
    }

    @Test
    void shouldListNotificationsForCustomer() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);

        Notification notification = new Notification();
        notification.setNotificationId(1L);
        notification.setCustomerId(5L);
        notification.setType(NotificationType.MONEY_CREDITED);
        notification.setTitle("Money credited");
        notification.setMessage("Rs. 50 received");
        notification.setRead(false);

        when(repository.findByCustomerIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(notification));

        List<NotificationResponse> result = service.list(5L);

        assertEquals(1, result.size());
        assertEquals("Money credited", result.get(0).getTitle());
        assertFalse(result.get(0).isRead());
    }

    @Test
    void shouldReturnUnreadCountFromRepository() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);
        when(repository.countByCustomerIdAndReadFalse(3L)).thenReturn(4L);

        assertEquals(4L, service.unreadCount(3L));
    }

    @Test
    void shouldMarkNotificationReadForOwningCustomer() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);

        Notification notification = new Notification();
        notification.setNotificationId(9L);
        notification.setCustomerId(2L);
        notification.setRead(false);

        when(repository.findById(9L)).thenReturn(Optional.of(notification));
        when(repository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.markRead(9L, 2L);

        assertTrue(notification.isRead());
        verify(repository).save(notification);
    }

    @Test
    void shouldRejectMarkingReadForAnotherCustomersNotification() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);

        Notification notification = new Notification();
        notification.setNotificationId(9L);
        notification.setCustomerId(2L);
        notification.setRead(false);

        when(repository.findById(9L)).thenReturn(Optional.of(notification));

        ApiException ex = assertThrows(ApiException.class, () -> service.markRead(9L, 999L));
        assertEquals("FORBIDDEN", ex.getErrorCode());
        verify(repository, never()).save(any(Notification.class));
    }

    @Test
    void shouldThrowWhenMarkingMissingNotificationRead() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);

        when(repository.findById(123L)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> service.markRead(123L, 1L));
        assertEquals("NOTIFICATION_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void shouldMarkAllNotificationsReadForCustomer() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository);

        Notification first = new Notification();
        first.setCustomerId(4L);
        first.setRead(false);
        Notification second = new Notification();
        second.setCustomerId(4L);
        second.setRead(false);

        when(repository.findByCustomerIdOrderByCreatedAtDesc(4L)).thenReturn(List.of(first, second));

        service.markAllRead(4L);

        assertTrue(first.isRead());
        assertTrue(second.isRead());
        verify(repository).saveAll(List.of(first, second));
    }
}
