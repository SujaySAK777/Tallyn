package com.example.PaymentProcessing.service;

import com.example.PaymentProcessing.exception.ApiException;
import com.example.PaymentProcessing.model.Account;
import com.example.PaymentProcessing.model.AccountStatus;
import com.example.PaymentProcessing.model.Customer;
import com.example.PaymentProcessing.repository.AccountRepository;
import com.example.PaymentProcessing.repository.CustomerRepository;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OnboardingService {
    private final CustomerRepository customers;
    private final AccountRepository accounts;
    private final AccountService accountService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SmsService smsService;
    private final JwtService jwtService;
    private final Map<Long, OtpEntry> otpStore = new HashMap<>();
    public OnboardingService(CustomerRepository customers, AccountRepository accounts, AccountService accountService, SmsService smsService, JwtService jwtService) { this.customers=customers; this.accounts=accounts; this.accountService=accountService; this.smsService=smsService; this.jwtService=jwtService; }
    private static class OtpEntry { final String code; final LocalDateTime expiresAt; OtpEntry(String code, LocalDateTime expiresAt) { this.code = code; this.expiresAt = expiresAt; } }
    private String maskPhone(String phone) { return phone == null || phone.length() < 2 ? "••••••" : "•••••" + phone.substring(phone.length() - 2); }
    private Customer customer(Long id) { return customers.findById(id).orElseThrow(() -> new ApiException("CUSTOMER_NOT_FOUND", "Customer not found", HttpStatus.NOT_FOUND)); }
    private String required(Map<String,String> body, String key) { String value=body.get(key); if(value==null || value.isBlank()) throw new ApiException("VALIDATION_FAILED", key+" is required", HttpStatus.BAD_REQUEST); return value.trim(); }
    private Map<String,Object> response(Customer c) { Map<String,Object> out=new HashMap<>(); out.put("customerId",c.getCustomerId()); out.put("email",c.getEmail()); out.put("firstName",c.getFirstName()); out.put("status",c.getOnboardingStatus()); return out; }
    @Transactional public Map<String,Object> signup(Map<String,String> body) {
        String email=required(body,"email").toLowerCase(); String password=required(body,"password");
        if(password.length()<8 || !password.matches(".*[A-Z].*") || !password.matches(".*[a-z].*") || !password.matches(".*[0-9].*") || !password.matches(".*[^A-Za-z0-9].*"))
            throw new ApiException("WEAK_PASSWORD", "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character", HttpStatus.BAD_REQUEST);
        if(customers.findByEmail(email).isPresent()) throw new ApiException("EMAIL_EXISTS", "An account already exists for this email", HttpStatus.CONFLICT);
        Customer c=new Customer(); c.setEmail(email); c.setPasswordHash(encoder.encode(password)); c.setOnboardingStatus("SIGNED_UP"); customers.save(c); return response(c);
    }
    
    @Transactional public Map<String,Object> profile(Long id, Map<String,String> body) {
        Customer c = customer(id);
        String phone = required(body, "phoneNumber");
        if (!phone.matches("\\d{10}")) throw new ApiException("VALIDATION_FAILED", "phoneNumber must be a valid 10-digit mobile number", HttpStatus.BAD_REQUEST);
        customers.findByPhoneNumber(phone).ifPresent(existing -> {
            if (!existing.getCustomerId().equals(id)) {
                throw new ApiException("PHONE_ALREADY_USED", "This phone number is already registered with another account", HttpStatus.CONFLICT);
            }
        });
        c.setFirstName(required(body,"firstName")); c.setLastName(required(body,"lastName")); c.setPhoneNumber(phone); c.setOnboardingStatus("PROFILE_COMPLETE"); return response(c);
    }

    @Transactional public Map<String,Object> linkAccount(Long id, Map<String,String> body) {
        Customer c = customer(id);
        if (accounts.findFirstByCustomerId(id).isPresent()) {
            throw new ApiException("ACCOUNT_ALREADY_LINKED", "An account is already linked to this customer", HttpStatus.CONFLICT);
        }
        String bankName = required(body, "bankName");
        String holderName = ((c.getFirstName() == null ? "" : c.getFirstName()) + " " + (c.getLastName() == null ? "" : c.getLastName())).trim();

        // This is a payment gateway, not a bank: the customer already has an
        // existing account. We simulate fetching its IFSC, account number,
        // and pre-existing balance instead of asking them to type in a fake one.
        Account a = accountService.provisionSimulatedAccount(bankName, holderName.isBlank() ? null : holderName, "INR", id, c.getPhoneNumber());

        c.setOnboardingStatus("ACCOUNT_LINKED");
        String otp = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1000000));
        otpStore.put(id, new OtpEntry(otp, LocalDateTime.now().plusMinutes(10)));
        boolean smsSent = smsService.sendOtp(c.getPhoneNumber(), otp);
        Map<String,Object> out = response(c);
        out.put("phoneHint", maskPhone(c.getPhoneNumber()));
        if (!smsSent) {
            out.put("developmentOtp", otp);
        }
        out.put("bankName", a.getBankName());

        out.put("accountNumber", a.getAccountNumber());
        out.put("ifscCode", a.getIfscCode());
        out.put("balance", a.getBalance());
        return out;
    }
    @Transactional public Map<String,Object> verify(Long id, Map<String,String> body) {
        Customer c = customer(id);
        OtpEntry entry = otpStore.get(id);
        if (entry == null || LocalDateTime.now().isAfter(entry.expiresAt)) {
            throw new ApiException("OTP_EXPIRED", "Verification code has expired, please request a new one", HttpStatus.UNAUTHORIZED);
        }
        if (!required(body, "otp").equals(entry.code)) {
            throw new ApiException("INVALID_OTP", "Invalid verification code", HttpStatus.UNAUTHORIZED);
        }
        c.setEmailVerifiedAt(LocalDateTime.now());
        c.setOnboardingStatus("VERIFIED");
        otpStore.remove(id);
        return response(c);
    }
    @Transactional public Map<String,Object> completeWithoutAccount(Long id) { Customer c=customer(id); c.setOnboardingStatus("ACTIVE"); return response(c); }
    @Transactional public Map<String,Object> setTpin(Long id, Map<String,String> body) { String tpin=required(body,"tpin"); if(!tpin.matches("\\d{6}")) throw new ApiException("INVALID_TPIN", "TPIN must be 6 digits", HttpStatus.BAD_REQUEST); Customer c=customer(id); Account a=accounts.findFirstByCustomerId(id).orElseThrow(() -> new ApiException("ACCOUNT_NOT_FOUND","Link an account first",HttpStatus.BAD_REQUEST)); a.setTpinHash(encoder.encode(tpin)); a.setStatus(AccountStatus.ACTIVE); c.setOnboardingStatus("ACTIVE"); Map<String,Object> out=response(c); out.put("accountId",a.getAccountId()); return out; }
    @Transactional(readOnly=true) public Map<String,Object> login(Map<String,String> body) { Customer c=customers.findByEmail(required(body,"email").toLowerCase()).orElseThrow(() -> new ApiException("INVALID_LOGIN","Invalid email or password",HttpStatus.UNAUTHORIZED)); if(!encoder.matches(required(body,"password"),c.getPasswordHash()) || !"ACTIVE".equals(c.getOnboardingStatus())) throw new ApiException("INVALID_LOGIN","Invalid email or password",HttpStatus.UNAUTHORIZED); Map<String,Object> out=response(c); out.put("token", jwtService.generateToken(c.getCustomerId(), c.getEmail())); accounts.findFirstByCustomerId(c.getCustomerId()).ifPresent(a->{out.put("accountId",a.getAccountId());out.put("accountNumber",a.getAccountNumber());out.put("bankName",a.getBankName());}); return out; }
}
