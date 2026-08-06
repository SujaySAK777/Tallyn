package com.example.PaymentProcessing.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-minutes:60}")
    private long expirationMinutes;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(Long customerId, String email) {
        return buildToken(customerId, email, "CUSTOMER");
    }

    public String generateAdminToken(Long adminId, String email) {
        return buildToken(adminId, email, "ADMIN");
    }

    private String buildToken(Long subjectId, String email, String type) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMinutes * 60 * 1000);
        return Jwts.builder()
                .subject(String.valueOf(subjectId))
                .claim("email", email)
                .claim("type", type)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key())
                .compact();
    }

    // Rejects admin tokens here so an admin credential can never be replayed as a
    // customerId on customer-facing endpoints (subject ids overlap between the two tables).
    public Long validateAndGetCustomerId(String token) {
        Claims claims = parse(token);
        if (!"CUSTOMER".equals(claims.get("type"))) {
            throw new io.jsonwebtoken.JwtException("Not a customer token");
        }
        return Long.valueOf(claims.getSubject());
    }

    public Long validateAndGetAdminId(String token) {
        Claims claims = parse(token);
        if (!"ADMIN".equals(claims.get("type"))) {
            throw new io.jsonwebtoken.JwtException("Not an admin token");
        }
        return Long.valueOf(claims.getSubject());
    }

    private Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}