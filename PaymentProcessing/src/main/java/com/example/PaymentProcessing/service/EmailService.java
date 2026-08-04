package com.example.PaymentProcessing.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean sendOtp(String toEmail, String otp, String purpose) {
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Mail sender not configured (GMAIL_USERNAME/GMAIL_APP_PASSWORD missing); OTP for {} not sent: {}", toEmail, otp);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject("Tallyn verification code");
            message.setText("Your Tallyn verification code for " + purpose + " is: " + otp
                + "\n\nThis code expires shortly. If you did not request this, you can ignore this email.");
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send OTP email to {}", toEmail, ex);
            return false;
        }
    }
}
