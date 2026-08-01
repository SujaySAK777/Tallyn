package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.service.OnboardingService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/onboarding")
public class OnboardingController {
    private final OnboardingService service;
    public OnboardingController(OnboardingService service) { this.service = service; }
    @PostMapping("/signup") public Map<String,Object> signup(@RequestBody Map<String,String> body) { return service.signup(body); }
    @PutMapping("/{customerId}/profile") public Map<String,Object> profile(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.profile(customerId, body); }
    @PostMapping("/{customerId}/link-account") public Map<String,Object> link(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.linkAccount(customerId, body); }
    @PostMapping("/{customerId}/verify") public Map<String,Object> verify(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.verify(customerId, body); }
    @PostMapping("/{customerId}/set-tpin") public Map<String,Object> tpin(@PathVariable Long customerId, @RequestBody Map<String,String> body) { return service.setTpin(customerId, body); }
    @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,String> body) { return service.login(body); }
}
