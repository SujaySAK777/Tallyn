package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.model.Customer;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.CustomerRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OnboardingService {
    private final CustomerRepository customers;
    private final AccountRepository accounts;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final Map<Long, String> developmentOtps = new HashMap<>();
    public OnboardingService(CustomerRepository customers, AccountRepository accounts) { this.customers=customers; this.accounts=accounts; }
    private Customer customer(Long id) { return customers.findById(id).orElseThrow(() -> new ApiException("CUSTOMER_NOT_FOUND", "Customer not found", HttpStatus.NOT_FOUND)); }
    private String required(Map<String,String> body, String key) { String value=body.get(key); if(value==null || value.isBlank()) throw new ApiException("VALIDATION_FAILED", key+" is required", HttpStatus.BAD_REQUEST); return value.trim(); }
    private Map<String,Object> response(Customer c) { Map<String,Object> out=new HashMap<>(); out.put("customerId",c.getCustomerId()); out.put("email",c.getEmail()); out.put("firstName",c.getFirstName()); out.put("status",c.getOnboardingStatus()); return out; }
    @Transactional public Map<String,Object> signup(Map<String,String> body) {
        String email=required(body,"email").toLowerCase(); String password=required(body,"password");
        if(password.length()<8
                || !password.matches(".*[A-Z].*")
                || !password.matches(".*[a-z].*")
                || !password.matches(".*\\d.*")
                || !password.matches(".*[^A-Za-z0-9].*"))
            throw new ApiException("WEAK_PASSWORD","Password must be 8+ characters with uppercase, lowercase, number and special character",HttpStatus.BAD_REQUEST);
        if(customers.findByEmail(email).isPresent()) throw new ApiException("EMAIL_EXISTS", "An account already exists for this email", HttpStatus.CONFLICT);
        Customer c=new Customer(); c.setEmail(email); c.setPasswordHash(encoder.encode(password)); c.setOnboardingStatus("SIGNED_UP"); customers.save(c); return response(c);
    }
    @Transactional public Map<String,Object> profile(Long id, Map<String,String> body) { Customer c=customer(id); c.setFirstName(required(body,"firstName")); c.setLastName(required(body,"lastName")); c.setPhoneNumber(required(body,"phoneNumber")); c.setOnboardingStatus("PROFILE_COMPLETE"); return response(c); }
    @Transactional public Map<String,Object> linkAccount(Long id, Map<String,String> body) {
        Customer c=customer(id); String number=required(body,"accountNumber");
        Account a=accounts.findByAccountNumber(number).orElseGet(Account::new);
        if (a.getAccountId() != null && a.getCustomerId() != null && !id.equals(a.getCustomerId())) {
            throw new ApiException("ACCOUNT_ALREADY_LINKED", "This account is already linked to another customer", HttpStatus.CONFLICT);
        }
        if (a.getAccountId() == null) {
            a.setBankName(required(body,"bankName")); a.setAccountNumber(number); a.setAccountHolderName(required(body,"accountHolderName"));
            a.setBalance(new BigDecimal(body.getOrDefault("balance","0"))); a.setCurrency("INR"); a.setStatus(AccountStatus.INACTIVE);
            String ifsc = body.get("ifsc_code"); if (ifsc != null && !ifsc.isBlank()) a.setIfscCode(ifsc.trim());
            // Satisfies legacy NOT NULL schema without exposing a usable TPIN before verification.
            a.setTpinHash(encoder.encode(String.valueOf(ThreadLocalRandom.current().nextInt(100000,1000000))));
        }
        a.setCustomerId(id); accounts.save(a); c.setOnboardingStatus("ACCOUNT_LINKED"); String otp=String.valueOf(ThreadLocalRandom.current().nextInt(100000,1000000)); developmentOtps.put(id,otp); Map<String,Object> out=response(c); out.put("developmentOtp",otp); out.put("message","Verification code generated for local development"); return out;
    }
    @Transactional public Map<String,Object> verify(Long id, Map<String,String> body) { Customer c=customer(id); if(!required(body,"otp").equals(developmentOtps.get(id))) throw new ApiException("INVALID_OTP", "Invalid verification code", HttpStatus.UNAUTHORIZED); c.setEmailVerifiedAt(LocalDateTime.now()); c.setOnboardingStatus("VERIFIED"); developmentOtps.remove(id); return response(c); }
    @Transactional public Map<String,Object> setTpin(Long id, Map<String,String> body) { String tpin=required(body,"tpin"); if(!tpin.matches("\\d{6}")) throw new ApiException("INVALID_TPIN", "TPIN must be 6 digits", HttpStatus.BAD_REQUEST); Customer c=customer(id); Account a=accounts.findFirstByCustomerId(id).orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND","Link an account first",HttpStatus.BAD_REQUEST)); a.setTpinHash(encoder.encode(tpin)); a.setStatus(AccountStatus.ACTIVE); c.setOnboardingStatus("ACTIVE"); Map<String,Object> out=response(c); out.put("accountId",a.getAccountId()); return out; }
    @Transactional public Map<String,Object> complete(Long id) { Customer c=customer(id); c.setOnboardingStatus("ACTIVE"); customers.save(c); return response(c); }
    @Transactional(readOnly=true) public Map<String,Object> login(Map<String,String> body) { Customer c=customers.findByEmail(required(body,"email").toLowerCase()).orElseThrow(() -> new ApiException("INVALID_LOGIN","Invalid email or password",HttpStatus.UNAUTHORIZED)); if(!encoder.matches(required(body,"password"),c.getPasswordHash()) || !"ACTIVE".equals(c.getOnboardingStatus())) throw new ApiException("INVALID_LOGIN","Invalid email or password",HttpStatus.UNAUTHORIZED); return response(c); }
}
