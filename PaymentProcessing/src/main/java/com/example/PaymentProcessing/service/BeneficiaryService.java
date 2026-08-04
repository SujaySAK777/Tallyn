package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.api.BeneficiaryResponse;
import com.example.PaymentProcessing.api.CreateBeneficiaryRequest;
import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.Beneficiary;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.BeneficiaryRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final AccountRepository accountRepository;

    public BeneficiaryService(BeneficiaryRepository beneficiaryRepository, AccountRepository accountRepository) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.accountRepository = accountRepository;
    }

    public List<BeneficiaryResponse> list(Long customerId, String search) {
        List<Beneficiary> beneficiaries = beneficiaryRepository.findByCustomerIdOrderByAccountHolderNameAsc(customerId);
        String query = search == null ? "" : search.trim().toLowerCase();
        return beneficiaries.stream()
                .filter(beneficiary -> query.isEmpty()
                        || beneficiary.getAccountHolderName().toLowerCase().contains(query)
                        || beneficiary.getAccountNumber().toLowerCase().contains(query)
                        || beneficiary.getBankName().toLowerCase().contains(query)
                        || (beneficiary.getNickname() != null && beneficiary.getNickname().toLowerCase().contains(query)))
                .map(BeneficiaryResponse::fromEntity)
                .toList();
    }

    @Transactional
    public BeneficiaryResponse create(CreateBeneficiaryRequest request, Long customerId) {
        if (request == null || request.getAccountNumber() == null || request.getAccountNumber().isBlank()) {
            throw new ApiException("VALIDATION_FAILED", "accountNumber is required", HttpStatus.BAD_REQUEST);
        }

        String accountNumber = request.getAccountNumber().trim();
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND", "Recipient account was not found.", HttpStatus.NOT_FOUND));

        if (Objects.equals(account.getCustomerId(), customerId)) {
            throw new ApiException("VALIDATION_FAILED", "You cannot save your own account as a beneficiary.", HttpStatus.BAD_REQUEST);
        }

        if (beneficiaryRepository.existsByCustomerIdAndAccountNumber(customerId, accountNumber)) {
            throw new ApiException("DUPLICATE_BENEFICIARY", "This beneficiary is already saved.", HttpStatus.CONFLICT);
        }

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setCustomerId(customerId);
        beneficiary.setAccountNumber(account.getAccountNumber());
        beneficiary.setAccountHolderName(account.getAccountHolderName());
        beneficiary.setBankName(account.getBankName());
        beneficiary.setIfscCode(account.getIfscCode());
        beneficiary.setNickname(request.getNickname() == null || request.getNickname().isBlank()
                ? null
                : request.getNickname().trim());

        return BeneficiaryResponse.fromEntity(beneficiaryRepository.save(beneficiary));
    }

    @Transactional
    public void delete(Long beneficiaryId, Long customerId) {
        Beneficiary beneficiary = beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() -> new ApiException("BENEFICIARY_NOT_FOUND", "Beneficiary not found", HttpStatus.NOT_FOUND));

        if (!Objects.equals(beneficiary.getCustomerId(), customerId)) {
            throw new ApiException("FORBIDDEN", "You do not have access to this beneficiary.", HttpStatus.FORBIDDEN);
        }

        beneficiaryRepository.delete(beneficiary);
    }
}
