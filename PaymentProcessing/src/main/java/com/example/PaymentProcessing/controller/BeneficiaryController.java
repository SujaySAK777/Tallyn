package com.example.PaymentProcessing.controller;

import com.example.PaymentProcessing.api.BeneficiaryResponse;
import com.example.PaymentProcessing.api.CreateBeneficiaryRequest;
import com.example.PaymentProcessing.service.BeneficiaryService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/beneficiaries")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    @GetMapping
    public List<BeneficiaryResponse> list(@RequestAttribute("customerId") Long customerId,
            @RequestParam(value = "search", required = false) String search) {
        return beneficiaryService.list(customerId, search);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BeneficiaryResponse create(@RequestBody CreateBeneficiaryRequest request,
            @RequestAttribute("customerId") Long customerId) {
        return beneficiaryService.create(request, customerId);
    }

    @DeleteMapping("/{beneficiaryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long beneficiaryId, @RequestAttribute("customerId") Long customerId) {
        beneficiaryService.delete(beneficiaryId, customerId);
    }
}
