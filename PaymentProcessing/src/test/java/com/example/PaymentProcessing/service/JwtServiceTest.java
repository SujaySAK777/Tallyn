package com.example.PaymentProcessing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

    private JwtService service;

    @BeforeEach
    void setUp() {
        service = new JwtService();
        // secret/expirationMinutes are populated via @Value in production; there's no
        // constructor injection, so a plain unit test has to set them via reflection.
        ReflectionTestUtils.setField(service, "secret", "dev-only-change-this-secret-key-before-deploying-32bytes+");
        ReflectionTestUtils.setField(service, "expirationMinutes", 60L);
    }

    @Test
    void shouldRoundTripCustomerIdThroughToken() {
        String token = service.generateToken(42L, "jane@example.com");
        Long customerId = service.validateAndGetCustomerId(token);
        assertEquals(42L, customerId);
    }

    @Test
    void shouldRejectExpiredToken() {
        ReflectionTestUtils.setField(service, "expirationMinutes", -5L);
        String token = service.generateToken(1L, "jane@example.com");

        assertThrows(ExpiredJwtException.class, () -> service.validateAndGetCustomerId(token));
    }

    @Test
    void shouldRejectTokenSignedWithDifferentSecret() {
        String token = service.generateToken(1L, "jane@example.com");

        JwtService otherService = new JwtService();
        ReflectionTestUtils.setField(otherService, "secret", "a-completely-different-secret-key-32bytes-long!!");
        ReflectionTestUtils.setField(otherService, "expirationMinutes", 60L);

        assertThrows(JwtException.class, () -> otherService.validateAndGetCustomerId(token));
    }

    @Test
    void shouldRejectMalformedToken() {
        assertThrows(JwtException.class, () -> service.validateAndGetCustomerId("not-a-real-token"));
    }

    @Test
    void shouldRoundTripAdminIdThroughAdminToken() {
        String token = service.generateAdminToken(7L, "admin@tallyn.com");
        Long adminId = service.validateAndGetAdminId(token);
        assertEquals(7L, adminId);
    }

    @Test
    void shouldRejectAdminTokenOnCustomerValidation() {
        // Subject ids overlap between the customer and admin tables, so this must be
        // rejected by claim type - not just "any signed token with a numeric subject".
        String adminToken = service.generateAdminToken(1L, "admin@tallyn.com");
        assertThrows(JwtException.class, () -> service.validateAndGetCustomerId(adminToken));
    }

    @Test
    void shouldRejectCustomerTokenOnAdminValidation() {
        String customerToken = service.generateToken(1L, "jane@example.com");
        assertThrows(JwtException.class, () -> service.validateAndGetAdminId(customerToken));
    }
}
