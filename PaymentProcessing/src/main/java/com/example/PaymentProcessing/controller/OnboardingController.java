package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.service.OnboardingService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/onboarding")
public class OnboardingController {
    private final OnboardingService service;
    public OnboardingController(OnboardingService service) { this.service = service; }
    @PostMapping("/send-email-otp") public Map<String,Object> sendEmailOtp(@RequestBody Map<String,String> body) { return service.sendEmailOtp(body); }
    @PostMapping("/verify-email-otp") public Map<String,Object> verifyEmailOtp(@RequestBody Map<String,String> body) { return service.verifyEmailOtp(body); }
    @PostMapping("/signup") public Map<String,Object> signup(@RequestBody Map<String,String> body) { return service.signup(body); }
    @PutMapping("/{customerId}/profile") public Map<String,Object> profile(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.profile(customerId, body); }
    @PostMapping("/{customerId}/link-account") public Map<String,Object> link(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.linkAccount(customerId, body); }
    @PostMapping("/{customerId}/verify") public Map<String,Object> verify(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.verify(customerId, body); }
    @PostMapping("/{customerId}/complete") public Map<String,Object> complete(@PathVariable Long customerId) { return service.completeWithoutAccount(customerId); }
    @PostMapping("/{customerId}/set-tpin") public Map<String,Object> tpin(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.setTpin(customerId, body); }
    @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,String> body) { return service.login(body); }
    @PostMapping("/forgot-password") public Map<String,Object> forgotPassword(@RequestBody Map<String,String> body) { return service.forgotPassword(body); }
    @PostMapping("/reset-password") public Map<String,Object> resetPassword(@RequestBody Map<String,String> body) { return service.resetPassword(body); }
}
