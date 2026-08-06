package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Admin;
import com.example.PaymentProcessing.repository.AdminRepository;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final AdminRepository adminRepository;
    private final JwtService jwtService;

    public AdminService(AdminRepository adminRepository, JwtService jwtService) {
        this.adminRepository = adminRepository;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> login(String email, String password) {
        Admin admin = adminRepository.findByEmail(email == null ? null : email.toLowerCase())
                .orElseThrow(() -> new ApiException("INVALID_LOGIN", "Invalid email or password", HttpStatus.UNAUTHORIZED));

        if (password == null || !PASSWORD_ENCODER.matches(password, admin.getPasswordHash())) {
            throw new ApiException("INVALID_LOGIN", "Invalid email or password", HttpStatus.UNAUTHORIZED);
        }

        Map<String, Object> out = new HashMap<>();
        out.put("adminId", admin.getAdminId());
        out.put("email", admin.getEmail());
        out.put("name", admin.getName());
        out.put("token", jwtService.generateAdminToken(admin.getAdminId(), admin.getEmail()));
        return out;
    }
}
