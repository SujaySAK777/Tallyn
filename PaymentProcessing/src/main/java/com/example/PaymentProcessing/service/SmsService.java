package com.example.PaymentProcessing.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:}")
    private String fromNumber;

    @Value("${twilio.default-country-code:+91}")
    private String defaultCountryCode;

    @PostConstruct
    public void init() {
        if (!accountSid.isBlank() && !authToken.isBlank()) {
            Twilio.init(accountSid, authToken);
        }
    }

    // Sends the OTP as a real SMS via Twilio. Returns true only if Twilio
    // actually accepted the send. If credentials aren't set, or Twilio itself
    // rejects it (e.g. trial accounts restricted to predefined DLT templates
    // for Indian numbers), this logs the code and returns false instead of
    // throwing — so onboarding still works even when real delivery can't happen.
    public boolean sendOtp(String phoneNumber, String otp) {
        if (accountSid.isBlank() || authToken.isBlank() || fromNumber.isBlank()) {
            System.out.println("[SmsService] Twilio not configured; OTP for " + phoneNumber + " is " + otp);
            return false;
        }
        String to = phoneNumber.startsWith("+") ? phoneNumber : defaultCountryCode + phoneNumber;
        try {
            Message.creator(
                    new PhoneNumber(to),
                    new PhoneNumber(fromNumber),
                    "Your Tallyn verification code is " + otp + ". It expires in 10 minutes."
            ).create();
            return true;
        } catch (Exception ex) {
            System.out.println("[SmsService] Failed to send OTP to " + phoneNumber + " (" + ex.getMessage() + "); OTP is " + otp);
            return false;
        }
    }
}