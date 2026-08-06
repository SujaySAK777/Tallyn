package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.RefundRequestResponse;
import com.example.PaymentProcessing.model.RefundRequestStatus;
import com.example.PaymentProcessing.service.AdminService;
import com.example.PaymentProcessing.service.RefundRequestService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final RefundRequestService refundRequestService;

    public AdminController(AdminService adminService, RefundRequestService refundRequestService) {
        this.adminService = adminService;
        this.refundRequestService = refundRequestService;
    }

    // Public - exempted in JwtAuthFilter, same pattern as /api/onboarding/login.
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        return adminService.login(body.get("email"), body.get("password"));
    }

    @GetMapping("/refund-requests")
    public List<RefundRequestResponse> listRefundRequests(@RequestParam(required = false) RefundRequestStatus status) {
        return refundRequestService.listForAdmin(status);
    }

    @PostMapping("/refund-requests/{requestId}/approve")
    public RefundRequestResponse approve(@PathVariable Long requestId, @RequestAttribute("adminId") Long adminId) {
        return refundRequestService.approve(requestId, adminId);
    }

    @PostMapping("/refund-requests/{requestId}/reject")
    public RefundRequestResponse reject(
            @PathVariable Long requestId,
            @RequestAttribute("adminId") Long adminId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body == null ? null : body.get("reason");
        return refundRequestService.reject(requestId, adminId, reason);
    }
}
