package com.example.PaymentProcessing.security;

import com.example.PaymentProcessing.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// Registered automatically by Spring Boot (any Filter bean is auto-mapped to
// /*). Everything under /api/onboarding/** stays public since that's the
// pre-login signup flow — every other /api/** endpoint requires a valid
// Bearer token, and the authenticated customerId is attached to the request
// for controllers to read via @RequestAttribute("customerId").
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/onboarding/")
                || "/api/admin/login".equals(path)
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            unauthorized(response, "Missing or invalid Authorization header");
            return;
        }
        boolean isAdminRoute = request.getRequestURI().startsWith("/api/admin/");
        try {
            String token = header.substring(7);
            if (isAdminRoute) {
                request.setAttribute("adminId", jwtService.validateAndGetAdminId(token));
            } else {
                request.setAttribute("customerId", jwtService.validateAndGetCustomerId(token));
            }
        } catch (Exception ex) {
            unauthorized(response, "Invalid or expired token");
            return;
        }
        chain.doFilter(request, response);
    }

    private void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"errorCode\":\"UNAUTHORIZED\",\"message\":\"" + message + "\"}");
    }
}