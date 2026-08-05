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
}
